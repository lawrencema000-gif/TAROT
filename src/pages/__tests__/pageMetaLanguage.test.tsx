import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactElement } from 'react';

/*
 * polish 2026-11: seven pages titled the browser tab in English whatever the
 * app's language. The four learn entries read their body through the
 * translation overlay and their head from the English entry ("Amethyst —
 * Meaning, Properties & How to Use" over a Japanese page); Mirror, Zi Wei Dou
 * Shu and Unsubscribe set English literals. The title and description now
 * read in the reader's language, as the tarot card pages do
 * (TarotCardMeaningMeta.test.tsx), and English reads exactly as before. The
 * head the crawlers get is prerendered in English (scripts/prerender-meta.mjs)
 * and is not touched.
 *
 * Until a learn entry's overlay is in, the entry is English, and the title put
 * its English name beside the reader's kind: "Aries — 星座". The head is the
 * English one, whole, until then, and the reader's, whole, after.
 *
 * Nine more set English literals: the glossary, crystal and numerology hubs,
 * the lunar mansions, auspicious dates, the wishing sky, the spread library
 * and each spread (named and described as the catalogue has it), and the
 * sign-up. A gate holds every call to t() now (pageMetaTranslated.test.ts).
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: async () => ({ data: null, error: null }) } }));
// The sky's wishes and the sign-up's analytics are beside the point here.
vi.mock('../../dal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../dal')>();
  const none = async () => ({ ok: true as const, data: [] });
  return { ...actual, wishes: { ...actual.wishes, listSky: none, listEchoes: none } };
});
vi.mock('../../services/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/analytics')>()),
  trackOnboardingStepViewed: () => {},
  trackOnboardingStepCompleted: () => {},
}));

/**
 * While `on`, the learn pages read their overlay as still on its way (ready
 * false) and holding `overlay`: none on a first visit, the language before's
 * during a language change. The real hook runs underneath either way, so a
 * page can be let go of without remounting.
 */
const pending = vi.hoisted(() => ({ on: false, overlay: null as unknown }));
vi.mock('../../i18n/learnOverlay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../i18n/learnOverlay')>();
  const useLearnOverlay: typeof actual.useLearnOverlay = (module) => {
    const state = actual.useLearnOverlay(module);
    return pending.on ? { overlay: pending.overlay as typeof state.overlay, ready: false } : state;
  };
  return { ...actual, useLearnOverlay };
});

import i18n from '../../i18n/config';
import { loadLearnOverlay } from '../../i18n/learnOverlay';
import { AstrologyEntryPage } from '../AstrologyEntryPage';
import { CrystalEntryPage } from '../CrystalEntryPage';
import { GlossaryEntryPage } from '../GlossaryEntryPage';
import { NumerologyEntryPage } from '../NumerologyEntryPage';
import { MirrorPage } from '../MirrorPage';
import { ZiweiPage } from '../ZiweiPage';
import { UnsubscribePage } from '../UnsubscribePage';
import { GlossaryPage } from '../GlossaryPage';
import { CrystalsPage } from '../CrystalsPage';
import { NumerologyLearnPage } from '../NumerologyLearnPage';
import { MansionsPage } from '../MansionsPage';
import { AuspiciousDatesPage } from '../AuspiciousDatesPage';
import { WishingSkyPage } from '../WishingSkyPage';
import { SpreadsPage } from '../SpreadsPage';
import { SpreadDetailPage } from '../SpreadDetailPage';
import { OnboardingPage } from '../OnboardingPage';
import { glossaryEntries } from '../../data/glossaryLearn';
import { crystalEntries } from '../../data/crystalsLearn';

type Lng = 'en' | 'ja' | 'ko' | 'zh';
type Module = 'astrology' | 'crystals' | 'glossary' | 'numerology';

const read = (lng: string, file: string) => JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, file), 'utf8'));

const LEARN: Record<Module, { route: string; page: ReactElement }> = {
  astrology: { route: '/astrology/:slug', page: <AstrologyEntryPage /> },
  crystals: { route: '/crystals/:slug', page: <CrystalEntryPage /> },
  glossary: { route: '/glossary/:slug', page: <GlossaryEntryPage /> },
  numerology: { route: '/numerology/:slug', page: <NumerologyEntryPage /> },
};

function head() {
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
  };
}

function entry(module: Module, slug: string) {
  const { route, page } = LEARN[module];
  return (
    <MemoryRouter initialEntries={[`/${module}/${slug}`]}>
      <Routes><Route path={route} element={page} /></Routes>
    </MemoryRouter>
  );
}

/** A learn entry, once its heading is in (that is, once the overlay is). */
async function openEntry(lng: Lng, module: Module, slug: string, heading: string) {
  await act(async () => { await i18n.changeLanguage(lng); });
  render(entry(module, slug));
  // The h1 is a skeleton until the overlay is in: wait for the name itself,
  // then for the effect after that render to name the entry in the tab too.
  await screen.findByRole('heading', { level: 1, name: heading });
  await waitFor(() => expect(document.title).toContain(heading));
  return head();
}

const STATIC: Record<'mirror' | 'ziwei' | 'unsubscribe', ReactElement> = {
  mirror: <MirrorPage />,
  ziwei: <ZiweiPage />,
  unsubscribe: <UnsubscribePage />,
};

async function openStatic(lng: Lng, page: keyof typeof STATIC) {
  await act(async () => { await i18n.changeLanguage(lng); });
  render(<MemoryRouter>{STATIC[page]}</MemoryRouter>);
  return head();
}

/** The entry as the reader's language has it: its name, its kind, its one-line description. */
function localized(lng: Exclude<Lng, 'en'>, module: Module, slug: string) {
  const entry = read(lng, `learn-${module}.json`)[slug];
  const app = read(lng, 'app.json');
  if (module === 'astrology') return { name: entry.name, extra: app.learn.astrology.kinds.sign, description: entry.shortDescription };
  if (module === 'crystals') return { name: entry.name, extra: null, description: entry.shortDescription };
  if (module === 'glossary') return { name: entry.term, extra: null, description: entry.shortDefinition };
  return { name: app.learn.numerology.numberLabel.replace('{{number}}', slug), extra: null, description: entry.shortDescription };
}

const SAMPLES: Array<[Module, string, string]> = [
  ['astrology', 'aries', 'Aries'],
  ['crystals', 'amethyst', 'Amethyst'],
  ['glossary', 'major-arcana', 'Major Arcana'],
  ['numerology', '7', 'Number 7'],
];
const CJK: Array<Exclude<Lng, 'en'>> = ['ja', 'ko', 'zh'];

/** The four samples' head in English: what it read before, and what it reads until a translation is in. */
const ENGLISH: Record<Module, { title: string; description: string }> = {
  astrology: {
    title: 'Aries — Zodiac sign | Arcana',
    description: 'The pioneer — first to act, last to ask permission.',
  },
  crystals: {
    title: 'Amethyst — Meaning, Properties & How to Use | Arcana',
    description: 'A purple variety of quartz, the most widely used healing and spiritual stone in Western tradition.',
  },
  glossary: {
    title: 'Major Arcana — Definition | Arcana',
    description: 'The 22 trump cards of a tarot deck, from The Fool to The World, depicting universal life themes.',
  },
  numerology: {
    title: 'Number 7 — Life Path Meaning | Arcana',
    description: 'The seeker — the inner room, the analyst, the mystic alone.',
  },
};

/** A learn entry whose overlay is still on its way, with `held` the overlay from before (none on a first visit). */
async function openPending(lng: Lng, module: Module, slug: string, held: unknown = null) {
  await act(async () => { await i18n.changeLanguage(lng); });
  pending.on = true;
  pending.overlay = held;
  const view = render(entry(module, slug));
  await waitFor(() => expect(document.title).not.toBe(''));
  return view;
}

/** Latin letters left once the site name the title ends with, and the brand, are set aside. */
const latin = (s: string) => s.replace(/ \| Arcana$/, '').replace(/Arcana/g, '').match(/[A-Za-z]+/g) ?? [];

beforeAll(() => {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
beforeEach(() => {
  document.title = '';
  document.querySelector('meta[name="description"]')?.remove();
});
afterEach(async () => {
  cleanup();
  pending.on = false;
  pending.overlay = null;
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('the learn entries: the tab title and description', { timeout: 30_000 }, () => {
  it('English reads exactly as before', async () => {
    expect(await openEntry('en', 'astrology', 'aries', 'Aries')).toEqual(ENGLISH.astrology);
    cleanup();
    expect(await openEntry('en', 'astrology', 'mercury', 'Mercury')).toEqual({
      title: 'Mercury — Planet | Arcana',
      description: 'The mind — how you think, learn, and translate.',
    });
    cleanup();
    expect(await openEntry('en', 'crystals', 'amethyst', 'Amethyst')).toEqual(ENGLISH.crystals);
    cleanup();
    expect(await openEntry('en', 'glossary', 'major-arcana', 'Major Arcana')).toEqual(ENGLISH.glossary);
    cleanup();
    expect(await openEntry('en', 'numerology', '7', 'Number 7')).toEqual(ENGLISH.numerology);
  });

  it.each(CJK.flatMap((lng) => SAMPLES.map(([module, slug, en]) => [lng, module, slug, en] as const)))(
    '%s %s/%s: the entry named and described as the page names it',
    async (lng, module, slug, en) => {
      const want = localized(lng, module, slug);
      const { title, description } = await openEntry(lng, module, slug, want.name);
      expect(title).toContain(want.name);
      if (want.extra) expect(title).toContain(want.extra);
      expect(title).toMatch(/ \| Arcana$/);
      expect(title).not.toContain(en);
      expect(description).toBe(want.description);
    },
  );

  // Needs the polish locale delta (learn.<module>.seo.entryTitle in ja/ko/zh).
  it.each(CJK.flatMap((lng) => SAMPLES.map(([module, slug]) => [lng, module, slug] as const)))(
    '%s %s/%s: no English left in the title',
    async (lng, module, slug) => {
      const { title } = await openEntry(lng, module, slug, localized(lng, module, slug).name);
      expect(latin(title)).toEqual([]);
    },
  );

  // "Aries — 星座": the English entry's name under the reader's kind.
  it.each(CJK.flatMap((lng) => SAMPLES.map(([module, slug]) => [lng, module, slug] as const)))(
    '%s %s/%s: until the overlay is in, the head is the English one, whole',
    async (lng, module, slug) => {
      await openPending(lng, module, slug);
      expect(head()).toEqual(ENGLISH[module]);
    },
  );

  it.each(SAMPLES.map(([module, slug]) => [module, slug] as const))(
    'Japanese to Korean, %s/%s: neither the Japanese held nor a mix while the Korean loads',
    async (module, slug) => {
      const ja = await loadLearnOverlay(module, 'ja');
      await openPending('ko', module, slug, ja);
      expect(head()).toEqual(ENGLISH[module]);
    },
  );

  it('the reader’s head takes the English one’s place when the overlay comes in, on the same page', async () => {
    const view = await openPending('ja', 'crystals', 'amethyst');
    expect(head()).toEqual(ENGLISH.crystals);
    pending.on = false;
    view.rerender(entry('crystals', 'amethyst'));
    const want = localized('ja', 'crystals', 'amethyst');
    await waitFor(() => expect(document.title).toContain(want.name));
    expect(head().description).toBe(want.description);
    expect(latin(head().title)).toEqual([]);
  });
});

describe('Mirror, Zi Wei Dou Shu and Unsubscribe: the tab title and description', { timeout: 30_000 }, () => {
  it('English reads exactly as before', async () => {
    expect(await openStatic('en', 'mirror')).toEqual({
      title: 'Mirror — your reading patterns | Arcana',
      description: 'Aggregate stats from your tarot readings: most-drawn cards, suit balance, reversal rate, and streaks.',
    });
    cleanup();
    expect(await openStatic('en', 'ziwei')).toEqual({
      title: 'Zi Wei Dou Shu Chart | Arcana',
      description: 'Cast your 紫微斗数 chart — 12 palaces, 14 major stars, and the four transformations, computed from the true lunar calendar.',
    });
    cleanup();
    expect(await openStatic('en', 'unsubscribe')).toEqual({
      title: 'Unsubscribe | Arcana',
      description: 'Confirm your unsubscribe from Arcana newsletter.',
    });
  });

  // Needs the polish locale delta (mirror.meta*, ziwei.meta*, unsubscribe.meta* in ja/ko/zh).
  it.each(CJK.flatMap((lng) => (['mirror', 'ziwei', 'unsubscribe'] as const).map((page) => [lng, page] as const)))(
    '%s %s: in the reader’s language',
    async (lng, page) => {
      const { title, description } = await openStatic(lng, page);
      const app = read(lng, 'app.json');
      expect(title).toBe(`${app[page].metaTitle} | Arcana`);
      expect(description).toBe(app[page].metaDescription);
      expect(latin(title)).toEqual([]);
      expect(latin(description)).toEqual([]);
    },
  );
});

type Other = 'glossary' | 'crystals' | 'numerology' | 'mansions' | 'dates' | 'wishingSky' | 'spreads' | 'spreadDetail' | 'onboarding';

/** The nine, each at an address it answers to. The spread is the Celtic Cross. */
const OTHERS: Record<Other, { path: string; route?: string; page: ReactElement }> = {
  glossary: { path: '/glossary', page: <GlossaryPage /> },
  crystals: { path: '/crystals', page: <CrystalsPage /> },
  numerology: { path: '/numerology', page: <NumerologyLearnPage /> },
  mansions: { path: '/mansions', page: <MansionsPage /> },
  dates: { path: '/auspicious-dates', page: <AuspiciousDatesPage /> },
  wishingSky: { path: '/wishing-sky', page: <WishingSkyPage /> },
  spreads: { path: '/spreads', page: <SpreadsPage /> },
  spreadDetail: { path: '/spreads/celtic-cross', route: '/spreads/:slug', page: <SpreadDetailPage /> },
  onboarding: { path: '/signup', page: <OnboardingPage onComplete={() => {}} onSwitchToSignIn={() => {}} /> },
};
const OTHER_NAMES = Object.keys(OTHERS) as Other[];

async function openOther(lng: Lng, name: Other) {
  await act(async () => { await i18n.changeLanguage(lng); });
  const { path, route = path, page } = OTHERS[name];
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={route} element={page} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(document.title).not.toBe(''));
  return head();
}

/** What the reader's language has the nine say, from the locale files. */
function localizedOther(lng: Exclude<Lng, 'en'>, name: Other): { title: string; description: string } {
  const app = read(lng, 'app.json');
  const n = (s: string, value: number) => s.replace('{{n}}', String(value));
  switch (name) {
    case 'glossary':
      return { title: app.learn.glossary.seo.hubTitle, description: n(app.learn.glossary.seo.hubDesc, glossaryEntries.length) };
    case 'crystals':
      return { title: n(app.learn.crystals.seo.hubTitle, crystalEntries.length), description: n(app.learn.crystals.seo.hubDesc, crystalEntries.length) };
    case 'numerology':
      return { title: app.learn.numerology.seo.hubTitle, description: app.learn.numerology.seo.hubDesc };
    case 'wishingSky':
      return { title: app.wishingSky.eyebrow, description: app.wishingSky.metaDescription };
    case 'spreadDetail': {
      const spread = app.spreads.catalog['celtic-cross'];
      return {
        title: app.spreadDetail.metaTitle.replace('{{name}}', spread.name),
        description: n(app.spreadDetail.metaDescription.replace('{{description}}', spread.description), 10),
      };
    }
    case 'onboarding': {
      const { meta } = read(lng, 'onboarding.json');
      return { title: meta.title, description: meta.description };
    }
    default:
      return { title: app[name].metaTitle, description: app[name].metaDescription };
  }
}

describe('the hubs, the Eastern almanac pages, the wishing sky, the spreads and the sign-up: the tab title and description', { timeout: 30_000 }, () => {
  it('English reads exactly as before', async () => {
    const before: Record<Other, { title: string; description: string }> = {
      glossary: {
        title: 'Glossary — Tarot, Astrology, Numerology Terms | Arcana',
        description: `${glossaryEntries.length} terms with definitions across tarot, astrology, numerology, spirituality, and divination.`,
      },
      crystals: {
        title: 'Crystal Meanings — 30 Stones Explained | Arcana',
        description: 'Comprehensive crystal reference: 30 stones with metaphysical properties, chakra associations, Mohs hardness, and tarot connections.',
      },
      numerology: {
        title: 'Numerology — Life Path Numbers Explained | Arcana',
        description: 'Complete numerology reference: 9 core numbers + 3 master numbers (11, 22, 33). Pythagorean tradition, life-path meanings, tarot correspondences.',
      },
      mansions: {
        title: 'Lunar Mansions — 二十八宿 | Arcana',
        description: 'The Chinese division of the sky the Moon passes through: today’s governing mansion, and the mansion of the day you were born.',
      },
      dates: {
        title: 'Auspicious Dates — 擇日 | Arcana',
        description: 'Find a good day for a wedding, a move, a launch or a journey, read from the lunar mansions and your own birth pillars.',
      },
      wishingSky: {
        title: 'The Wishing Sky | Arcana',
        description: 'A shared sky where every wish is a star. Make a wish, and see it light up beside everyone else’s.',
      },
      spreads: {
        title: 'Tarot Spreads — Complete Library | Arcana',
        description: 'Comprehensive tarot spread library: Celtic Cross, three-card, love, career, lunar cycles, shadow work, and more. Position-by-position meanings.',
      },
      spreadDetail: {
        title: 'Celtic Cross Tarot Spread — Position Meanings | Arcana',
        description: 'The deepest classic spread — ten cards mapping every angle of a single situation. 10-card layout with position-by-position interpretation.',
      },
      onboarding: {
        title: 'Sign up — Free 3-day trial | Arcana',
        description: 'Create your free Arcana account. Daily tarot readings, personalized horoscopes, journaling, and a 3-day free trial of Premium.',
      },
    };
    for (const name of OTHER_NAMES) {
      expect(await openOther('en', name), name).toEqual(before[name]);
      cleanup();
      document.title = '';
    }
  });

  // Needs the polish titles2 locale delta.
  it.each(CJK.flatMap((lng) => OTHER_NAMES.map((name) => [lng, name] as const)))('%s %s: in the reader’s language', async (lng, name) => {
    const want = localizedOther(lng, name);
    const { title, description } = await openOther(lng, name);
    expect(title).toBe(`${want.title} | Arcana`);
    expect(description).toBe(want.description);
    expect(latin(title)).toEqual([]);
    expect(latin(description)).toEqual([]);
  });

  // The sign-up's first step is the language picker: the tab follows what it picks, and so do the others.
  it.each(OTHER_NAMES)('%s: a language changed on the page rewrites the head', async (name) => {
    await openOther('en', name);
    await act(async () => { await i18n.changeLanguage('ja'); });
    await waitFor(() => expect(document.title).toBe(`${localizedOther('ja', name).title} | Arcana`));
    expect(head().description).toBe(localizedOther('ja', name).description);
  });

  it('a spread’s head rewritten in another language does not take the reader back to the top', async () => {
    const scrolls = vi.fn();
    window.scrollTo = scrolls as unknown as typeof window.scrollTo;
    await openOther('en', 'spreadDetail');
    expect(scrolls).toHaveBeenCalledTimes(1);
    await act(async () => { await i18n.changeLanguage('ja'); });
    await waitFor(() => expect(document.title).toBe(`${localizedOther('ja', 'spreadDetail').title} | Arcana`));
    expect(scrolls).toHaveBeenCalledTimes(1);
  });
});
