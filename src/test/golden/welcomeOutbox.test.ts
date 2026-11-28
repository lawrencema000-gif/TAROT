// @vitest-environment node
/**
 * The welcome email goes through an outbox (WP-P5-03, health-status-02).
 *
 * The profile trigger used to call send-welcome-email through pg_net with a
 * URL and a key from app.settings that were never set, so every opt-in failed
 * inside the trigger with a swallowed warning. Had a send gone out, its
 * Unsubscribe link carried no token, its footer said 2025 and its greeting
 * read a column that does not exist. The trigger now only enqueues, and
 * send-welcome-email drains public.email_outbox: at most one welcome per
 * member, only while they are still subscribed, never to a reserved domain,
 * with a coded result and backoff. drain.ts and content.ts are pure, so this
 * runs them with fake dependencies.
 */
import { describe, expect, it } from 'vitest';
import {
  BATCH,
  MAX_ATTEMPTS,
  drainWelcomeOutbox,
  isRetryableStatus,
  nextAttemptDelayMs,
  type DrainDeps,
  type Member,
  type OutboxRow,
  type SendResult,
} from '../../../supabase/functions/send-welcome-email/drain';
import { buildWelcomeEmail, escapeHtml, isDeliverableAddress } from '../../../supabase/functions/send-welcome-email/content';

const SITE = 'https://tarotlife.app';
const TOKEN = '3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60';
const USER = '0b9f6d2e-1c3a-4e5f-8a7b-9c0d1e2f3a4b';
const NOW = new Date('2026-11-15T10:00:00Z');

interface Calls {
  listDue: number[];
  claim: OutboxRow[];
  loadMember: string[];
  tokenFor: string[];
  send: Array<Parameters<DrainDeps['send']>[0]>;
  markSent: Array<[number, string]>;
  markFailed: Array<[number, string, { terminal: boolean; nextAttemptAt: string }]>;
}

function fakeDeps(opts: {
  rows?: OutboxRow[];
  member?: Member | null;
  claim?: boolean;
  send?: SendResult;
}): { deps: DrainDeps; calls: Calls } {
  const calls: Calls = { listDue: [], claim: [], loadMember: [], tokenFor: [], send: [], markSent: [], markFailed: [] };
  const deps: DrainDeps = {
    now: () => NOW,
    listDue: async (limit) => {
      calls.listDue.push(limit);
      return opts.rows ?? [{ id: 7, user_id: USER, attempts: 0 }];
    },
    claim: async (row) => {
      calls.claim.push(row);
      return opts.claim ?? true;
    },
    loadMember: async (id) => {
      calls.loadMember.push(id);
      return opts.member === undefined ? { email: 'reader@gmail.com', displayName: 'Luna', subscribed: true } : opts.member;
    },
    tokenFor: async (id) => {
      calls.tokenFor.push(id);
      return TOKEN;
    },
    send: async (m) => {
      calls.send.push(m);
      return opts.send ?? { ok: true, id: 'resend-id-1' };
    },
    markSent: async (id, providerId) => {
      calls.markSent.push([id, providerId]);
    },
    markFailed: async (id, error, o) => {
      calls.markFailed.push([id, error, o]);
    },
  };
  return { deps, calls };
}

const drain = (deps: DrainDeps) => drainWelcomeOutbox(deps, { siteUrl: SITE });

describe('retry schedule', () => {
  it('backs off 10 min, 30 min, 1 h 30, 4 h 30', () => {
    expect([1, 2, 3, 4].map(nextAttemptDelayMs)).toEqual([600_000, 1_800_000, 5_400_000, 16_200_000]);
    expect(MAX_ATTEMPTS).toBe(5);
    expect(BATCH).toBe(25);
  });

  it('retries network, auth, rate-limit and server errors, not a rejected message', () => {
    for (const s of [0, 401, 403, 408, 429, 500, 503]) expect(isRetryableStatus(s), String(s)).toBe(true);
    for (const s of [400, 422]) expect(isRetryableStatus(s), String(s)).toBe(false);
  });
});

describe('isDeliverableAddress', () => {
  it('refuses the reserved names of RFC 2606 / RFC 6761', () => {
    for (const a of ['arcana-qa-p7-p503@example.com', 'a@mail.example.org', 'a@x.test', 'a@x.invalid', 'a@x.example', 'a@localhost', 'a@example.net', 'a@x.localhost']) {
      expect(isDeliverableAddress(a), a).toBe(false);
    }
  });
  it('accepts real domains', () => {
    for (const a of ['a@gmail.com', 'a@mail.tarotlife.app', 'a@notexample.com']) expect(isDeliverableAddress(a), a).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes the five characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});

describe('a subscribed member gets one welcome', () => {
  it('sends once, with the token link, the year of sending, the display name and a List-Unsubscribe header', async () => {
    const { deps, calls } = fakeDeps({});
    const result = await drain(deps);

    expect(calls.listDue).toEqual([BATCH]);
    expect(calls.send).toHaveLength(1);
    const m = calls.send[0];
    expect(m.to).toBe('reader@gmail.com');
    expect(m.idempotencyKey).toBe(`welcome/${USER}`);
    expect(m.subject).toBe('Welcome to Arcana - Your Cosmic Journey Begins');
    expect(m.html).toContain('Dear <strong style="color: #d4af37;">Luna</strong>,');
    expect(m.html).toContain(`href="https://tarotlife.app/unsubscribe?token=${TOKEN}"`);
    expect(m.html).toContain('&copy; 2026 Arcana');
    expect(m.html).not.toContain('2025');
    expect(m.text).toContain('Luna');
    expect(m.text).toContain(`Unsubscribe: https://tarotlife.app/unsubscribe?token=${TOKEN}`);
    expect(m.text).toContain('Begin your daily ritual: https://tarotlife.app');
    expect(m.text).toContain('Privacy Policy: https://tarotlife.app/privacy-policy.html');
    expect(m.headers['List-Unsubscribe']).toBe(`<https://tarotlife.app/unsubscribe?token=${TOKEN}>`);
    expect(Object.keys(m.headers)).not.toContain('List-Unsubscribe-Post');

    expect(calls.markSent).toEqual([[7, 'resend-id-1']]);
    expect(calls.markFailed).toEqual([]);
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0, terminal: 0 });
  });

  it('says why it was sent, as D35 words it', () => {
    const e = buildWelcomeEmail({ displayName: 'Luna', unsubscribeUrl: `${SITE}/unsubscribe?token=${TOKEN}`, year: 2026, siteUrl: SITE });
    expect(e.html).toContain('You’re receiving this because you asked for Arcana’s welcome email.');
    expect(e.text).toContain('You’re receiving this because you asked for Arcana’s welcome email.');
  });

  it('escapes the display name', async () => {
    const { deps, calls } = fakeDeps({ member: { email: 'reader@gmail.com', displayName: '<img src=x onerror=alert(1)>', subscribed: true } });
    await drain(deps);
    expect(calls.send[0].html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(calls.send[0].html).not.toContain('<img src=x');
  });

  it('greets "Hello," without a display name', async () => {
    const { deps, calls } = fakeDeps({ member: { email: 'reader@gmail.com', displayName: '  ', subscribed: true } });
    await drain(deps);
    expect(calls.send[0].html).toContain('Hello,');
    expect(calls.send[0].html).not.toContain('Dear ');
  });
});

describe('rows that end without a send', () => {
  it.each([
    ['no profile', null, 'no_profile'],
    ['not subscribed', { email: 'reader@gmail.com', displayName: 'Luna', subscribed: false }, 'not_subscribed'],
    ['no address', { email: null, displayName: 'Luna', subscribed: true }, 'no_email'],
    ['a QA address', { email: 'arcana-qa-p7-p503@example.com', displayName: 'QA', subscribed: true }, 'undeliverable_domain'],
  ] as Array<[string, Member | null, string]>)('%s → %s, terminal, skipped', async (_what, member, reason) => {
    const { deps, calls } = fakeDeps({ member });
    const result = await drain(deps);
    expect(calls.send).toEqual([]);
    expect(calls.tokenFor).toEqual([]);
    expect(calls.markFailed).toEqual([[7, reason, { terminal: true, nextAttemptAt: NOW.toISOString() }]]);
    expect(result).toEqual({ sent: 0, skipped: 1, failed: 0, terminal: 0 });
  });

  it('a row another run claimed is left alone', async () => {
    const { deps, calls } = fakeDeps({ claim: false });
    const result = await drain(deps);
    expect(calls.claim).toHaveLength(1);
    expect(calls.loadMember).toEqual([]);
    expect(calls.send).toEqual([]);
    expect(calls.markSent).toEqual([]);
    expect(calls.markFailed).toEqual([]);
    expect(result).toEqual({ sent: 0, skipped: 0, failed: 0, terminal: 0 });
  });
});

describe('a failed send', () => {
  it('a 500 on the first attempt retries in 10 minutes', async () => {
    const { deps, calls } = fakeDeps({ send: { ok: false, status: 500 } });
    const result = await drain(deps);
    expect(calls.markFailed).toEqual([[7, 'resend 500', { terminal: false, nextAttemptAt: '2026-11-15T10:10:00.000Z' }]]);
    expect(result).toEqual({ sent: 0, skipped: 0, failed: 1, terminal: 0 });
  });

  it('a 422 validation_error is final', async () => {
    const { deps, calls } = fakeDeps({ send: { ok: false, status: 422, name: 'validation_error' } });
    const result = await drain(deps);
    expect(calls.markFailed[0][1]).toBe('resend 422 validation_error');
    expect(calls.markFailed[0][2].terminal).toBe(true);
    expect(result).toEqual({ sent: 0, skipped: 0, failed: 1, terminal: 1 });
  });

  it('a 503 on the fifth attempt is final', async () => {
    const { deps, calls } = fakeDeps({ rows: [{ id: 9, user_id: USER, attempts: 4 }], send: { ok: false, status: 503 } });
    const result = await drain(deps);
    expect(calls.markFailed[0][0]).toBe(9);
    expect(calls.markFailed[0][2].terminal).toBe(true);
    expect(result.terminal).toBe(1);
  });

  it('nothing it stores or returns holds an address', async () => {
    const runs: Array<{ calls: Calls; result: unknown }> = [];
    for (const opts of [
      { send: { ok: false, status: 500 } as SendResult },
      { send: { ok: false, status: 422, name: 'validation_error' } as SendResult },
      { member: { email: 'arcana-qa-p7-p503@example.com', displayName: 'QA', subscribed: true } },
      { member: { email: 'reader@gmail.com', displayName: 'Luna', subscribed: false } },
    ]) {
      const { deps, calls } = fakeDeps(opts);
      runs.push({ calls, result: await drain(deps) });
    }
    for (const { calls, result } of runs) {
      for (const [, error] of calls.markFailed) expect(error).not.toContain('@');
      expect(JSON.stringify(result)).not.toContain('@');
    }
  });
});
