import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor, act } from '@testing-library/react';

/*
 * p9 Q24: the Bagua reading took the first and last of a sort. With every
 * area at the default 3 (Reveal works untouched) the map showed nine 3s and
 * 整体：3.0 / 5, and still named 财富·丰盛 the area needing attention, with
 * its "depleted" reading, and 贵人·远行 the strongest, with its "thriving"
 * one (ko: 재물·풍요 / 도움·여행). A tie at either end named one area and
 * dropped the rest. Ties are named whole now, and an even map names none.
 */

const renderShareCard = vi.fn<(data: Record<string, unknown>) => Promise<Blob>>(async () => new Blob());
const shareOrDownload = vi.fn(async () => 'shared');

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: (d: Record<string, unknown>) => renderShareCard(d),
  shareOrDownload: () => shareOrDownload(),
}));

import i18n from '../../i18n/config';
import { FengShuiPage } from '../FengShuiPage';
import { computeBaguaReading, BAGUA_AREAS, BAGUA_AREA_ORDER, type BaguaArea } from '../../data/fengShuiBagua';
import zhFs from '../../i18n/locales/zh/content-fengshui.json';
import koFs from '../../i18n/locales/ko/content-fengshui.json';

const OVERLAY = { zh: zhFs, ko: koFs } as const;
const all = (n: number) => Object.fromEntries(BAGUA_AREA_ORDER.map((a) => [a, n])) as Record<BaguaArea, number>;
const rated = (over: Partial<Record<BaguaArea, number>>) => ({ ...all(3), ...over });

describe('computeBaguaReading (p9 Q24)', () => {
  it('names no area on an even map, whatever the rating', () => {
    for (const n of [1, 3, 5]) {
      const r = computeBaguaReading(all(n));
      expect(r).toMatchObject({ balanced: true, focusAreas: [], strongestAreas: [], overall: n });
    }
  });

  it('names every area tied at either end, in map order', () => {
    const r = computeBaguaReading(rated({ fame: 1, wealth: 1, career: 5, family: 5 }));
    expect(r.balanced).toBe(false);
    expect(r.focusAreas).toEqual(['wealth', 'fame']);
    expect(r.strongestAreas).toEqual(['family', 'career']);
  });

  it('names one area at each end when one stands out', () => {
    const r = computeBaguaReading(rated({ health: 2, helpers: 5 }));
    expect(r.focusAreas).toEqual(['health']);
    expect(r.strongestAreas).toEqual(['helpers']);
  });

  it('reads the map, not the order the scores were written in', () => {
    const reversed = Object.fromEntries([...BAGUA_AREA_ORDER].reverse().map((a) => [a, a === 'knowledge' || a === 'fame' ? 1 : 4])) as Record<BaguaArea, number>;
    expect(computeBaguaReading(reversed).focusAreas).toEqual(['fame', 'knowledge']);
  });
});

const reveal = () => fireEvent.click(screen.getByRole('button', { name: i18n.t('app:fengshui.reveal') }));
const areaName = (a: BaguaArea) => i18n.t(`app:fengshui.areas.${a}.name`);
function rate(area: BaguaArea, n: number) {
  const row = screen.getByText(areaName(area)).closest('div')!;
  fireEvent.click(within(row).getByRole('button', { name: String(n) }));
}

// jsdom has no scrolling (no scrollIntoView at all): every Reveal scrolls
// the result's top into view, so each call is recorded with its element.
const scrolls: Array<{ el: Element; arg: unknown }> = [];
const realScrollIntoView = Element.prototype.scrollIntoView;
beforeEach(() => {
  renderShareCard.mockClear();
  scrolls.length = 0;
  Element.prototype.scrollIntoView = function scrollIntoView(this: Element, arg?: boolean | ScrollIntoViewOptions) {
    scrolls.push({ el: this, arg });
  };
});
afterEach(() => {
  cleanup();
  Element.prototype.scrollIntoView = realScrollIntoView;
  vi.unstubAllGlobals();
});
afterAll(async () => { await i18n.changeLanguage('en'); });

describe('FengShuiPage result (p9 Q24)', () => {
  for (const lng of ['zh', 'ko'] as const) {
    it(`${lng}: Reveal untouched shows a balanced map, with no focus and no strongest`, async () => {
      await i18n.changeLanguage(lng);
      render(<FengShuiPage />);
      reveal();
      expect(await screen.findByRole('heading', { name: i18n.t('app:fengshui.balanced.title') })).toBeInTheDocument();
      expect(screen.getByText(i18n.t('app:fengshui.overallScore', { n: '3.0' }))).toBeInTheDocument();
      expect(screen.getByText(i18n.t('app:fengshui.balanced.body', { n: 3 }))).toBeInTheDocument();
      // Neither claim, in label or reading.
      expect(screen.queryByText(i18n.t('app:fengshui.focusLabel'))).toBeNull();
      expect(screen.queryByText(i18n.t('app:fengshui.strongestLabel'))).toBeNull();
      // The overlay has landed (the room list below reads it), so an absent
      // reading is absent, not merely untranslated yet.
      expect((await screen.findAllByText(OVERLAY[lng].rooms.bedroom.name)).length).toBeGreaterThan(0);
      for (const a of BAGUA_AREA_ORDER) {
        for (const text of [OVERLAY[lng].bagua[a].lowReading, OVERLAY[lng].bagua[a].highReading, BAGUA_AREAS[a].lowReading, BAGUA_AREAS[a].highReading]) {
          expect(screen.queryByText(text)).toBeNull();
        }
      }
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('app:fengshui.share')) })); });
      expect(renderShareCard.mock.calls[0][0]).toMatchObject({ title: i18n.t('app:fengshui.balanced.title'), tagline: '', affirmation: '' });
    });
  }

  it('zh: two areas tied lowest are both named, each with its remedy; the strongest is named', async () => {
    await i18n.changeLanguage('zh');
    render(<FengShuiPage />);
    rate('wealth', 1);
    rate('fame', 1);
    rate('helpers', 5);
    reveal();
    expect(await screen.findByRole('heading', { name: '财富·丰盛、名声·声誉' })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('app:fengshui.focusLabelMany'))).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(zhFs.bagua.wealth.lowReading)).toBeInTheDocument());
    expect(screen.getByText(zhFs.bagua.fame.lowReading)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: i18n.t('app:fengshui.adjustmentsLabel') })).toHaveLength(2);
    expect(screen.getByText(i18n.t('app:fengshui.strongestLabel'))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '贵人·远行' })).toBeInTheDocument();
    expect(screen.getByText(zhFs.bagua.helpers.highReading)).toBeInTheDocument();
  });

  it('zh: one area lowest reads as before, with what it governs', async () => {
    await i18n.changeLanguage('zh');
    render(<FengShuiPage />);
    rate('health', 2);
    rate('career', 4);
    reveal();
    expect(await screen.findByRole('heading', { name: areaName('health') })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('app:fengshui.focusLabel'))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: i18n.t('app:fengshui.whatItGoverns') })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(zhFs.bagua.health.lowReading)).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: areaName('career') })).toBeInTheDocument();
    expect(screen.queryByText(zhFs.bagua.wealth.lowReading)).toBeNull();
  });
});

/*
 * Pre-release pass: Reveal sits at the foot of the rating form, and the
 * result opened where the form had been scrolled to — on the annual flying
 * stars, below the map and the reading. Each stage opens at its top now.
 */
describe('FengShuiPage opens each stage at its top (pre-release)', () => {
  /** The stage's column: the element whose first child is the page title. */
  const column = (el: Element) => el.firstElementChild?.querySelector('h1')?.textContent === i18n.t('app:fengshui.title');

  it('Reveal scrolls the result’s top into view, smoothly; Rate again, the form’s', async () => {
    await i18n.changeLanguage('en');
    render(<FengShuiPage />);
    expect(scrolls).toHaveLength(0);
    reveal();
    const map = await screen.findByRole('heading', { name: i18n.t('app:fengshui.mapLabel') });
    expect(scrolls).toHaveLength(1);
    expect(scrolls[0].arg).toEqual({ block: 'start', behavior: 'smooth' });
    // The result's own column (its title, then the map), not the window's top.
    expect(column(scrolls[0].el)).toBe(true);
    expect(scrolls[0].el.contains(map)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:fengshui.reRate') }));
    const revealButton = screen.getByRole('button', { name: i18n.t('app:fengshui.reveal') });
    expect(scrolls).toHaveLength(2);
    expect(scrolls[1].arg).toEqual({ block: 'start', behavior: 'smooth' });
    expect(column(scrolls[1].el)).toBe(true);
    expect(scrolls[1].el.contains(revealButton)).toBe(true);
  });

  it('jumps instead when the reader asked for reduced motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
    await i18n.changeLanguage('en');
    render(<FengShuiPage />);
    reveal();
    expect(await screen.findByRole('heading', { name: i18n.t('app:fengshui.mapLabel') })).toBeInTheDocument();
    expect(scrolls.map((s) => s.arg)).toEqual([{ block: 'start', behavior: 'auto' }]);
  });
});
