/**
 * Shared logic for the AI reading screens that charge per reading (the
 * quick reading, the rune cast, a saved person's chart reading).
 *
 * Two things every one of them has to get right, and each got wrong on its
 * own:
 *
 *  1. What a failure means for the user's Moonstones. The server debits
 *     before it runs and refunds when the run throws; a request rejected
 *     before the debit (rate limit, AI paused, short balance) costs nothing;
 *     a response lost on the way back may have been charged — and a retry
 *     with the same `requestId` and the same body is then free and returns
 *     that reading. `aiFailureOf` sorts an invoke error into those cases
 *     from the HTTP status and the envelope's `error.code`, never from the
 *     message text (a FunctionsHttpError's message is always the same
 *     generic sentence, so `message.includes('INSUFFICIENT')` never matched).
 *
 *  2. Where the summary ends. See `splitReading`.
 */

export type AiFailure =
  /** 402 — not enough Moonstones. Nothing was charged; show the Earn sheet. */
  | 'insufficient'
  /** 429 AI_SOFT_CAP — the premium daily cap. Nothing was charged; show the sheet. */
  | 'soft-cap'
  /** 429 — the per-minute limit. Rejected before the debit. */
  | 'rate-limit'
  /** 503 — readings are paused. Rejected before the debit. */
  | 'unavailable'
  /** No response at all (network, relay): the debit may have landed. */
  | 'network'
  /** Any other failure: refunded by the server when it threw after the debit. */
  | 'generic';

/** True when the failure happened before any debit, so "nothing was charged" is true. */
export function failedBeforeCharge(f: AiFailure): boolean {
  return f === 'insufficient' || f === 'soft-cap' || f === 'rate-limit' || f === 'unavailable';
}

interface MaybeFunctionsError {
  name?: string;
  context?: unknown;
}

/** The `error.code` of the function's JSON envelope, when the error carries a Response. */
async function envelopeCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.clone().json()) as { error?: { code?: unknown } | string; code?: unknown };
    const code = typeof body.error === 'object' && body.error ? body.error.code : body.code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

/** Sort a `supabase.functions.invoke` error into the cases the UI words differently. */
export async function aiFailureOf(error: unknown): Promise<AiFailure> {
  const ctx = (error as MaybeFunctionsError | null)?.context;
  const res = ctx && typeof (ctx as Response).clone === 'function' && typeof (ctx as Response).status === 'number'
    ? (ctx as Response)
    : null;
  if (!res) return 'network';
  const code = await envelopeCode(res);
  if (res.status === 402 || code === 'INSUFFICIENT_BALANCE') return 'insufficient';
  if (code === 'AI_SOFT_CAP') return 'soft-cap';
  if (res.status === 429 || code === 'RATE_LIMITED') return 'rate-limit';
  if (res.status === 503) return 'unavailable';
  return 'generic';
}

/** A closing quote or bracket that stays with the sentence it closes. */
const CLOSERS = '’”"\')\\]」』）】';
/** Full-width stops: a CJK sentence ends here, with or without a space after. */
const CJK_STOPS = '。！？．';

/**
 * Where each sentence after the first starts.
 *
 *  - ASCII `.` `!` `?` `…` (plus a closing quote) end a sentence only when
 *    whitespace follows, so "3.5", "e.g.x" and a URL stay whole.
 *  - Full-width `。！？．` end one whether or not a space follows (Japanese
 *    and Chinese put none), but never in the middle of a run of stops
 *    (？！) and never inside quoted speech: a stop followed by its closing
 *    bracket (「行こう。」と言った。) usually runs on into the same
 *    sentence, so a CJK sentence ends only at a bare stop.
 */
const BOUNDARY = new RegExp(
  `(?<=[.!?…][${CLOSERS}]?)\\s+(?=\\S)` +
    `|(?<=[${CJK_STOPS}])(?![${CJK_STOPS}!?${CLOSERS}])\\s*(?=\\S)`,
  'g',
);

/** The sentences of one paragraph, each with its own trailing punctuation, trimmed. */
export function splitSentences(paragraph: string): string[] {
  const text = paragraph.trim();
  if (!text) return [];
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(BOUNDARY)) {
    const at = m.index ?? 0;
    if (at <= start) continue;
    out.push(text.slice(start, at).trim());
    start = at + m[0].length;
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

/** Join sentences back: a space after a Latin sentence, nothing after a CJK stop. */
export function joinSentences(sentences: string[]): string {
  return sentences.reduce((acc, s) => {
    if (!acc) return s;
    const cjkEnd = new RegExp(`[${CJK_STOPS}][${CLOSERS}]?$`).test(acc);
    return cjkEnd ? acc + s : `${acc} ${s}`;
  }, '');
}

/**
 * The summary is the opening of the first paragraph — at most two
 * sentences, the lede the sheet centres — and everything after it is the
 * body. The model's first paragraph runs to ninety words (or a hundred and
 * fifty characters of Japanese); centring all of it reads as a wall.
 */
export function splitReading(text: string): { summary: string; rest: string } {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { summary: text.trim(), rest: '' };
  const sentences = splitSentences(parts[0]);
  const summary = joinSentences(sentences.slice(0, 2));
  const tail = joinSentences(sentences.slice(2));
  const rest = [tail, ...parts.slice(1)].filter(Boolean).join('\n\n');
  return { summary, rest };
}

/**
 * `onPointerDown` / `onMouseDown` for a call to action that sits under a
 * text box: keep focus where it is when the button is pressed.
 *
 * While a text box has focus the bottom nav is hidden (index.css hides it
 * for the soft keyboard). Pressing the button blurred the box on
 * pointerdown, the nav came back under the finger, and the release landed
 * on the nav — so the first tap after typing did nothing (Phase 7 review
 * #20). Cancelling the press's default keeps the box focused until the
 * click has landed; the screen that replaces the form then takes the
 * keyboard down. Keyboard activation is unaffected.
 */
export const keepFocusOnPress = (e: { preventDefault: () => void }) => e.preventDefault();
