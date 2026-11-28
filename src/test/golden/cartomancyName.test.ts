// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WP-NF-01: the playing-card section is named after the practice, not the
 * deck. Owner request (2026-11-17): "change the card reading name to
 * Cartomancy". Decisions NF-D1 (the word in each language) and NF-D2 (what
 * keeps "playing card": the search titles and the line above the hub's title).
 */

const ROOT = process.cwd();
const LOCALES = join(ROOT, 'src', 'i18n', 'locales');
const LANGS = ['en', 'ja', 'ko', 'zh'] as const;
type Lang = (typeof LANGS)[number];

const NAME: Record<Lang, string> = {
  en: 'Cartomancy',
  ja: 'トランプ占い',
  ko: '트럼프 카드 점',
  zh: '扑克牌占卜',
};

type Tree = { [k: string]: unknown };

function load(lang: Lang, ns: 'app' | 'common'): Tree {
  return JSON.parse(readFileSync(join(LOCALES, lang, `${ns}.json`), 'utf8')) as Tree;
}

function get(tree: Tree, path: string): unknown {
  let node: unknown = tree;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Tree)[part];
  }
  return node;
}

function flat(node: unknown, prefix: string, out: Array<[string, string]>): Array<[string, string]> {
  if (typeof node === 'string') out.push([prefix, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => flat(v, `${prefix}.${i}`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flat(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

function source(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/** English may say "playing card" only where it explains the deck or is searched. */
const ALLOWED = new Set([
  'app:cartomancy.eyebrow',
  'app:cartomancy.seo.cardDesc',
  'app:cartomancy.seo.cardTitle',
  'app:cartomancy.seo.cardsDesc',
  'app:cartomancy.seo.cardsTitle',
  'app:cartomancy.seo.guideTitle',
  'app:cartomancy.seo.hubTitle',
  'app:cartomancy.seo.lessonTitle',
]);
const isAllowed = (key: string) => ALLOWED.has(key) || /^app:cartomancy\.seo\.[^.]*Desc$/.test(key);

describe('the playing-card section is called Cartomancy (WP-NF-01)', () => {
  for (const lang of LANGS) {
    it(`${lang}: the section's name is ${NAME[lang]} in the menu, the tab, the hub and the deck choice`, () => {
      const app = load(lang, 'app');
      const common = load(lang, 'common');
      expect(get(common, 'nav.cartomancy')).toBe(NAME[lang]);
      expect(get(app, 'readings.tabs.cartomancy')).toBe(NAME[lang]);
      expect(get(app, 'cartomancy.title')).toBe(NAME[lang]);
      expect(get(app, 'quickReading.deckPlaying')).toBe(NAME[lang]);
    });
  }

  it('en: the line above the hub title explains the deck', () => {
    expect(get(load('en', 'app'), 'cartomancy.eyebrow')).toBe('Reading with playing cards');
  });

  it('en: "playing card" appears only in the allow-listed keys', () => {
    const hits = [
      ...flat(load('en', 'app'), '', []).map(([k, v]) => [`app:${k}`, v] as const),
      ...flat(load('en', 'common'), '', []).map(([k, v]) => [`common:${k}`, v] as const),
    ]
      .filter(([, v]) => /\bplaying[- ]cards?\b/i.test(v))
      .map(([k]) => k)
      .filter((k) => !isAllowed(k));
    expect(hits).toEqual([]);
  });

  for (const lang of ['ja', 'ko', 'zh'] as const) {
    it(`${lang}: the paywall lines name the section`, () => {
      const app = load(lang, 'app');
      expect(String(get(app, 'premium.paywall.byFeature.unlimitedReadings.outcome'))).toContain(NAME[lang]);
      expect(String(get(app, 'premium.paywall.unlocks.everySpread.desc'))).toContain(NAME[lang]);
      expect(String(get(app, 'premium.paywall.subheadingEverySpread'))).toContain(NAME[lang]);
    });
  }

  it('the owned sources name the section Cartomancy in their English fallbacks', () => {
    expect(source('src/pages/CartomancyCardPage.tsx')).toMatch(/position: 2, name: 'Cartomancy'/);
    expect(source('src/components/layout/BottomNav.tsx')).toContain("defaultLabel: 'Cartomancy'");
    for (const rel of [
      'src/components/layout/BottomNav.tsx',
      'src/pages/CartomancyPage.tsx',
      'src/pages/CartomancyReadingPage.tsx',
      'src/pages/CartomancyCardPage.tsx',
      'src/pages/CartomancyGuidePage.tsx',
    ]) {
      expect(source(rel), rel).not.toMatch(/'Playing cards'/);
      expect(source(rel), rel).not.toMatch(/defaultValue: 'Playing card reading'/);
    }
  });
});
