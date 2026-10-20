/**
 * The crisis reply of the AI surfaces that answer a member's own words: the
 * AI Companion chat (and the Tarot Companion that rides on it), the Quick
 * Reading (and Runes, the Sandbox and Ask the Oracle, which ride on it) and
 * the Mood Letter. Pure (no Deno, no network), so
 * src/test/golden/crisisReplies.test.ts runs it.
 *
 * p9 QS R-5: their prompts told the model to give "988 / crisistextline.org
 * in the US" to every member, in every language — a Japanese member who told
 * the companion 「もう消えたい」 was pointed at a US number, if at all. The
 * journal coach was fixed first (p9 Q32, ai-journal-coach/reply.ts); these
 * now work the same way:
 *
 *  - The member's words go through the shared multilingual detector
 *    (_shared/crisis.ts) before the model. A crisis message is answered by
 *    the app, not the model, in the member's language, with the lines the
 *    Community crisis banner shows for it (CRISIS_LINES).
 *  - No prompt names a helpline, number or website. The model is asked to
 *    answer a message about self-harm or suicide with a marker alone
 *    (CRISIS_FLAG, or {"crisis": true} in JSON mode), and the app answers
 *    that with the same reply: the detector misses a phrasing now and then,
 *    the model catches it.
 *  - A crisis reply is never sold: the request's Moonstone charge is given
 *    back (waiveForCrisis), and it is never cached.
 *
 * The sentences are the journal coach's, so a member reads the same words
 * wherever they write; the golden test holds the two equal.
 */

import { CRISIS_LINES, INTERNATIONAL_HELPLINES, detectCrisis, type CrisisLines, type CrisisLocale } from "./crisis.ts";

export type { CrisisLocale } from "./crisis.ts";

// ── Detecting it ────────────────────────────────────────────────────────────

/** Whether any of the member's own texts trips the shared detector. Each text is read on its own. */
export function writesCrisis(texts: Iterable<string | null | undefined>): boolean {
  for (const text of texts) if (text && detectCrisis(text)) return true;
  return false;
}

/** What a free-text prompt asks the model to answer with instead of a reply. */
export const CRISIS_FLAG = "[[CRISIS]]";

/** The model's free-text answer carries the flag (in any case or spacing, alone or not). */
export function isCrisisFlag(raw: string): boolean {
  return /\[\[\s*crisis\s*\]\]/i.test(raw);
}

/** A JSON-mode answer of {"crisis": true}. */
export function isCrisisJson(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as { crisis?: unknown }).crisis === true;
}

/**
 * The prompt's rule. `subject` is what the model reads for it ("the person's
 * newest message", "the question", "their notes"); `answer` is how the model
 * says so: the flag, or {"crisis": true} for a JSON-mode prompt.
 */
export function crisisRule(subject: string, answer: "flag" | "json"): string {
  const reply = answer === "flag"
    ? `reply with exactly ${CRISIS_FLAG} and nothing else`
    : `return exactly {"crisis": true} and nothing else`;
  return `If ${subject} speaks of self-harm, suicide or wanting to die, in any language, ${reply}: the app answers it with the helplines of the person's own country. Never name a helpline, phone number or website yourself.`;
}

// ── The reply ───────────────────────────────────────────────────────────────

interface Words {
  /** "You do not have to carry it alone." Followed by the banner's footer. */
  notAlone: string;
  call: (l: CrisisLines) => string;
  also: (l: CrisisLines) => string;
  elsewhere: string;
  person: string;
  /** Between two sentences: a space, or nothing after 。 */
  gap: string;
  /** The Mood Letter's theme label for a crisis letter. */
  theme: string;
  /** The Mood Letter's "One practice" for a crisis letter. */
  practice: string;
}

const WORDS: Record<CrisisLocale, Words> = {
  en: {
    notAlone: "What you’ve written is serious, and you do not have to carry it alone.",
    call: (l) => `Would you be willing to reach out to ${l.phone.title} now? ${l.phone.body}.`,
    also: (l) => `${l.text.title}: ${l.text.body}.`,
    elsewhere: `Somewhere else? ${INTERNATIONAL_HELPLINES} lists free, confidential lines in your country.`,
    person: "Who is one person who cares about you that you could call or text right now?",
    gap: " ",
    theme: "You are not alone",
    practice: "Today, reach out to one person who cares about you, with a call or a message.",
  },
  ja: {
    notAlone: "あなたが書いたことはとても深刻で、ひとりで抱える必要はありません。",
    call: (l) => `${l.phone.title}に、いま電話してみませんか？ ${l.phone.body}`,
    also: (l) => `${l.text.title}でも相談できます。${l.text.body}。`,
    elsewhere: `海外にいるときは、${INTERNATIONAL_HELPLINES} でその国の無料の相談窓口を探せます。`,
    person: "いま連絡できる、あなたを大切に思っている人はいますか？",
    gap: "",
    theme: "ひとりではありません",
    practice: "今日、あなたを大切に思っている人に、電話かメッセージで連絡してみてください。",
  },
  ko: {
    notAlone: "적어 주신 내용은 가볍지 않아요. 혼자 감당하지 않아도 돼요.",
    call: (l) => `${l.phone.title}에 지금 전화해 보시겠어요? ${l.phone.body}`,
    also: (l) => `${l.text.title}에도 연락할 수 있어요. ${l.text.body}`,
    elsewhere: `해외에 있다면 ${INTERNATIONAL_HELPLINES}에서 그 나라의 무료 상담전화를 찾을 수 있어요.`,
    person: "지금 연락할 수 있는, 당신을 아끼는 사람이 있나요?",
    gap: " ",
    theme: "혼자가 아니에요",
    practice: "오늘, 당신을 아끼는 사람 한 명에게 전화나 메시지로 연락해 보세요.",
  },
  zh: {
    notAlone: "你写下的这些很沉重，你不必独自承受。",
    call: (l) => `现在愿意拨打${l.phone.title}吗？${l.phone.body}`,
    also: (l) => `你也可以联系${l.text.title}：${l.text.body}。`,
    elsewhere: `如果你在其他国家或地区，可以在 ${INTERNATIONAL_HELPLINES} 找到当地的免费求助热线。`,
    person: "现在有没有一个在乎你、你可以马上联系的人？",
    gap: "",
    theme: "你并不孤单",
    practice: "今天，给一个在乎你的人打个电话或发条消息吧。",
  },
};

/**
 * The reply, paragraph by paragraph: not alone (and the emergency footer),
 * the phone line, the second line and findahelpline, one person to reach.
 * The journal coach's observation and three prompts, in order.
 */
export function crisisParagraphs(locale: CrisisLocale): string[] {
  const w = WORDS[locale];
  const lines = CRISIS_LINES[locale];
  return [`${w.notAlone}${w.gap}${lines.footer}`, w.call(lines), `${w.also(lines)}${w.gap}${w.elsewhere}`, w.person];
}

/** The reply as one text, paragraphs apart (a chat bubble, a reading). */
export function crisisText(locale: CrisisLocale): string {
  return crisisParagraphs(locale).join("\n\n");
}

/** The Mood Letter's shape: the letter, a theme label and one practice. */
export interface CrisisLetter {
  letter: string;
  dominantTheme: string;
  careSuggestion: string;
  crisis: true;
}

export function crisisLetter(locale: CrisisLocale): CrisisLetter {
  const w = WORDS[locale];
  return {
    letter: crisisParagraphs(locale).slice(0, 3).join("\n\n"),
    dominantTheme: w.theme,
    careSuggestion: w.practice,
    crisis: true,
  };
}

// ── The charge ──────────────────────────────────────────────────────────────

/** What waiveForCrisis needs of the handler's context (HandlerContext has it). */
export interface CrisisCtx {
  spend: { charged: boolean; continuing: boolean } | null;
  waiveSpend: (reason: string) => Promise<boolean>;
  log: { info: (msg: string, fields?: Record<string, unknown>) => void };
}

/**
 * A crisis reply is not what was paid for: give this request's charge back
 * (the debit, or a Premium soft-cap slot) and report what the member paid.
 * `charged` stays true only when the refund itself failed; `conversationPaid`
 * is a session that was already paid before this message (the companion).
 */
export async function waiveForCrisis(
  ctx: CrisisCtx,
  fn: string,
  by: "detector" | "model",
): Promise<{ charged: boolean; conversationPaid: boolean }> {
  const waived = await ctx.waiveSpend("crisis");
  ctx.log.info("crisis.reply", { fn, by, waived });
  return {
    charged: ctx.spend?.charged === true && !waived,
    conversationPaid: ctx.spend?.continuing === true,
  };
}
