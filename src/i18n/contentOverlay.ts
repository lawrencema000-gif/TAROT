import { useEffect, useState } from 'react';
import i18n, { getLocale, type SupportedLocale } from './config';

/**
 * Static English content in ja/ko/zh: one mechanism for every data module
 * that ships prose in TypeScript (natal interpretations, the spread
 * catalogue, card enrichment, lunar mansions, Zi Wei, feng shui, daily
 * missions, …).
 *
 * English stays the TypeScript source of truth. A translation is an OVERLAY
 * — `src/i18n/locales/<lng>/content-<module>.json` — shaped like the
 * English corpus the module's localizer documents, keyed by stable ids
 * (slugs, enum values, card ids), never by English text. A string the
 * overlay lacks falls back to the English string, so an unfinished file
 * ships safely as `{}`.
 *
 * Same arrangement as `learnOverlay.ts`: not in the i18next store (so a
 * Japanese boot downloads none of it), one literal `import()` per
 * (locale, module) so Vite emits `i18n-<lng>-content-<module>-<hash>.js`,
 * fetched the first time a screen asks and memoised for the session.
 *
 * Reading it:
 *   const { overlay, ready } = useContentOverlay('mansions');
 *   ct(overlay, `${mansion.id}.meaning`, mansion.meaning)
 *   ctList(overlay, `${mansion.id}.goodFor`, mansion.goodFor)
 * Outside React (share text, AI payloads) use `loadContentOverlay` and
 * pass the result to the same helpers.
 */

export const CONTENT_MODULES = [
  'interpretations',
  'spreads',
  'enrichment',
  'mansions',
  'ziwei',
  'auspicious',
  'fengshui',
  'missions',
  'journey',
  'celestial',
  'wisdom',
  'runes',
  'pets',
  'humanDesign',
  'compat',
  'iching',
  'liuyao',
  'bazi',
  'loveTree',
  'journal',
] as const;

export type ContentModule = (typeof CONTENT_MODULES)[number];
export type ContentOverlay = Record<string, unknown>;

type LazyLocale = Exclude<SupportedLocale, 'en'>;
type Loader = () => Promise<{ default: unknown }>;

const LOADERS: Record<LazyLocale, Record<ContentModule, Loader>> = {
  ja: {
    interpretations: () => import('./locales/ja/content-interpretations.json'),
    spreads: () => import('./locales/ja/content-spreads.json'),
    enrichment: () => import('./locales/ja/content-enrichment.json'),
    mansions: () => import('./locales/ja/content-mansions.json'),
    ziwei: () => import('./locales/ja/content-ziwei.json'),
    auspicious: () => import('./locales/ja/content-auspicious.json'),
    fengshui: () => import('./locales/ja/content-fengshui.json'),
    missions: () => import('./locales/ja/content-missions.json'),
    journey: () => import('./locales/ja/content-journey.json'),
    celestial: () => import('./locales/ja/content-celestial.json'),
    wisdom: () => import('./locales/ja/content-wisdom.json'),
    runes: () => import('./locales/ja/content-runes.json'),
    pets: () => import('./locales/ja/content-pets.json'),
    humanDesign: () => import('./locales/ja/content-humanDesign.json'),
    compat: () => import('./locales/ja/content-compat.json'),
    iching: () => import('./locales/ja/content-iching.json'),
    liuyao: () => import('./locales/ja/content-liuyao.json'),
    bazi: () => import('./locales/ja/content-bazi.json'),
    loveTree: () => import('./locales/ja/content-loveTree.json'),
    journal: () => import('./locales/ja/content-journal.json'),
  },
  ko: {
    interpretations: () => import('./locales/ko/content-interpretations.json'),
    spreads: () => import('./locales/ko/content-spreads.json'),
    enrichment: () => import('./locales/ko/content-enrichment.json'),
    mansions: () => import('./locales/ko/content-mansions.json'),
    ziwei: () => import('./locales/ko/content-ziwei.json'),
    auspicious: () => import('./locales/ko/content-auspicious.json'),
    fengshui: () => import('./locales/ko/content-fengshui.json'),
    missions: () => import('./locales/ko/content-missions.json'),
    journey: () => import('./locales/ko/content-journey.json'),
    celestial: () => import('./locales/ko/content-celestial.json'),
    wisdom: () => import('./locales/ko/content-wisdom.json'),
    runes: () => import('./locales/ko/content-runes.json'),
    pets: () => import('./locales/ko/content-pets.json'),
    humanDesign: () => import('./locales/ko/content-humanDesign.json'),
    compat: () => import('./locales/ko/content-compat.json'),
    iching: () => import('./locales/ko/content-iching.json'),
    liuyao: () => import('./locales/ko/content-liuyao.json'),
    bazi: () => import('./locales/ko/content-bazi.json'),
    loveTree: () => import('./locales/ko/content-loveTree.json'),
    journal: () => import('./locales/ko/content-journal.json'),
  },
  zh: {
    interpretations: () => import('./locales/zh/content-interpretations.json'),
    spreads: () => import('./locales/zh/content-spreads.json'),
    enrichment: () => import('./locales/zh/content-enrichment.json'),
    mansions: () => import('./locales/zh/content-mansions.json'),
    ziwei: () => import('./locales/zh/content-ziwei.json'),
    auspicious: () => import('./locales/zh/content-auspicious.json'),
    fengshui: () => import('./locales/zh/content-fengshui.json'),
    missions: () => import('./locales/zh/content-missions.json'),
    journey: () => import('./locales/zh/content-journey.json'),
    celestial: () => import('./locales/zh/content-celestial.json'),
    wisdom: () => import('./locales/zh/content-wisdom.json'),
    runes: () => import('./locales/zh/content-runes.json'),
    pets: () => import('./locales/zh/content-pets.json'),
    humanDesign: () => import('./locales/zh/content-humanDesign.json'),
    compat: () => import('./locales/zh/content-compat.json'),
    iching: () => import('./locales/zh/content-iching.json'),
    liuyao: () => import('./locales/zh/content-liuyao.json'),
    bazi: () => import('./locales/zh/content-bazi.json'),
    loveTree: () => import('./locales/zh/content-loveTree.json'),
    journal: () => import('./locales/zh/content-journal.json'),
  },
};

const inflight = new Map<string, Promise<ContentOverlay>>();
const settled = new Map<string, ContentOverlay>();
const keyFor = (module: ContentModule, locale: SupportedLocale) => `${locale}:${module}`;

/**
 * The overlay for `module` in `locale`, fetched once per session. English
 * resolves to `null`. A failed fetch resolves to `{}` (the screen carries on
 * in English) rather than rejecting.
 */
export function loadContentOverlay(
  module: ContentModule,
  locale: SupportedLocale = getLocale(),
): Promise<ContentOverlay | null> {
  if (locale === 'en') return Promise.resolve(null);
  const key = keyFor(module, locale);
  const done = settled.get(key);
  if (done) return Promise.resolve(done);
  let p = inflight.get(key);
  if (!p) {
    p = LOADERS[locale][module]()
      .then((mod) => {
        const data = (mod.default ?? {}) as ContentOverlay;
        settled.set(key, data);
        return data;
      })
      .catch((err: unknown) => {
        if (import.meta.env.DEV) console.warn(`[contentOverlay] ${key} failed to load`, err);
        inflight.delete(key);
        return {};
      });
    inflight.set(key, p);
  }
  return p;
}

/** The overlay if it is already in memory: `null` for English, `undefined` while unknown. */
export function peekContentOverlay(
  module: ContentModule,
  locale: SupportedLocale = getLocale(),
): ContentOverlay | null | undefined {
  if (locale === 'en') return null;
  return settled.get(keyFor(module, locale));
}

export interface ContentOverlayState {
  overlay: ContentOverlay | null;
  /** False while the active locale's overlay is still downloading. */
  ready: boolean;
}

/**
 * The active locale's overlay for a content module, kept in step with
 * `languageChanged`. Synchronous for English and for an overlay already in
 * memory, so there is no skeleton flash on a second visit.
 */
export function useContentOverlay(module: ContentModule): ContentOverlayState {
  const [state, setState] = useState<ContentOverlayState>(() => {
    const known = peekContentOverlay(module);
    return known === undefined ? { overlay: null, ready: false } : { overlay: known, ready: true };
  });

  useEffect(() => {
    let alive = true;
    const sync = () => {
      const locale = getLocale();
      const known = peekContentOverlay(module, locale);
      if (known !== undefined) {
        setState({ overlay: known, ready: true });
        return;
      }
      setState((s) => (s.ready ? { overlay: s.overlay, ready: false } : s));
      void loadContentOverlay(module, locale).then((overlay) => {
        if (alive && getLocale() === locale) setState({ overlay, ready: true });
      });
    };
    sync();
    i18n.on('languageChanged', sync);
    return () => {
      alive = false;
      i18n.off('languageChanged', sync);
    };
  }, [module]);

  return state;
}

/** Walk a dotted path (`a.b.0.c`) through the overlay. */
function at(overlay: ContentOverlay | null | undefined, path: string): unknown {
  if (!overlay) return undefined;
  let cur: unknown = overlay;
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) cur = cur[Number(seg)];
    else if (typeof cur === 'object') cur = (cur as Record<string, unknown>)[seg];
    else return undefined;
  }
  return cur;
}

/** The translated string at `path`, or the English `fallback`. */
export function ct(overlay: ContentOverlay | null | undefined, path: string, fallback: string): string {
  const v = at(overlay, path);
  return typeof v === 'string' && v.trim() ? v : fallback;
}

/**
 * The translated list at `path` when it has the same length as the English
 * (a list that lost or gained an item is a broken translation; the English
 * is safer), else the English `fallback`.
 */
export function ctList(overlay: ContentOverlay | null | undefined, path: string, fallback: string[]): string[] {
  const v = at(overlay, path);
  return Array.isArray(v) && v.length === fallback.length && v.every((x) => typeof x === 'string' && x.trim())
    ? (v as string[])
    : fallback;
}

/**
 * Overlay the listed string / string[] fields of one entry: per field, the
 * translation when present (lists only at the same length), else English.
 */
export function ctEntry<T extends object>(
  entry: T,
  overlay: ContentOverlay | null | undefined,
  path: string,
  fields: readonly (keyof T)[],
): T {
  const tr = at(overlay, path);
  if (!tr || typeof tr !== 'object') return entry;
  const out: T = { ...entry };
  for (const f of fields) {
    const en = entry[f];
    const sub = `${path}.${String(f)}`;
    if (typeof en === 'string') out[f] = ct(overlay, sub, en) as T[typeof f];
    else if (Array.isArray(en) && en.every((x) => typeof x === 'string')) out[f] = ctList(overlay, sub, en as string[]) as T[typeof f];
  }
  return out;
}
