import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "../_shared/handler.ts";
import { captureEdgeException } from "../_shared/sentry.ts";

/**
 * Newsletter-course delivery cron.
 *
 * Walks `newsletter_signups` for rows eligible to receive their next
 * lesson and sends via Resend. Cadence:
 *   Day 0 (5+ minutes after signup) → Lesson 1
 *   Day 2 after Lesson 1 sent       → Lesson 2
 *   Day 2 after Lesson 2 sent       → Lesson 3 (terminal)
 *
 * Skips: unsubscribed rows, rows that already received Lesson 3.
 *
 * Idempotent per-run: only sends if (emails_sent matches expected) AND
 * the corresponding cooldown has elapsed; UPDATEs increment emails_sent
 * + set last_emailed_at in the same statement that sent the email so
 * a retry within the same minute won't double-send.
 *
 * No-ops gracefully when RESEND_API_KEY is unset (logs only).
 *
 * Auth: webhook (CRON_SECRET via X-Webhook-Secret).
 */

const SITE_URL = "https://tarotlife.app";
const FROM_EMAIL = Deno.env.get("NEWSLETTER_FROM_EMAIL") || "Arcana <onboarding@resend.dev>";
const REPLY_TO = Deno.env.get("NEWSLETTER_REPLY_TO") || "lawrence.ma000@gmail.com";

interface SignupRow {
  id: string;
  email: string;
  emails_sent: number;
  last_emailed_at: string | null;
  created_at: string;
  unsubscribe_token: string;
}

interface LessonContent {
  subject: string;
  preheader: string;
  htmlBody: string;
  textBody: string;
}

function buildEmail(lessonNumber: 1 | 2 | 3, unsubscribeToken: string, email: string): LessonContent {
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${unsubscribeToken}`;

  if (lessonNumber === 1) {
    return {
      subject: "Lesson 1 — The 78 Cards in 5 Keywords",
      preheader: "The fastest way to grasp the entire deck.",
      htmlBody: lesson1Html(unsubscribeUrl),
      textBody: lesson1Text(unsubscribeUrl, email),
    };
  } else if (lessonNumber === 2) {
    return {
      subject: "Lesson 2 — Suit Correspondences (Wands, Cups, Swords, Pentacles)",
      preheader: "Why each suit speaks to a different part of life.",
      htmlBody: lesson2Html(unsubscribeUrl),
      textBody: lesson2Text(unsubscribeUrl, email),
    };
  }
  return {
    subject: "Lesson 3 — Numerology Basics for Card Combinations",
    preheader: "Reading numbers across multiple cards in a spread.",
    htmlBody: lesson3Html(unsubscribeUrl),
    textBody: lesson3Text(unsubscribeUrl, email),
  };
}

function shell(content: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6dfff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#15131e;border-radius:18px;border:1px solid rgba(212,175,55,0.2);overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <a href="https://tarotlife.app" style="text-decoration:none;color:#e6dfff;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.04em;">☽ Arcana</a>
        </td></tr>
        <tr><td style="padding:24px 32px;">${content}</td></tr>
        <tr><td style="padding:24px 32px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#7a7390;">
          <p style="margin:0 0 8px;">You are receiving this because you signed up for the free 3-part tarot email course at <a href="https://tarotlife.app" style="color:#e8c97a;">tarotlife.app</a>.</p>
          <p style="margin:0;"><a href="${unsubscribeUrl}" style="color:#a09bb1;">Unsubscribe with one click</a> &nbsp;·&nbsp; © Arcana</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function lesson1Html(unsubscribeUrl: string): string {
  return shell(`
    <p style="font-size:11px;color:#a09bb1;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 8px;">Lesson 1 of 3</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#fff;">The 78 cards in 5 keywords</h1>
    <p>The Rider-Waite-Smith deck has 78 cards. Memorising them card by card takes years. There is a faster way.</p>
    <p>Every card is a combination of <strong>five keyword pairs</strong>. Once you can read those, you can intuit any card on first encounter.</p>
    <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#e8c97a;margin:24px 0 8px;">The five pairs</h2>
    <ol style="line-height:1.7;padding-left:20px;">
      <li><strong>Beginning ↔ Completion</strong> — where in a cycle the card sits.</li>
      <li><strong>Inner ↔ Outer</strong> — is the action mental/emotional or physical/social.</li>
      <li><strong>Active ↔ Receptive</strong> — does the card push the world or receive from it.</li>
      <li><strong>Light ↔ Shadow</strong> — the upright energy vs the lesson when reversed.</li>
      <li><strong>Self ↔ Other</strong> — does the card describe the querent or the situation around them.</li>
    </ol>
    <p style="margin:24px 0 8px;">Try this: pull <em>The Fool</em>. Run him through the five pairs.</p>
    <ul style="line-height:1.7;padding-left:20px;color:#cfc8dc;">
      <li>Beginning (he is card 0)</li>
      <li>Outer (he steps physically)</li>
      <li>Active (he leaps)</li>
      <li>Light when upright (innocence) / Shadow when reversed (recklessness)</li>
      <li>Self (he is you)</li>
    </ul>
    <p>That is the entire shape of <em>The Fool</em>, with no memorisation. Try the next card you draw with the same five questions.</p>
    <p style="margin:24px 0 8px;">In two days you will get <strong>Lesson 2</strong> on the four suits. Each suit is one of the four life domains. Once you know which suit means what, every minor arcana card becomes self-explanatory.</p>
    <p style="margin-top:32px;"><a href="https://tarotlife.app/tarot-meanings" style="display:inline-block;padding:10px 20px;background:linear-gradient(180deg,#e8c97a,#c8a960);color:#0a0a0f;text-decoration:none;border-radius:10px;font-weight:600;">Browse all 78 card meanings →</a></p>
    <p style="margin-top:24px;color:#a09bb1;">— Arcana</p>
  `, unsubscribeUrl);
}

function lesson1Text(unsubscribeUrl: string, _email: string): string {
  return `LESSON 1 OF 3 — THE 78 CARDS IN 5 KEYWORDS

The Rider-Waite-Smith deck has 78 cards. Memorising them card by card takes years. There is a faster way.

Every card is a combination of five keyword pairs:

1. Beginning ↔ Completion
2. Inner ↔ Outer
3. Active ↔ Receptive
4. Light ↔ Shadow
5. Self ↔ Other

Try it on The Fool: he's a beginning, outer, active, light upright, you (self). That's the whole card.

Browse all 78 meanings: https://tarotlife.app/tarot-meanings

In two days, Lesson 2 on the four suits.

— Arcana

Unsubscribe: ${unsubscribeUrl}
`;
}

function lesson2Html(unsubscribeUrl: string): string {
  return shell(`
    <p style="font-size:11px;color:#a09bb1;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 8px;">Lesson 2 of 3</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#fff;">The four suits — four lives in one deck</h1>
    <p>Each of the four minor arcana suits represents a different domain of human life. Knowing which suit shows up tells you what the reading is about before you even read individual cards.</p>
    <table role="presentation" width="100%" cellpadding="12" cellspacing="0" style="margin:20px 0;border-collapse:separate;border-spacing:0 8px;">
      <tr><td style="background:rgba(232,201,122,0.08);border-radius:10px;border-left:3px solid #e8c97a;">
        <strong style="color:#e8c97a;">Wands — Fire — Action</strong><br/>
        <span style="color:#cfc8dc;">Drive, willpower, ambition, creative spark, professional projects, conflict.</span>
      </td></tr>
      <tr><td style="background:rgba(91,157,217,0.08);border-radius:10px;border-left:3px solid #5b9dd9;">
        <strong style="color:#5b9dd9;">Cups — Water — Emotion</strong><br/>
        <span style="color:#cfc8dc;">Love, intuition, feelings, family, friendships, dreams.</span>
      </td></tr>
      <tr><td style="background:rgba(160,160,200,0.10);border-radius:10px;border-left:3px solid #a0a0c8;">
        <strong style="color:#c8c8e8;">Swords — Air — Mind</strong><br/>
        <span style="color:#cfc8dc;">Thought, communication, conflict, decisions, truth, anxiety.</span>
      </td></tr>
      <tr><td style="background:rgba(93,158,90,0.10);border-radius:10px;border-left:3px solid #5d9e5a;">
        <strong style="color:#7fc97c;">Pentacles — Earth — Material</strong><br/>
        <span style="color:#cfc8dc;">Money, work, body, home, legacy, slow growth.</span>
      </td></tr>
    </table>
    <p>If a reading is mostly Cups, it is about feelings. Mostly Pentacles? About money or work. Mostly Swords with reversals? Probably mental stress that needs untangling.</p>
    <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#e8c97a;margin:24px 0 8px;">Try this</h2>
    <p>Shuffle your deck and pull three cards on a question. Before reading individual meanings, just count which suits show up. What does the suit mix alone tell you about the question?</p>
    <p style="margin:24px 0 8px;">In two days, the final lesson — <strong>Numerology basics for combining cards</strong>. When two cards in a spread share a number, they reinforce each other in a specific way.</p>
    <p style="margin-top:32px;"><a href="https://tarotlife.app/spreads" style="display:inline-block;padding:10px 20px;background:linear-gradient(180deg,#e8c97a,#c8a960);color:#0a0a0f;text-decoration:none;border-radius:10px;font-weight:600;">Try a 3-card spread →</a></p>
    <p style="margin-top:24px;color:#a09bb1;">— Arcana</p>
  `, unsubscribeUrl);
}

function lesson2Text(unsubscribeUrl: string, _email: string): string {
  return `LESSON 2 OF 3 — THE FOUR SUITS

Wands (Fire) — Action: drive, ambition, projects.
Cups (Water) — Emotion: love, intuition, feelings.
Swords (Air) — Mind: thought, communication, decisions.
Pentacles (Earth) — Material: money, work, body, home.

If a reading is mostly Cups, it's about feelings. Mostly Pentacles? Money/work.

Try a 3-card spread: https://tarotlife.app/spreads

In two days, Lesson 3 — Numerology for combining cards.

— Arcana

Unsubscribe: ${unsubscribeUrl}
`;
}

function lesson3Html(unsubscribeUrl: string): string {
  return shell(`
    <p style="font-size:11px;color:#a09bb1;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 8px;">Lesson 3 of 3</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#fff;">Numerology — when cards talk to each other</h1>
    <p>You now have keywords (Lesson 1) and suits (Lesson 2). The third layer is <strong>numbers</strong>. When two cards in a spread share a number, they reinforce each other along that number's theme.</p>
    <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#e8c97a;margin:24px 0 8px;">The 9 numbers</h2>
    <ol style="line-height:1.8;padding-left:20px;">
      <li><strong>1 / Aces</strong> — pure potential, beginning, single force.</li>
      <li><strong>2</strong> — partnership, balance, choice.</li>
      <li><strong>3</strong> — creation, expression, joy together.</li>
      <li><strong>4</strong> — stability, structure, foundation.</li>
      <li><strong>5</strong> — challenge, change, conflict.</li>
      <li><strong>6</strong> — harmony, generosity, return to balance.</li>
      <li><strong>7</strong> — reflection, illusion, choice within.</li>
      <li><strong>8</strong> — mastery, power, fruition.</li>
      <li><strong>9</strong> — completion, near-end, integration.</li>
    </ol>
    <p style="margin:20px 0 8px;">If a spread shows two Fives — say <em>5 of Cups</em> and <em>5 of Wands</em> — the reading is dominated by challenge and change, even though the suits speak to different areas. Numbers tie the story together.</p>
    <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#e8c97a;margin:24px 0 8px;">Try this</h2>
    <p>Pull three cards. Note their numbers. Are any repeated? What's the dominant number? What does it tell you about the situation as a whole, regardless of suits?</p>
    <p style="margin:24px 0 8px;">You now have the three foundations every reader uses: <strong>keywords, suits, numbers</strong>. Layer them together and you can read any spread.</p>
    <p style="margin:24px 0;background:rgba(232,201,122,0.08);border:1px solid rgba(232,201,122,0.3);border-radius:14px;padding:20px;">
      <strong style="display:block;margin-bottom:8px;color:#e8c97a;">A small gift</strong>
      Get 3 days of Premium free — daily personalised tarot pulls, deeper card meanings, journaling, and reading history that builds patterns over time.
    </p>
    <p style="margin-top:24px;"><a href="https://tarotlife.app/signup" style="display:inline-block;padding:12px 24px;background:linear-gradient(180deg,#e8c97a,#c8a960);color:#0a0a0f;text-decoration:none;border-radius:10px;font-weight:600;">Start your free 3-day trial →</a></p>
    <p style="margin-top:24px;color:#a09bb1;">Thanks for reading. May your daily pulls land truer.<br/>— Arcana</p>
  `, unsubscribeUrl);
}

function lesson3Text(unsubscribeUrl: string, _email: string): string {
  return `LESSON 3 OF 3 — NUMEROLOGY

The 9 numbers in tarot:
1 / Aces — pure potential
2 — partnership, balance
3 — creation, expression
4 — stability, foundation
5 — challenge, change
6 — harmony, return to balance
7 — reflection, illusion
8 — mastery, fruition
9 — completion, integration

When two cards share a number in a spread, they reinforce each other along that theme.

You now have the three foundations: keywords, suits, numbers.

Get 3 days of Premium free: https://tarotlife.app/signup

— Arcana

Unsubscribe: ${unsubscribeUrl}
`;
}

async function sendOne(row: SignupRow, lesson: 1 | 2 | 3, apiKey: string, ctx: { log: { info: (a: string, b?: unknown) => void; warn: (a: string, b?: unknown) => void } }): Promise<{ ok: boolean; error?: string }> {
  const content = buildEmail(lesson, row.unsubscribe_token, row.email);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [row.email],
        reply_to: REPLY_TO,
        subject: content.subject,
        html: content.htmlBody,
        text: content.textBody,
        headers: {
          "List-Unsubscribe": `<${SITE_URL}/unsubscribe?token=${row.unsubscribe_token}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      ctx.log.warn("send_newsletter.resend_non_ok", { status: res.status, body: body.slice(0, 300) });
      return { ok: false, error: `resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(handler<unknown>({
  fn: "send-newsletter-course",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 10, windowMs: 60_000 },
  run: async (ctx) => {
    const apiKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!apiKey) {
      ctx.log.warn("send_newsletter.no_resend_key", { reason: "RESEND_API_KEY not set" });
      return { ok: true, skipped: true, reason: "RESEND_API_KEY not set" };
    }

    // Cap per-run sends so a stuck queue doesn't blow up the cron's
    // execution window. 50 emails per hour-cron = 1,200/day max.
    const PER_RUN_CAP = 50;
    const totals = { lesson1: 0, lesson2: 0, lesson3: 0, failed: 0 };

    // ── Lesson 1 — eligible: emails_sent=0 AND signed up at least 5 min ago ──
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: l1Rows, error: l1Err } = await ctx.supabase
      .from("newsletter_signups")
      .select("id, email, emails_sent, last_emailed_at, created_at, unsubscribe_token")
      .eq("emails_sent", 0)
      .is("unsubscribed_at", null)
      .lt("created_at", fiveMinAgo)
      .limit(PER_RUN_CAP);
    if (l1Err) ctx.log.warn("send_newsletter.l1_query_failed", { err: l1Err.message });

    for (const row of (l1Rows || []) as SignupRow[]) {
      const r = await sendOne(row, 1, apiKey, ctx);
      if (r.ok) {
        await ctx.supabase
          .from("newsletter_signups")
          .update({ emails_sent: 1, last_emailed_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("emails_sent", 0); // optimistic concurrency guard
        totals.lesson1++;
      } else {
        totals.failed++;
        ctx.log.warn("send_newsletter.l1_failed", { email: row.email, err: r.error });
      }
    }

    // ── Lesson 2 — eligible: emails_sent=1 AND last sent >= 2 days ago ──
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    const remainingCap = PER_RUN_CAP - totals.lesson1;
    if (remainingCap > 0) {
      const { data: l2Rows } = await ctx.supabase
        .from("newsletter_signups")
        .select("id, email, emails_sent, last_emailed_at, created_at, unsubscribe_token")
        .eq("emails_sent", 1)
        .is("unsubscribed_at", null)
        .lt("last_emailed_at", twoDaysAgo)
        .limit(remainingCap);
      for (const row of (l2Rows || []) as SignupRow[]) {
        const r = await sendOne(row, 2, apiKey, ctx);
        if (r.ok) {
          await ctx.supabase
            .from("newsletter_signups")
            .update({ emails_sent: 2, last_emailed_at: new Date().toISOString() })
            .eq("id", row.id)
            .eq("emails_sent", 1);
          totals.lesson2++;
        } else {
          totals.failed++;
          ctx.log.warn("send_newsletter.l2_failed", { email: row.email, err: r.error });
        }
      }
    }

    // ── Lesson 3 — eligible: emails_sent=2 AND last sent >= 2 days ago ──
    const remainingCap2 = PER_RUN_CAP - totals.lesson1 - totals.lesson2;
    if (remainingCap2 > 0) {
      const { data: l3Rows } = await ctx.supabase
        .from("newsletter_signups")
        .select("id, email, emails_sent, last_emailed_at, created_at, unsubscribe_token")
        .eq("emails_sent", 2)
        .is("unsubscribed_at", null)
        .lt("last_emailed_at", twoDaysAgo)
        .limit(remainingCap2);
      for (const row of (l3Rows || []) as SignupRow[]) {
        const r = await sendOne(row, 3, apiKey, ctx);
        if (r.ok) {
          await ctx.supabase
            .from("newsletter_signups")
            .update({ emails_sent: 3, last_emailed_at: new Date().toISOString() })
            .eq("id", row.id)
            .eq("emails_sent", 2);
          totals.lesson3++;
        } else {
          totals.failed++;
          ctx.log.warn("send_newsletter.l3_failed", { email: row.email, err: r.error });
        }
      }
    }

    if (totals.failed > 0) {
      captureEdgeException(new Error(`Newsletter course had ${totals.failed} send failures`), {
        fn: "send-newsletter-course",
        correlationId: ctx.correlationId,
        level: "warning",
        tags: { stage: "send_loop" },
        extra: { totals },
      });
    }

    ctx.log.info("send_newsletter.done", totals);
    return { ok: true, ...totals };
  },
}));
