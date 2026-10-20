import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LOVE_TREE_QUIZ,
  ATTACHMENT_INFO,
  ATTACHMENT_TEXT_FIELDS,
  loveTreeCorpus,
  localizeAttachment,
  localizeLoveTreeItem,
  type Attachment,
} from './loveTree';
import type { ContentOverlay } from '../i18n/contentOverlay';

/**
 * The 'loveTree' content overlay (Q18: in zh and ko the twelve statements and
 * the whole result were English). Every statement and every field of every
 * style must be translated in ja, ko and zh, under the ids the page reads,
 * with lists as long as the English (a shorter list falls back to English).
 */
const corpus = loveTreeCorpus();
const STYLES = Object.keys(ATTACHMENT_INFO) as Attachment[];
const load = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-loveTree.json'), 'utf8')) as ContentOverlay;

const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];

describe('loveTree corpus', () => {
  it('holds the twelve statements and the four styles, keyed by id', () => {
    expect(Object.keys(corpus.items)).toEqual(LOVE_TREE_QUIZ.map((i) => i.id));
    expect(Object.keys(corpus.attachment).sort()).toEqual([...STYLES].sort());
    for (const s of STYLES) expect(Object.keys(corpus.attachment[s]).sort()).toEqual([...ATTACHMENT_TEXT_FIELDS].sort());
  });

  it('an empty overlay leaves everything in English', () => {
    for (const item of LOVE_TREE_QUIZ) expect(localizeLoveTreeItem(item, {})).toBe(item.prompt);
    for (const s of STYLES) expect(localizeAttachment(s, {})).toEqual(ATTACHMENT_INFO[s]);
  });
});

describe.each(['ja', 'ko', 'zh'])('%s content-loveTree.json', (lng) => {
  const overlay = load(lng);

  it('uses only corpus paths, and covers all of them', () => {
    const known = new Set(paths(corpus));
    const have = new Set(paths(overlay));
    expect([...have].filter((p) => !known.has(p))).toEqual([]);
    expect([...known].filter((p) => !have.has(p))).toEqual([]);
  });

  it('translates every statement', () => {
    for (const item of LOVE_TREE_QUIZ) {
      const local = localizeLoveTreeItem(item, overlay);
      expect(local, item.id).not.toBe(item.prompt);
      expect(local, item.id).not.toMatch(/[A-Za-z]/);
    }
  });

  it('translates every field of every style, and keeps the tree', () => {
    for (const s of STYLES) {
      const en = ATTACHMENT_INFO[s];
      const local = localizeAttachment(s, overlay);
      for (const f of ATTACHMENT_TEXT_FIELDS) {
        const a = local[f];
        const b = en[f];
        if (Array.isArray(b)) {
          expect((a as string[]).length, `${s}.${f}`).toBe(b.length);
          (a as string[]).forEach((x, i) => expect(x, `${s}.${f}.${i}`).not.toBe(b[i]));
        } else {
          expect(a, `${s}.${f}`).not.toBe(b);
        }
      }
      expect(local.tree).toEqual(en.tree);
    }
  });

  it('keeps the house style: no exclamation mark, no Latin letters', () => {
    const all = paths(overlay).map((p) => p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], overlay) as string);
    expect(all.filter((s) => /[!！]/.test(s))).toEqual([]);
    expect(all.filter((s) => /[A-Za-z]/.test(s))).toEqual([]);
  });
});
