import { useEffect, useState } from 'react';
import i18n, { getLocale, type SupportedLocale } from './config';
import { localizePlanetName, localizeSignName } from './localizeNames';
import { PLANETS, ZODIAC_SIGNS, type Planet, type ZodiacSign } from '../types/astrology';
import type { AstroEntry } from '../data/astrologyLearn';
import type { NumerologyEntry } from '../data/numerologyLearn';
import type { GlossaryEntry } from '../data/glossaryLearn';
import type { CrystalEntry } from '../data/crystalsLearn';

/**
 * The learn library (astrology, numerology, glossary, crystals) in ja/ko/zh.
 *
 * English stays the TypeScript source of truth: schema, enums, numbers,
 * `relatedEntries`, `pairsWith`, the slugs. A translation is an OVERLAY of
 * prose fields keyed by slug — `src/i18n/locales/<lng>/learn-<module>.json`
 * — the same shape the tarot corpus takes (`localizeCard.ts`), so a field
 * the translation lacks falls back to the English per field, never per
 * entry, and an unfinished file ships safely as `{}`.
 *
 * The overlays are NOT in the i18next store. Together they are 25–60 KB gz
 * per module per locale; putting them in `LAZY_BUNDLES` would pull all four
 * into every Japanese boot. Each is its own dynamic import below (a literal
 * `import()` per pair so Vite emits `assets/i18n-ja-learn-astrology-<hash>.js`;
 * vite.config.ts keeps `learn-*` out of the locale preload script), fetched
 * the first time a learn page renders in that language and memoised for the
 * session. English resolves synchronously to `null`.
 *
 * Pages read it through `useLearnOverlay(module)`: `ready` is false while a
 * fetch is in flight (show a skeleton), the overlay re-fetches on
 * `languageChanged`, and `localize*Entry(entry, overlay)` applies it.
 */

export type LearnModule = 'astrology' | 'numerology' | 'glossary' | 'crystals';

type LazyLocale = Exclude<SupportedLocale, 'en'>;

// ── Overlay shapes: the prose fields of each entry, all optional ─────────

export const ASTRO_PROSE_FIELDS = [
  'name',
  'shortDescription',
  'longDescription',
  'keywords',
  'dates',
  'bodyPart',
  'domain',
  'inLove',
  'inCareer',
  'inSpirituality',
  'strengths',
  'challenges',
  'famousExamples',
  'faqs',
] as const satisfies readonly (keyof AstroEntry)[];

export const NUMEROLOGY_PROSE_FIELDS = [
  'shortDescription',
  'longDescription',
  'keywords',
  'personality',
  'strengths',
  'challenges',
  'inLove',
  'inCareer',
  'inSpirituality',
  'inHealth',
  'lifePathExplanation',
  'tarotMajorArcana',
  'tarotConnection',
  'famousExamples',
  'faqs',
] as const satisfies readonly (keyof NumerologyEntry)[];

/** `pronunciation` is English phonetics and is omitted for CJK, not translated. */
export const GLOSSARY_PROSE_FIELDS = [
  'term',
  'shortDefinition',
  'longDefinition',
  'origin',
  'alsoKnownAs',
  'example',
] as const satisfies readonly (keyof GlossaryEntry)[];

export const CRYSTAL_PROSE_FIELDS = [
  'name',
  'color',
  'shortDescription',
  'longDescription',
  'keywords',
  'metaphysicalProperties',
  'inLove',
  'inHealing',
  'inSpirituality',
  'howToUse',
  'cleansingMethods',
  'tarotConnection',
  'faqs',
] as const satisfies readonly (keyof CrystalEntry)[];

export type AstroOverlayEntry = Partial<Pick<AstroEntry, (typeof ASTRO_PROSE_FIELDS)[number]>>;
export type NumerologyOverlayEntry = Partial<Pick<NumerologyEntry, (typeof NUMEROLOGY_PROSE_FIELDS)[number]>>;
export type GlossaryOverlayEntry = Partial<Pick<GlossaryEntry, (typeof GLOSSARY_PROSE_FIELDS)[number]>>;
export type CrystalOverlayEntry = Partial<Pick<CrystalEntry, (typeof CRYSTAL_PROSE_FIELDS)[number]>>;

export interface LearnOverlays {
  astrology: Record<string, AstroOverlayEntry>;
  numerology: Record<string, NumerologyOverlayEntry>;
  glossary: Record<string, GlossaryOverlayEntry>;
  crystals: Record<string, CrystalOverlayEntry>;
}

export type LearnOverlay<M extends LearnModule> = LearnOverlays[M];

// ── Loaders: one literal import() per (locale, module) ───────────────────

type Loader = () => Promise<{ default: unknown }>;

const LOADERS: Record<LazyLocale, Record<LearnModule, Loader>> = {
  ja: {
    astrology: () => import('./locales/ja/learn-astrology.json'),
    numerology: () => import('./locales/ja/learn-numerology.json'),
    glossary: () => import('./locales/ja/learn-glossary.json'),
    crystals: () => import('./locales/ja/learn-crystals.json'),
  },
  ko: {
    astrology: () => import('./locales/ko/learn-astrology.json'),
    numerology: () => import('./locales/ko/learn-numerology.json'),
    glossary: () => import('./locales/ko/learn-glossary.json'),
    crystals: () => import('./locales/ko/learn-crystals.json'),
  },
  zh: {
    astrology: () => import('./locales/zh/learn-astrology.json'),
    numerology: () => import('./locales/zh/learn-numerology.json'),
    glossary: () => import('./locales/zh/learn-glossary.json'),
    crystals: () => import('./locales/zh/learn-crystals.json'),
  },
};

const inflight = new Map<string, Promise<Record<string, unknown>>>();
const settled = new Map<string, Record<string, unknown>>();

const keyFor = (module: LearnModule, locale: SupportedLocale) => `${locale}:${module}`;

/**
 * The overlay for `module` in `locale`, fetched once per session. English
 * resolves to `null`. A failed fetch resolves to `{}` (the page carries on in
 * English) rather than rejecting: a translation is never worth a blank screen.
 */
export function loadLearnOverlay<M extends LearnModule>(
  module: M,
  locale: SupportedLocale = getLocale(),
): Promise<LearnOverlay<M> | null> {
  if (locale === 'en') return Promise.resolve(null);
  const key = keyFor(module, locale);
  const done = settled.get(key);
  if (done) return Promise.resolve(done as LearnOverlay<M>);
  let p = inflight.get(key);
  if (!p) {
    p = LOADERS[locale][module]()
      .then((mod) => {
        const data = (mod.default ?? {}) as Record<string, unknown>;
        settled.set(key, data);
        return data;
      })
      .catch((err: unknown) => {
        if (import.meta.env.DEV) console.warn(`[learnOverlay] ${key} failed to load`, err);
        inflight.delete(key);
        return {};
      });
    inflight.set(key, p);
  }
  return p as Promise<LearnOverlay<M>>;
}

/** The overlay if it is already in memory: `null` for English, `undefined` while unknown. */
export function peekLearnOverlay<M extends LearnModule>(
  module: M,
  locale: SupportedLocale = getLocale(),
): LearnOverlay<M> | null | undefined {
  if (locale === 'en') return null;
  return settled.get(keyFor(module, locale)) as LearnOverlay<M> | undefined;
}

export interface LearnOverlayState<M extends LearnModule> {
  overlay: LearnOverlay<M> | null;
  /** False while the active locale's overlay is still downloading. */
  ready: boolean;
}

/**
 * The active locale's overlay for a learn module, kept in step with
 * `languageChanged`. Synchronous for English and for an overlay already in
 * memory, so there is no skeleton flash on the second visit.
 */
export function useLearnOverlay<M extends LearnModule>(module: M): LearnOverlayState<M> {
  const [state, setState] = useState<LearnOverlayState<M>>(() => {
    const known = peekLearnOverlay(module);
    return known === undefined ? { overlay: null, ready: false } : { overlay: known, ready: true };
  });

  useEffect(() => {
    let alive = true;
    const sync = () => {
      const locale = getLocale();
      const known = peekLearnOverlay(module, locale);
      if (known !== undefined) {
        setState({ overlay: known, ready: true });
        return;
      }
      setState((s) => (s.ready ? { overlay: s.overlay, ready: false } : s));
      void loadLearnOverlay(module, locale).then((overlay) => {
        // A language change while this was in flight starts its own sync.
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

// ── Localizers: per-field `??` fallback onto the English source ──────────

function overlayFields<T extends object>(entry: T, tr: Partial<T> | undefined, fields: readonly (keyof T)[]): T {
  if (!tr) return entry;
  const out: T = { ...entry };
  for (const f of fields) {
    const v = tr[f];
    if (v !== undefined && v !== null) out[f] = v as T[typeof f];
  }
  return out;
}

export function localizeAstroEntry(entry: AstroEntry, overlay: LearnOverlay<'astrology'> | null): AstroEntry {
  return overlayFields<AstroEntry>(entry, overlay?.[entry.slug], ASTRO_PROSE_FIELDS);
}

export function localizeNumerologyEntry(
  entry: NumerologyEntry,
  overlay: LearnOverlay<'numerology'> | null,
): NumerologyEntry {
  return overlayFields<NumerologyEntry>(entry, overlay?.[entry.slug], NUMEROLOGY_PROSE_FIELDS);
}

export function localizeGlossaryEntry(entry: GlossaryEntry, overlay: LearnOverlay<'glossary'> | null): GlossaryEntry {
  return overlayFields<GlossaryEntry>(entry, overlay?.[entry.slug], GLOSSARY_PROSE_FIELDS);
}

export function localizeCrystalEntry(entry: CrystalEntry, overlay: LearnOverlay<'crystals'> | null): CrystalEntry {
  return overlayFields<CrystalEntry>(entry, overlay?.[entry.slug], CRYSTAL_PROSE_FIELDS);
}

// ── Enums and names: the fields the overlay does not carry ───────────────
//
// Elements, modalities, planet types, aspect natures and chakras are enum
// values the code switches on, so they stay English in the data and are
// labelled through `app:learn.enums.*`. Sign and planet names reuse the
// tables in localizeNames.ts. Everything falls back to the English value.

type LearnEnumGroup = 'elements' | 'modalities' | 'planetTypes' | 'aspectNatures' | 'chakras';

const ENUM_DEFAULTS: Record<LearnEnumGroup, Record<string, string>> = {
  elements: { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water', spirit: 'Spirit' },
  modalities: { cardinal: 'Cardinal', fixed: 'Fixed', mutable: 'Mutable' },
  planetTypes: { personal: 'Personal', social: 'Social', transpersonal: 'Transpersonal', luminary: 'Luminary' },
  aspectNatures: { harmonious: 'Harmonious', challenging: 'Challenging', neutral: 'Neutral' },
  chakras: {
    root: 'Root',
    sacral: 'Sacral',
    solarPlexus: 'Solar plexus',
    heart: 'Heart',
    throat: 'Throat',
    thirdEye: 'Third eye',
    crown: 'Crown',
  },
};

/** 'Solar Plexus' → 'solarPlexus', 'Fire' → 'fire', 'personal' → 'personal'. */
function enumKey(value: string): string {
  const words = value.trim().split(/\s+/);
  return words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))).join('');
}

/** The display label of a learn-library enum value in the active language. */
export function learnEnumLabel(group: LearnEnumGroup, value: string | undefined | null): string {
  if (!value) return '';
  const key = enumKey(value);
  const fallback = ENUM_DEFAULTS[group][key] ?? value;
  return i18n.t(`app:learn.enums.${group}.${key}`, { defaultValue: fallback }) as string;
}

export function learnSignName(name: string | undefined | null): string {
  if (!name) return '';
  return (ZODIAC_SIGNS as readonly string[]).includes(name) ? localizeSignName(name as ZodiacSign) : name;
}

export function learnPlanetName(name: string | undefined | null): string {
  if (!name) return '';
  return (PLANETS as readonly string[]).includes(name) ? localizePlanetName(name as Planet) : name;
}
