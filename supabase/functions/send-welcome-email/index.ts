import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "../_shared/handler.ts";
import { BATCH, MAX_ATTEMPTS, drainWelcomeOutbox, type DrainDeps, type SendResult } from "./drain.ts";

/**
 * Drains public.email_outbox (WP-P5-03): the profile trigger enqueues one
 * welcome per member; pg_cron calls this every 10 minutes when a row is due.
 *
 * A webhook, not a public endpoint (WP-P0-04, health-status-06): only a
 * caller holding CRON_SECRET (header X-Webhook-Secret, or as Bearer) gets
 * past the handler, i.e. the database's cron job (pg_net with the Vault
 * cron_secret, as the hourly send-newsletter-course job does) or an operator.
 * verify_jwt stays false in supabase/config.toml: the secret is the gate, and
 * the database sends no JWT. There is no per-IP rate limit, which would only
 * throttle the database's own calls. No client calls this function, and no
 * response carries an email address or a name: only counts.
 *
 * The old trigger (20260130214743) called this per member through pg_net
 * with app.settings that were never set, so no welcome was ever sent. The
 * drain sends at most one welcome per member (UNIQUE (user_id, kind), the
 * claim, and Resend's Idempotency-Key welcome/<user_id>), only while the
 * member is still subscribed, never to a reserved domain (the QA accounts),
 * with backoff and a coded last_error. drain.ts holds the logic and
 * content.ts the email.
 */

const SITE_URL = "https://tarotlife.app";
// The newsletter's sender and reply-to (send-newsletter-course). This email
// was sent from an address on arcana.app, a domain that is not ours, so
// Resend could never verify it and refused the send (p10). The reply-to
// matters here: the unsubscribe page asks a reader it cannot match to reply.
const FROM_EMAIL = Deno.env.get("NEWSLETTER_FROM_EMAIL") || "Arcana <onboarding@resend.dev>";
const REPLY_TO = Deno.env.get("NEWSLETTER_REPLY_TO") || "lawrence.ma000@gmail.com";

/** Resend's error `name` (e.g. validation_error), and only that: its message can quote an address. */
function errorName(body: unknown): string | undefined {
  const name = (body as { name?: unknown } | null)?.name;
  return typeof name === "string" && /^[a-z_]{1,64}$/.test(name) ? name : undefined;
}

Deno.serve(
  handler<unknown>({
    fn: "send-welcome-email",
    auth: "webhook",
    webhookSecretEnv: "CRON_SECRET",
    run: async (ctx) => {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) {
        ctx.log.warn("send_welcome_email.resend_key_missing", {});
        return { ok: true, skipped: true, reason: "resend_key_missing" };
      }

      const db = ctx.supabase;
      const deps: DrainDeps = {
        now: () => new Date(),

        listDue: async (limit) => {
          const { data, error } = await db
            .from("email_outbox")
            .select("id, user_id, attempts")
            .is("sent_at", null)
            .lt("attempts", MAX_ATTEMPTS)
            .lte("next_attempt_at", new Date().toISOString())
            .order("created_at")
            .limit(limit);
          if (error) {
            ctx.log.error("send_welcome_email.list_failed", { code: error.code });
            throw error;
          }
          return data ?? [];
        },

        claim: async (row) => {
          const { data, error } = await db
            .from("email_outbox")
            .update({ attempts: row.attempts + 1 })
            .eq("id", row.id)
            .eq("attempts", row.attempts)
            .is("sent_at", null)
            .select("id");
          if (error) {
            ctx.log.warn("send_welcome_email.claim_failed", { outboxId: row.id, code: error.code });
            return false;
          }
          return (data ?? []).length === 1;
        },

        loadMember: async (userId) => {
          const { data: profile } = await db
            .from("profiles")
            .select("display_name, subscribed_to_newsletter, email")
            .eq("id", userId)
            .maybeSingle();
          if (!profile) return null;
          const { data: auth } = await db.auth.admin.getUserById(userId);
          return {
            email: auth?.user?.email || profile.email || null,
            displayName: profile.display_name ?? "",
            subscribed: profile.subscribed_to_newsletter === true,
          };
        },

        tokenFor: async (userId) => {
          const { error: upsertErr } = await db
            .from("newsletter_profile_tokens")
            .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
          if (upsertErr) throw upsertErr;
          const { data, error } = await db
            .from("newsletter_profile_tokens")
            .select("token")
            .eq("user_id", userId)
            .single();
          if (error || !data?.token) throw error ?? new Error("newsletter_profile_tokens: no token");
          return data.token as string;
        },

        send: async (m): Promise<SendResult> => {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                "Idempotency-Key": m.idempotencyKey,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [m.to],
                reply_to: REPLY_TO,
                subject: m.subject,
                html: m.html,
                text: m.text,
                headers: m.headers,
              }),
              signal: AbortSignal.timeout(15_000),
            });
            const body = await res.json().catch(() => null);
            if (res.ok) {
              const id = (body as { id?: unknown } | null)?.id;
              return { ok: true, id: typeof id === "string" ? id : "" };
            }
            return { ok: false, status: res.status, name: errorName(body) };
          } catch {
            return { ok: false, status: 0 };
          }
        },

        markSent: async (id, providerId) => {
          await db
            .from("email_outbox")
            .update({ sent_at: new Date().toISOString(), provider_id: providerId, last_error: null })
            .eq("id", id);
        },

        markFailed: async (id, error, o) => {
          await db
            .from("email_outbox")
            .update({
              last_error: error,
              next_attempt_at: o.nextAttemptAt,
              ...(o.terminal ? { attempts: MAX_ATTEMPTS } : {}),
            })
            .eq("id", id);
        },
      };

      const r = await drainWelcomeOutbox(deps, { siteUrl: SITE_URL });
      ctx.log.info("send_welcome_email.drained", { ...r, batch: BATCH });

      const systemic = r.sent === 0 && r.failed > 0;
      return { ok: !systemic, ...(systemic ? { code: "WELCOME_SEND_FAILED" } : {}), ...r };
    },
  }),
);
