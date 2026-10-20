/**
 * The journal coach's words that are not the model's: the system prompt, the
 * reply to an entry about self-harm or suicide, and reading the model's JSON.
 * Pure (no Deno, no network), so src/test/golden/crisis.test.ts runs it.
 *
 * p9 Q32: the coach screened entries with an English-only regex and its
 * prompt told the model to answer self-harm with the US 988 / 741741 lines.
 * A Japanese member who wrote 「もう消えたい。生きている意味がわからない。」 got
 * three reflective questions and no helpline. Now the entry goes through the
 * shared multilingual detector (_shared/crisis.ts) first, and a crisis reply
 * — from the detector or from the model — is this module's, in the member's
 * language, with the lines the Community crisis banner shows for it
 * (CRISIS_LINES, kept equal to the locale files by the golden test). The
 * reply carries `crisis: true` for a client that opens the banner itself.
 */

import { CRISIS_LINES, INTERNATIONAL_HELPLINES, detectCrisis, type CrisisLocale, type CrisisLines } from "../_shared/crisis.ts";

export const SYSTEM = `You are a warm, experienced journaling coach. The user has just written an entry. Your job:
- NOT to give advice, fix anything, or interpret what you're reading.
- Respond with:
  1. One short observation (≤30 words) — what you notice underneath the entry.
  2. 2-3 reflective questions that help them go deeper. Not yes/no. Specific to what they wrote.
- Tone: grounded, kind, not saccharine. Never use emoji. Never start with "I hear you" or other filler.
- Return JSON with exactly this shape: {"observation": "...", "prompts": ["...", "..."]}

If the entry contains self-harm or suicidal ideation, in any language, return exactly {"crisis": true} and nothing else. Do not write a reply and do not name any helpline or phone number: the app answers with the lines for the person's own country.`;

export interface CoachReply {
  observation: string;
  prompts: string[];
  /** Set on a crisis reply: the client shows its crisis banner too. */
  crisis?: true;
}

interface Words {
  /** "You do not have to carry it alone." Followed by the banner's footer. */
  notAlone: string;
  call: (l: CrisisLines) => string;
  also: (l: CrisisLines) => string;
  elsewhere: string;
  person: string;
  /** Between two sentences: a space, or nothing after 。 */
  gap: string;
}

const WORDS: Record<CrisisLocale, Words> = {
  en: {
    notAlone: "What you’ve written is serious, and you do not have to carry it alone.",
    call: (l) => `Would you be willing to reach out to ${l.phone.title} now? ${l.phone.body}.`,
    also: (l) => `${l.text.title}: ${l.text.body}.`,
    elsewhere: `Somewhere else? ${INTERNATIONAL_HELPLINES} lists free, confidential lines in your country.`,
    person: "Who is one person who cares about you that you could call or text right now?",
    gap: " ",
  },
  ja: {
    notAlone: "あなたが書いたことはとても深刻で、ひとりで抱える必要はありません。",
    call: (l) => `${l.phone.title}に、いま電話してみませんか？ ${l.phone.body}`,
    also: (l) => `${l.text.title}でも相談できます。${l.text.body}。`,
    elsewhere: `海外にいるときは、${INTERNATIONAL_HELPLINES} でその国の無料の相談窓口を探せます。`,
    person: "いま連絡できる、あなたを大切に思っている人はいますか？",
    gap: "",
  },
  ko: {
    notAlone: "적어 주신 내용은 가볍지 않아요. 혼자 감당하지 않아도 돼요.",
    call: (l) => `${l.phone.title}에 지금 전화해 보시겠어요? ${l.phone.body}`,
    also: (l) => `${l.text.title}에도 연락할 수 있어요. ${l.text.body}`,
    elsewhere: `해외에 있다면 ${INTERNATIONAL_HELPLINES}에서 그 나라의 무료 상담전화를 찾을 수 있어요.`,
    person: "지금 연락할 수 있는, 당신을 아끼는 사람이 있나요?",
    gap: " ",
  },
  zh: {
    notAlone: "你写下的这些很沉重，你不必独自承受。",
    call: (l) => `现在愿意拨打${l.phone.title}吗？${l.phone.body}`,
    also: (l) => `你也可以联系${l.text.title}：${l.text.body}。`,
    elsewhere: `如果你在其他国家或地区，可以在 ${INTERNATIONAL_HELPLINES} 找到当地的免费求助热线。`,
    person: "现在有没有一个在乎你、你可以马上联系的人？",
    gap: "",
  },
};

/** The coach's answer to an entry about self-harm or suicide, in `locale`. */
export function journalCrisisReply(locale: CrisisLocale): CoachReply {
  const w = WORDS[locale];
  const lines = CRISIS_LINES[locale];
  return {
    crisis: true,
    observation: `${w.notAlone}${w.gap}${lines.footer}`,
    prompts: [w.call(lines), `${w.also(lines)}${w.gap}${w.elsewhere}`, w.person],
  };
}

/** Before any model call: the crisis reply when the entry trips the shared detector, else null. */
export function crisisShortcut(entry: string, locale: CrisisLocale): CoachReply | null {
  return detectCrisis(entry) ? journalCrisisReply(locale) : null;
}

const FALLBACK_PROMPTS: Record<CrisisLocale, string[]> = {
  en: [
    "What in this entry surprises you when you read it back?",
    "Where is the next edge of honesty in what you wrote?",
  ],
  ja: [
    "読み返してみて、自分でも意外だったところはどこですか？",
    "書いたことの中で、もう一歩正直になれるところはどこですか？",
  ],
  ko: [
    "다시 읽어 보니 스스로도 뜻밖이었던 부분은 어디인가요?",
    "쓴 내용 중에서 한 걸음 더 솔직해질 수 있는 곳은 어디인가요?",
  ],
  zh: [
    "回头再读一遍，有哪里让你自己也感到意外？",
    "在你写下的内容里，哪里还可以再诚实一步？",
  ],
};

/** The two questions shown when the model's answer is not JSON (in the member's language, not always English). */
export function fallbackPrompts(locale: CrisisLocale): string[] {
  return [...FALLBACK_PROMPTS[locale]];
}

export type ModelAnswer = { kind: "crisis" } | { kind: "reply"; reply: CoachReply };

/**
 * The model's answer: {"crisis": true}, a reply, or null when it is neither.
 * A JSON object wrapped in prose or a ```json fence is read too — a crisis
 * answer must never reach the member as raw text.
 */
export function parseCoachReply(raw: string): ModelAnswer | null {
  const candidates = [raw];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(raw.slice(start, end + 1));
  for (const text of candidates) {
    try {
      const o = JSON.parse(text);
      if (o?.crisis === true) return { kind: "crisis" };
      if (typeof o?.observation === "string" && Array.isArray(o?.prompts)) {
        return {
          kind: "reply",
          reply: {
            observation: o.observation.slice(0, 400),
            prompts: (o.prompts as unknown[])
              .filter((p): p is string => typeof p === "string" && p.length > 0)
              .slice(0, 3)
              .map((p) => p.slice(0, 300)),
          },
        };
      }
    } catch {
      // try the next candidate
    }
  }
  return /"crisis"\s*:\s*true/.test(raw) ? { kind: "crisis" } : null;
}
