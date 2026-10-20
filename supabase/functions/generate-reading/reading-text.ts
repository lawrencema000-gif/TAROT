/**
 * The pure text of generate-reading: what each card contributes to the
 * prompt, and the template reading served when every AI provider fails.
 * No Deno, no network — exercised from Node by
 * src/test/golden/generate-reading-text.test.ts.
 */

import { normalizeAiLocale, type AiLocale } from "../_shared/locale.ts";

export interface ReadingTextCard {
  id: number;
  name: string;
  reversed: boolean;
  keywords?: string[];
  meaningUpright?: string;
  meaningReversed?: string;
  loveMeaning?: string;
  careerMeaning?: string;
  /** Playing cards carry an advice line. */
  adviceMeaning?: string;
}

export type FocusArea = "love" | "career" | "general";

export function excerpt(input: string | undefined, maxChars: number): string {
  if (!input) return "";
  const s = input.replace(/\s+/g, " ").trim();
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return (lastStop > Math.min(120, maxChars / 2) ? cut.slice(0, lastStop + 1) : cut).trim();
}

/**
 * The lines one card adds under its position in the prompt.
 *
 * The canonical excerpt — which the system prompt calls ground truth — is
 * ORIENTATION-AWARE: a reversed card is read from its reversed meaning,
 * always. Until 2026-10-03 a focus meaning replaced it (love → loveMeaning,
 * career → careerMeaning, general → adviceMeaning), and those are written
 * for the upright card, so a reversed Nine of Hearts reached the model as
 * its upright advice and the paid reading contradicted the result sheet
 * (p7 #13). Focus and advice lines now ride along as extra context.
 */
export function cardPromptLines(card: ReadingTextCard, focusArea: FocusArea | undefined, excerptChars: number): string[] {
  const lines: string[] = [];
  if (card.keywords?.length) lines.push(`Keywords: ${card.keywords.slice(0, 6).join(", ")}`);

  const focusMeaning = focusArea === "love" ? card.loveMeaning : focusArea === "career" ? card.careerMeaning : undefined;
  const base = card.reversed
    ? (card.meaningReversed || card.meaningUpright)
    : (focusMeaning || card.meaningUpright);
  if (base) lines.push(`Canonical meaning excerpt: ${excerpt(base, excerptChars)}`);

  const extraChars = Math.max(80, Math.round(excerptChars / 2));
  if (focusMeaning && focusMeaning !== base) {
    lines.push(
      card.reversed
        ? `${focusArea === "love" ? "Love" : "Career"} note (written for the upright card; read it through the reversal): ${excerpt(focusMeaning, extraChars)}`
        : `${focusArea === "love" ? "Love" : "Career"} note: ${excerpt(focusMeaning, extraChars)}`,
    );
  }
  if (card.adviceMeaning && card.adviceMeaning !== base) {
    lines.push(
      card.reversed
        ? `Advice line (written for the upright card; read it through the reversal): ${excerpt(card.adviceMeaning, extraChars)}`
        : `Advice line: ${excerpt(card.adviceMeaning, extraChars)}`,
    );
  }
  return lines;
}

interface FallbackStrings {
  /** First line of every template reading: it is not an AI reading. */
  notice: string;
  /** Appended to the notice when the charge was given back (or never made). */
  notCharged: string;
  question: string;
  reversed: string;
  noMeaning: string;
  verdict: string;
  closingOne: string;
  closingMany: string;
}

export const FALLBACK_STRINGS: Record<AiLocale, FallbackStrings> = {
  en: {
    notice: "The AI reader couldn’t be reached, so this is the standard reading from the card meanings.",
    notCharged: "No Moonstones were charged.",
    question: "Regarding your question, the cards offer the following guidance:",
    reversed: "Reversed",
    noMeaning: "This card invites you to trust your intuition and look within for answers.",
    verdict: "Verdict",
    closingOne: "This card suggests a time of reflection. Trust the journey and know that you have the wisdom within to navigate whatever arises.",
    closingMany: "Taken together, these cards suggest a time of transition and growth. Trust the journey and know that you have the wisdom within to navigate whatever arises.",
  },
  ja: {
    notice: "AIリーダーに接続できなかったため、カードの意味にもとづく標準のリーディングをお届けします。",
    notCharged: "ムーンストーンは消費されていません。",
    question: "あなたの質問について、カードは次のように語っています。",
    reversed: "逆位置",
    noMeaning: "このカードは、自分の直感を信じ、答えを内側に探すよう促しています。",
    verdict: "判定",
    closingOne: "このカードは、立ち止まって振り返る時を示しています。この道のりを信じてください。何が起きても進んでいける知恵は、あなたの中にあります。",
    closingMany: "これらのカードを合わせて見ると、移り変わりと成長の時を示しています。この道のりを信じてください。何が起きても進んでいける知恵は、あなたの中にあります。",
  },
  ko: {
    notice: "AI 리더에 연결할 수 없어 카드 의미를 바탕으로 한 기본 리딩을 보여 드립니다.",
    notCharged: "문스톤은 차감되지 않았습니다.",
    question: "당신의 질문에 대해 카드는 다음과 같이 안내합니다.",
    reversed: "역방향",
    noMeaning: "이 카드는 직관을 믿고 답을 내면에서 찾아보라고 권합니다.",
    verdict: "판정",
    closingOne: "이 카드는 돌아보는 시간을 가리킵니다. 이 여정을 믿으세요. 어떤 일이 닥쳐도 헤쳐 나갈 지혜가 당신 안에 있습니다.",
    closingMany: "이 카드들을 함께 보면 변화와 성장의 시기를 가리킵니다. 이 여정을 믿으세요. 어떤 일이 닥쳐도 헤쳐 나갈 지혜가 당신 안에 있습니다.",
  },
  zh: {
    notice: "暂时无法连接 AI 解读，以下是根据牌义给出的标准解读。",
    notCharged: "未扣除月光石。",
    question: "关于你的问题，牌面给出以下指引：",
    reversed: "逆位",
    noMeaning: "这张牌邀请你相信直觉，向内心寻找答案。",
    verdict: "结论",
    closingOne: "这张牌提示这是一个沉淀与反思的时期。相信这段旅程，你内心拥有应对一切的智慧。",
    closingMany: "综合来看，这些牌提示这是一个转变与成长的时期。相信这段旅程，你内心拥有应对一切的智慧。",
  },
};

/** The one-line notice a template reading starts with (localized). */
export function fallbackNotice(locale: string | undefined, notCharged: boolean): string {
  const s = FALLBACK_STRINGS[normalizeAiLocale(locale)];
  return notCharged ? `${s.notice} ${s.notCharged}` : s.notice;
}

/**
 * The template reading served when every AI provider failed: the cards'
 * own meanings in the reader's language, introduced by a line that says it
 * is not an AI reading. `notCharged` adds "No Moonstones were charged"
 * when the charge was given back.
 */
export function fallbackReadingText(p: {
  cards: ReadingTextCard[];
  positions: string[];
  question?: string;
  verdict?: string;
  locale?: string;
  notCharged: boolean;
}): string {
  const s = FALLBACK_STRINGS[normalizeAiLocale(p.locale)];
  let reading = `${fallbackNotice(p.locale, p.notCharged)}\n\n`;
  if (p.question) reading += `${s.question}\n\n`;
  p.cards.forEach((card, index) => {
    const position = p.positions[index] || `${index + 1}`;
    const meaning = card.reversed ? (card.meaningReversed || card.meaningUpright) : card.meaningUpright;
    reading += `**${position}: ${card.name}${card.reversed ? ` (${s.reversed})` : ""}**\n`;
    reading += `${meaning || s.noMeaning}\n\n`;
  });
  if (p.verdict) reading += `**${s.verdict}:** ${p.verdict}\n\n`;
  reading += p.cards.length > 1 ? s.closingMany : s.closingOne;
  return reading;
}
