/**
 * The welcome outbox drain (WP-P5-03). Pure: every read, write and send is an
 * injected dependency, so the vitest goldens run it with fakes and index.ts
 * wires it to Supabase and Resend.
 *
 * For each due row of public.email_outbox: claim it (attempts + 1, so two
 * runs never send the same row), check the member is still subscribed and has
 * a deliverable address, send once with Idempotency-Key welcome/<user_id>,
 * and record sent_at / provider_id or a coded last_error with backoff.
 * Nothing it stores or returns holds an address or Resend's message text.
 */
import { buildWelcomeEmail, isDeliverableAddress } from "./content.ts";

export const MAX_ATTEMPTS = 5;
export const BATCH = 25;

/** 10 min, 30 min, 1 h 30, 4 h 30 after attempts 1–4; the 5th failure is final. */
export function nextAttemptDelayMs(attempts: number): number {
  return 10 * 60_000 * 3 ** (attempts - 1);
}

/** Worth retrying: network (0), auth or domain trouble the owner can fix (401, 403), rate limits, server errors. */
export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
}

export interface OutboxRow { id: number; user_id: string; attempts: number }
export interface Member { email: string | null; displayName: string; subscribed: boolean }
export type SendResult = { ok: true; id: string } | { ok: false; status: number; name?: string };

export interface DrainDeps {
  now(): Date;
  listDue(limit: number): Promise<OutboxRow[]>;
  /** attempts = attempts + 1 where id, attempts = row.attempts and sent_at is null; false when another run won. */
  claim(row: OutboxRow): Promise<boolean>;
  loadMember(userId: string): Promise<Member | null>;
  tokenFor(userId: string): Promise<string>;
  send(m: {
    to: string;
    subject: string;
    html: string;
    text: string;
    headers: Record<string, string>;
    idempotencyKey: string;
  }): Promise<SendResult>;
  markSent(id: number, providerId: string): Promise<void>;
  markFailed(id: number, error: string, o: { terminal: boolean; nextAttemptAt: string }): Promise<void>;
}

export interface DrainResult { sent: number; skipped: number; failed: number; terminal: number }

export async function drainWelcomeOutbox(deps: DrainDeps, opts: { siteUrl: string }): Promise<DrainResult> {
  const result: DrainResult = { sent: 0, skipped: 0, failed: 0, terminal: 0 };
  const rows = await deps.listDue(BATCH);

  for (const row of rows) {
    if (!(await deps.claim(row))) continue;

    const member = await deps.loadMember(row.user_id);
    const skip = !member
      ? "no_profile"
      : !member.subscribed
        ? "not_subscribed"
        : !member.email
          ? "no_email"
          : !isDeliverableAddress(member.email)
            ? "undeliverable_domain"
            : null;
    if (skip || !member?.email) {
      await deps.markFailed(row.id, skip ?? "no_email", { terminal: true, nextAttemptAt: deps.now().toISOString() });
      result.skipped++;
      continue;
    }

    const token = await deps.tokenFor(row.user_id);
    const email = buildWelcomeEmail({
      displayName: member.displayName,
      unsubscribeUrl: `${opts.siteUrl}/unsubscribe?token=${token}`,
      year: deps.now().getUTCFullYear(),
      siteUrl: opts.siteUrl,
    });

    const sent = await deps.send({
      to: member.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
      idempotencyKey: `welcome/${row.user_id}`,
    });

    if (sent.ok) {
      await deps.markSent(row.id, sent.id);
      result.sent++;
      continue;
    }

    const attempt = row.attempts + 1;
    const terminal = !isRetryableStatus(sent.status) || attempt >= MAX_ATTEMPTS;
    await deps.markFailed(row.id, `resend ${sent.status}${sent.name ? ` ${sent.name}` : ""}`, {
      terminal,
      nextAttemptAt: new Date(deps.now().getTime() + nextAttemptDelayMs(attempt)).toISOString(),
    });
    result.failed++;
    if (terminal) result.terminal++;
  }

  return result;
}
