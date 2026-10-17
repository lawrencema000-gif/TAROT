/**
 * The I Ching result in the reader's language: the 'iching' content overlay
 * (src/i18n/locales/<lng>/content-iching.json, read through
 * src/i18n/contentOverlay.ts).
 *
 * The 64 meanings stay English in src/data/ichingHexagrams.ts, the source of
 * truth. Before this overlay a Japanese, Korean or Chinese reader got the
 * hexagram's name in their language (iching.hexagrams.<n>.name, a UI string)
 * over English everything else: the tagline, the Judgement, the reading, the
 * strengths, the cautions, the journal prompt and the changing hexagram's
 * tagline.
 *
 * Overlay shape (ichingCorpus() is the English of it), keyed by the King Wen
 * number:
 *   hexagrams.<n>.{heading, tagline, judgement, interpretation, strengths[], cautions[], journalPrompt}
 *
 * `heading` is the line over the tagline. In English it is the pinyin and the
 * character ("Zhèn · 震"); a Chinese, Japanese or Korean reader instead gets
 * the hexagram's full classical name in their own script — upper trigram,
 * lower trigram, name (水雷屯, 天水讼; a doubled trigram reads 震为雷 /
 * 震為雷 / 중뢰진(重雷震)) — which is what their books print, where pinyin is
 * no help at all.
 *
 * A string the overlay lacks falls back to the English; a list only replaces
 * the English at the same length (ctList).
 */
import { ct, ctList, type ContentOverlay } from '../i18n/contentOverlay';
import { HEXAGRAMS, type HexagramMeaning } from './ichingHexagrams';

/** The English line over the tagline: the pinyin and the character. */
export function hexagramHeading(h: HexagramMeaning): string {
  return `${h.pinyin} · ${h.chinese}`;
}

/** What the result shows of one hexagram, in the reader's language. */
export interface HexagramText {
  heading: string;
  tagline: string;
  judgement: string;
  interpretation: string;
  strengths: string[];
  cautions: string[];
  journalPrompt: string;
}

/** The English of the overlay, in exactly its shape. */
export function ichingCorpus(): { hexagrams: Record<string, HexagramText> } {
  const hexagrams: Record<string, HexagramText> = {};
  for (const h of Object.values(HEXAGRAMS)) {
    hexagrams[String(h.number)] = {
      heading: hexagramHeading(h),
      tagline: h.tagline,
      judgement: h.judgement,
      interpretation: h.interpretation,
      strengths: [...h.strengths],
      cautions: [...h.cautions],
      journalPrompt: h.journalPrompt,
    };
  }
  return { hexagrams };
}

/** One hexagram's text through the overlay; English wherever the overlay has none. */
export function localizeHexagram(h: HexagramMeaning, overlay: ContentOverlay | null | undefined): HexagramText {
  const path = `hexagrams.${h.number}`;
  return {
    heading: ct(overlay, `${path}.heading`, hexagramHeading(h)),
    tagline: ct(overlay, `${path}.tagline`, h.tagline),
    judgement: ct(overlay, `${path}.judgement`, h.judgement),
    interpretation: ct(overlay, `${path}.interpretation`, h.interpretation),
    strengths: ctList(overlay, `${path}.strengths`, h.strengths),
    cautions: ctList(overlay, `${path}.cautions`, h.cautions),
    journalPrompt: ct(overlay, `${path}.journalPrompt`, h.journalPrompt),
  };
}
