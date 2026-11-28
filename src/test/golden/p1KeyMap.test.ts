// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WP-P1-00: the strings every decision-free P1 package reads, added once in
 * all four languages so no consumer edits a locale file in parallel. The key
 * names are final: a consumer uses exactly these.
 */

const ROOT = process.cwd();
const LOCALES = ['en', 'ja', 'ko', 'zh'] as const;

type Json = { [k: string]: Json | string | number | boolean | null | Json[] };

function load(loc: string): Json {
  return JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'locales', loc, 'app.json'), 'utf8'));
}

function flat(o: Json | Json[], prefix = '', out: Record<string, string> = {}): Record<string, string> {
  const entries = Array.isArray(o) ? o.map((v, i) => [String(i), v] as const) : Object.entries(o);
  for (const [k, v] of entries) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v as Json, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

export const P1_KEYS = [
  'spreadBuilder.positionNamePlaceholder',
  'spreadBuilder.toasts.positionRequired',
  'spreadBuilder.positionNameMissing',
  'spreadBuilder.positionMeaningMissing',
  'spreadBuilder.positionsHint',
  'readings.toasts.imageSavedLinkCopied',
  'readings.toasts.copyLink',
  'readings.toasts.linkCopied',
  'companion.replyLost',
  'companion.unanswered',
  'companion.sendAgain',
  'moonstones.costLineResend',
  'tarotCompanion.newCardConfirmBodyPending',
  'tarotCompanion.replyLost',
  'chartWheel.overlayKind.transit',
  'chartWheel.overlayKind.progressed',
  'chartWheel.overlayKind.solarReturn',
  'chartWheel.overlayKind.partner',
  'chartWheel.noAspectLines',
  'natalReport.returnMoment',
  'quizzes.flow.start',
  'quizzes.flow.whatYouGet',
  'quizzes.flow.previous',
  'quizzes.flow.leave.title',
  'quizzes.flow.leave.body',
  'quizzes.flow.leave.stay',
  'quizzes.flow.leave.leave',
  'auth.verifyingLink',
  'auth.resetLinkInvalidTitle',
  'auth.resetLinkInvalidBody',
  'auth.requestNewLink',
] as const;

const flatByLocale = Object.fromEntries(LOCALES.map((l) => [l, flat(load(l))])) as Record<
  (typeof LOCALES)[number],
  Record<string, string>
>;

describe('P1 key map (WP-P1-00)', () => {
  it('lists the 31 keys of the map', () => {
    expect(P1_KEYS).toHaveLength(31);
    expect(new Set(P1_KEYS).size).toBe(31);
  });

  for (const loc of LOCALES) {
    it(`${loc}: every key is a non-empty string`, () => {
      const missing = P1_KEYS.filter((k) => {
        const v = flatByLocale[loc][k];
        return typeof v !== 'string' || v.trim() === '';
      });
      expect(missing).toEqual([]);
    });

    it(`${loc}: the position-name placeholder carries no example`, () => {
      const v = flatByLocale[loc]['spreadBuilder.positionNamePlaceholder'] ?? '';
      expect(v).not.toMatch(/[(（]|e\.g\./);
    });
  }

  it('en carries the changed spread-builder copy', () => {
    expect(flatByLocale.en['spreadBuilder.positionNamePlaceholder']).toBe('Position name');
    expect(flatByLocale.en['spreadBuilder.toasts.positionRequired']).toBe('Add at least one position with a name.');
  });
});
