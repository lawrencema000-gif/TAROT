/**
 * One locale instruction for every text-producing AI function.
 *
 * Before this module each function carried its own copy: generate-reading
 * had full native-language directives for en/ja/ko/zh, six functions had a
 * thin `{ja,ko,zh}` → "Respond in Japanese" line, and ai-person-reading and
 * bazi-interpret had nothing, so a Japanese premium user got English Bazi.
 * Every function now imports from here, so the four languages are handled
 * the same way everywhere and a wording fix lands once.
 *
 * Usage (append to the END of the system prompt so it governs the whole
 * response):
 *
 *   const system = `${PERSONA}\n\n${localeInstruction(locale)}`;
 *   // JSON-mode functions:
 *   const system = `${SCHEMA_PROMPT}\n\n${localeInstruction(locale, { jsonKeys: true })}`;
 */

export type AiLocale = "en" | "ja" | "ko" | "zh";

/** `ja-JP`, `zh-Hans`, `ZH_cn`, `ko` → the four locales we ship; anything else → en. */
export function normalizeAiLocale(code: string | null | undefined): AiLocale {
  const lower = (code ?? "en").trim().toLowerCase();
  if (lower === "ja" || lower.startsWith("ja-") || lower.startsWith("ja_")) return "ja";
  if (lower === "ko" || lower.startsWith("ko-") || lower.startsWith("ko_")) return "ko";
  if (lower === "zh" || lower.startsWith("zh-") || lower.startsWith("zh_")) return "zh";
  return "en";
}

export const LOCALE_NAMES: Record<AiLocale, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Simplified Chinese",
};

/** English name of the response language, for prompts that mention it inline. */
export function localeName(code: string | null | undefined): string {
  return LOCALE_NAMES[normalizeAiLocale(code)];
}

// Native-language directives (lifted from generate-reading, which proved
// them in production) so the instruction itself is read in the target
// language — models follow a directive written in the target language more
// reliably than an English "respond in X".
const LOCALE_INSTRUCTIONS: Record<AiLocale, string> = {
  en: "Respond entirely in English.",
  ja: "回答はすべて日本語で書いてください。自然で温かみのある日本語を使い、すべてのセクションを日本語で完結させてください。",
  ko: "전체 답변을 한국어로 작성해 주세요. 자연스럽고 따뜻한 한국어를 사용하며, 모든 섹션을 한국어로 완성하세요.",
  zh: "请使用简体中文完整回答。使用自然、温暖的中文，所有部分都用中文完成。",
};

export interface LocaleInstructionOptions {
  /** The response is a JSON object whose keys are part of the contract. */
  jsonKeys?: boolean;
  /** The prompt describes a persona or voice that must survive translation. */
  keepVoice?: boolean;
}

/**
 * The instruction block for a locale. Always returns a line, including for
 * English, so prompts are shape-stable across locales (and so a cache key
 * built from the prompt differs per language).
 */
export function localeInstruction(
  code: string | null | undefined,
  opts: LocaleInstructionOptions = {},
): string {
  const loc = normalizeAiLocale(code);
  const parts = [LOCALE_INSTRUCTIONS[loc]];
  if (loc !== "en") {
    parts.push(`(Respond in ${LOCALE_NAMES[loc]}.`
      + (opts.keepVoice ? " Keep the voice and tone described above; translate naturally, not literally." : "")
      + ")");
  }
  if (opts.jsonKeys) {
    parts.push("JSON keys must stay exactly as specified, in English; only the values are written in the response language.");
  }
  return parts.join(" ");
}
