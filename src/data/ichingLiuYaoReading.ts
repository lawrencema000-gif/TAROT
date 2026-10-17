/**
 * The 六爻 panel in the reader's language: the 'liuyao' content overlay
 * (src/i18n/locales/<lng>/content-liuyao.json, read through
 * src/i18n/contentOverlay.ts).
 *
 * The prose stays English in src/data/liuYaoContent.ts and the role names in
 * src/data/liuYao.ts, the source of truth. Before this overlay the panel was
 * English on every screen — the introduction, each palace's temperament, the
 * six relatives and six spirits, the 世/應 and moving-line notes — with the
 * data's traditional hanzi printed raw on a simplified-Chinese screen.
 *
 * Overlay shape (liuYaoCorpus() is the English of it):
 *   intro
 *   relatives.<relative>.{name, title, text, asks}
 *   spirits.<spirit>.{title, text}
 *   palaces.<palace>.text
 *   notes.{worldResponse, movingLine}
 *
 * `name` is what an English or Korean reader sees beside the glyph (父母
 * Parent, 父母 부모). Chinese and Japanese write the role in hanzi, so their
 * name IS the glyph in their script, and the panel prints the glyph alone;
 * localizeHanzi.test.ts holds their overlays to localizeHanzi. A spirit's
 * `title` follows its glyph (青龍 · Azure Dragon — Wood, East; 青龙 · 东方木).
 *
 * The glyphs themselves (父母, 青龍, 震, 本宮卦, 動, 世, 應, 納甲筮法) are
 * the data's traditional characters through localizeHanzi, and the panel's
 * chrome is UI strings (liuyao.* in app.json).
 */
import { ct, type ContentOverlay } from '../i18n/contentOverlay';
import { RELATIVE_INFO, type Palace, type Relative, type Spirit } from './liuYao';
import {
  LIUYAO_INTRO,
  MOVING_LINE_NOTE,
  PALACE_MEANINGS,
  RELATIVE_MEANINGS,
  SPIRIT_MEANINGS,
  WORLD_RESPONSE_NOTE,
} from './liuYaoContent';

export interface RelativeText {
  name: string;
  title: string;
  text: string;
  asks: string;
}

export interface SpiritText {
  title: string;
  text: string;
}

export interface LiuYaoCorpus {
  intro: string;
  relatives: Record<Relative, RelativeText>;
  spirits: Record<Spirit, SpiritText>;
  palaces: Record<Palace, { text: string }>;
  notes: { worldResponse: string; movingLine: string };
}

/** The English of the overlay, in exactly its shape. */
export function liuYaoCorpus(): LiuYaoCorpus {
  const relatives = {} as Record<Relative, RelativeText>;
  for (const r of Object.keys(RELATIVE_MEANINGS) as Relative[]) {
    const m = RELATIVE_MEANINGS[r];
    relatives[r] = { name: RELATIVE_INFO[r].en, title: m.title, text: m.text, asks: m.asks };
  }
  const spirits = {} as Record<Spirit, SpiritText>;
  for (const s of Object.keys(SPIRIT_MEANINGS) as Spirit[]) {
    spirits[s] = { title: SPIRIT_MEANINGS[s].title, text: SPIRIT_MEANINGS[s].text };
  }
  const palaces = {} as Record<Palace, { text: string }>;
  for (const p of Object.keys(PALACE_MEANINGS) as Palace[]) palaces[p] = { text: PALACE_MEANINGS[p].text };
  return {
    intro: LIUYAO_INTRO,
    relatives,
    spirits,
    palaces,
    notes: { worldResponse: WORLD_RESPONSE_NOTE, movingLine: MOVING_LINE_NOTE },
  };
}

/** The introduction and the two reading notes. */
export function liuYaoNotes(overlay: ContentOverlay | null | undefined): { intro: string; worldResponse: string; movingLine: string } {
  return {
    intro: ct(overlay, 'intro', LIUYAO_INTRO),
    worldResponse: ct(overlay, 'notes.worldResponse', WORLD_RESPONSE_NOTE),
    movingLine: ct(overlay, 'notes.movingLine', MOVING_LINE_NOTE),
  };
}

/** A family role's name, heading, meaning and what it asks of you. */
export function relativeText(r: Relative, overlay: ContentOverlay | null | undefined): RelativeText {
  const m = RELATIVE_MEANINGS[r];
  const path = `relatives.${r}`;
  return {
    name: ct(overlay, `${path}.name`, RELATIVE_INFO[r].en),
    title: ct(overlay, `${path}.title`, m.title),
    text: ct(overlay, `${path}.text`, m.text),
    asks: ct(overlay, `${path}.asks`, m.asks),
  };
}

/** A spirit's heading and meaning. */
export function spiritText(s: Spirit, overlay: ContentOverlay | null | undefined): SpiritText {
  const m = SPIRIT_MEANINGS[s];
  return { title: ct(overlay, `spirits.${s}.title`, m.title), text: ct(overlay, `spirits.${s}.text`, m.text) };
}

/** A palace's temperament. */
export function palaceText(p: Palace, overlay: ContentOverlay | null | undefined): string {
  return ct(overlay, `palaces.${p}.text`, PALACE_MEANINGS[p].text);
}
