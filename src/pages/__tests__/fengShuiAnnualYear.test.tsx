import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

/*
 * WP-P2-14 (eastern-04 / eastern-09 / eastern-18): the annual flying-star
 * chart is the solar year's, turning at the 立春 instant rather than on
 * 1 January, says until when it holds, lists the centre palace first, and
 * is recomputed on each Reveal. The Kua's year turns at the 立春 of the
 * birth, read with the profile's birth time and zone.
 */

const auth: { profile: Record<string, unknown> | null } = { profile: null };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: async () => new Blob(),
  shareOrDownload: async () => 'shared',
}));

import i18n from '../../i18n/config';
import { FengShuiPage } from '../FengShuiPage';
import { CENTRE_PALACE_NOTE } from '../../data/fengShuiAnnual';
import zhFs from '../../i18n/locales/zh/content-fengshui.json';

const TZ = process.env.TZ;
const realScrollIntoView = Element.prototype.scrollIntoView;
beforeEach(() => {
  process.env.TZ = 'Asia/Tokyo';
  vi.useFakeTimers({ toFake: ['Date'] });
  Element.prototype.scrollIntoView = function scrollIntoView() {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  process.env.TZ = TZ;
  auth.profile = null;
  Element.prototype.scrollIntoView = realScrollIntoView;
});
afterAll(async () => { await i18n.changeLanguage('en'); });

const reveal = () => fireEvent.click(screen.getByRole('button', { name: i18n.t('app:fengshui.reveal') }));
const palaces = () => Array.from(document.querySelectorAll<HTMLElement>('[data-palace]'));
const palace = (dir: string) => {
  const el = document.querySelector<HTMLElement>(`[data-palace="${dir}"]`);
  expect(el, dir).not.toBeNull();
  return el!;
};
const starN = (n: number) => i18n.t('app:fengshui.starN', { n });
const heading = (year: number) => screen.getByRole('heading', { name: i18n.t('app:fengshui.annualHeading', { year }) });

describe('FengShuiPage annual flying stars (WP-P2-14)', { timeout: 20_000 }, () => {
  it('en, 20 January 2027: the 2026 chart, the centre first, in effect until 4 February 2027', async () => {
    await i18n.changeLanguage('en');
    vi.setSystemTime(new Date('2027-01-20T01:00:00Z'));
    render(<FengShuiPage />);
    reveal();
    expect(heading(2026)).toBeInTheDocument();
    const rows = palaces();
    expect(rows.map((r) => r.dataset.palace)).toEqual(['Center', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
    const centre = rows[0];
    expect(within(centre).getByText('Centre')).toBeInTheDocument();
    expect(within(centre).getByText(new RegExp(starN(1)))).toBeInTheDocument();
    expect(within(centre).getByText(CENTRE_PALACE_NOTE)).toBeInTheDocument();
    expect(within(palace('N')).getByText('North')).toBeInTheDocument();
    expect(within(palace('N')).getByText(new RegExp(starN(6)))).toBeInTheDocument();
    expect(within(palace('S')).getByText('South')).toBeInTheDocument();
    expect(within(palace('S')).getByText(new RegExp(starN(5)))).toBeInTheDocument();
    expect(screen.getByText(/In effect until/).textContent).toContain('February 4, 2027');
  });

  it('en, 5 February 2027: the 2027 chart', async () => {
    await i18n.changeLanguage('en');
    vi.setSystemTime(new Date('2027-02-05T00:00:00Z'));
    render(<FengShuiPage />);
    reveal();
    expect(heading(2027)).toBeInTheDocument();
    expect(within(palace('N')).getByText(new RegExp(starN(5)))).toBeInTheDocument();
    expect(within(palace('Center')).getByText(new RegExp(starN(9)))).toBeInTheDocument();
  });

  it('a page left open across 立春 shows the new chart on the next Reveal', async () => {
    await i18n.changeLanguage('en');
    vi.setSystemTime(new Date('2027-02-04T01:40:00Z'));
    render(<FengShuiPage />);
    reveal();
    expect(heading(2026)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:fengshui.reRate') }));
    vi.setSystemTime(new Date('2027-02-04T01:52:00Z'));
    reveal();
    expect(heading(2027)).toBeInTheDocument();
  });

  it('zh: the until line and the centre row', async () => {
    await i18n.changeLanguage('zh');
    vi.setSystemTime(new Date('2027-01-20T01:00:00Z'));
    render(<FengShuiPage />);
    reveal();
    const until = screen.getByText(/有效至/);
    expect(until.textContent).toContain('（立春）');
    const centre = palace('Center');
    expect(within(centre).getByText('中宫')).toBeInTheDocument();
    await waitFor(() => expect(within(centre).getByText(zhFs.annual.centre.note)).toBeInTheDocument());
  });
});

describe('FengShuiPage Kua from the profile birth instant (WP-P2-14)', { timeout: 20_000 }, () => {
  it('1980-02-04 12:00 in Osaka, male: Kua 3 · Zhen · East group', async () => {
    await i18n.changeLanguage('en');
    vi.setSystemTime(new Date('2026-11-28T03:00:00Z'));
    auth.profile = { birthDate: '1980-02-04', birthTime: '12:00', birthTz: 'Asia/Tokyo' };
    render(<FengShuiPage />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:fengshui.genderLabel')), { target: { value: 'male' } });
    expect(await screen.findByText('Kua 3 · Zhen · East group')).toBeInTheDocument();
  });

  it('1980-02-05 01:30 in Osaka (after 立春), male: Kua 2 · Kun · West group', async () => {
    await i18n.changeLanguage('en');
    vi.setSystemTime(new Date('2026-11-28T03:00:00Z'));
    auth.profile = { birthDate: '1980-02-05', birthTime: '01:30', birthTz: 'Asia/Tokyo' };
    render(<FengShuiPage />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:fengshui.genderLabel')), { target: { value: 'male' } });
    expect(await screen.findByText('Kua 2 · Kun · West group')).toBeInTheDocument();
  });
});
