import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { journalTemplates, journalTemplatesCorpus, localizeJournalTemplate, TEMPLATE_TEXT_FIELDS } from './journalTemplates';
import type { ContentOverlay } from '../i18n/contentOverlay';

/**
 * The 'journal' content overlay (Q21: every template was English in zh and
 * ko — the row, the editor's title and prompts, and the title and prompt
 * saved with the entry). Each template's title, description and every prompt
 * must be translated in ja, ko and zh, under the template's id.
 */
const corpus = journalTemplatesCorpus();
const load = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-journal.json'), 'utf8')) as ContentOverlay;

const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];

describe('journal templates', () => {
  it('have unique ids, a time in minutes, and are all in the corpus', () => {
    const ids = journalTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(corpus.templates)).toEqual(ids);
    for (const t of journalTemplates) expect(Number.isInteger(t.minutes) && t.minutes > 0, t.id).toBe(true);
  });

  it('an empty overlay leaves a template as it is', () => {
    for (const t of journalTemplates) expect(localizeJournalTemplate(t, {})).toEqual(t);
  });
});

describe.each(['ja', 'ko', 'zh'])('%s content-journal.json', (lng) => {
  const overlay = load(lng);

  it('uses only corpus paths, and covers all of them', () => {
    const known = new Set(paths(corpus));
    const have = new Set(paths(overlay));
    expect([...have].filter((p) => !known.has(p))).toEqual([]);
    expect([...known].filter((p) => !have.has(p))).toEqual([]);
  });

  it('translates every title, description and prompt, keeping the rest of the template', () => {
    for (const t of journalTemplates) {
      const local = localizeJournalTemplate(t, overlay);
      for (const f of TEMPLATE_TEXT_FIELDS) {
        if (f === 'prompts') {
          expect(local.prompts.length, t.id).toBe(t.prompts.length);
          local.prompts.forEach((p, i) => {
            expect(p, `${t.id}.prompts.${i}`).not.toBe(t.prompts[i]);
            expect(p, `${t.id}.prompts.${i}`).not.toMatch(/[A-Za-z]/);
          });
        } else {
          expect(local[f], `${t.id}.${f}`).not.toBe(t[f]);
          expect(local[f], `${t.id}.${f}`).not.toMatch(/[A-Za-z]/);
        }
      }
      expect({ ...local, title: t.title, description: t.description, prompts: t.prompts }).toEqual(t);
    }
  });

  it('carries no exclamation mark', () => {
    const all = journalTemplates.flatMap((t) => {
      const l = localizeJournalTemplate(t, overlay);
      return [l.title, l.description, ...l.prompts];
    });
    expect(all.filter((s) => /[!！]/.test(s))).toEqual([]);
  });
});
