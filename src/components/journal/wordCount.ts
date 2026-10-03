/**
 * Words in a piece of writing, in any of the app's languages.
 *
 * `text.split(/\s+/)` counted a 40-character Japanese entry as one word
 * (P7 #93): Chinese and Japanese put no spaces between words, and Korean
 * spaces phrases rather than words. Intl.Segmenter's word granularity knows
 * each script's word boundaries; where a WebView lacks it, every Han / kana
 * character counts as one and everything else splits on whitespace.
 *
 * The journal_entries.word_count column is filled by a whitespace-split DB
 * trigger, so it is wrong for CJK; the UI counts from the content instead.
 */

const CJK_CHAR = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/u;

type SegmenterCtor = new (
  locale?: string,
  opts?: { granularity: 'word' },
) => { segment(input: string): Iterable<{ isWordLike?: boolean }> };

function segmenter(): SegmenterCtor | null {
  const S = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return typeof S === 'function' ? S : null;
}

/** Fallback without Intl.Segmenter: one per CJK character, whitespace words otherwise. */
export function countWordsFallback(text: string): number {
  let n = 0;
  for (const chunk of text.trim().split(/\s+/)) {
    if (!chunk) continue;
    let latinRun = false;
    for (const ch of chunk) {
      if (CJK_CHAR.test(ch)) {
        n++;
        latinRun = false;
      } else if (/[\p{L}\p{N}]/u.test(ch)) {
        if (!latinRun) n++;
        latinRun = true;
      } else {
        latinRun = false;
      }
    }
  }
  return n;
}

export function countWords(text: string, locale?: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const S = segmenter();
  if (!S) return countWordsFallback(trimmed);
  try {
    let n = 0;
    for (const seg of new S(locale, { granularity: 'word' }).segment(trimmed)) {
      if (seg.isWordLike) n++;
    }
    return n;
  } catch {
    return countWordsFallback(trimmed);
  }
}
