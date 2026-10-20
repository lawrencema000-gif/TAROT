import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

/*
 * p9 R30: Edit profile saved a corrected birth date, time or place and
 * recast nothing — every Horoscope tab, the daily reading and the paid natal
 * report kept the old chart (edit-birth.mjs: 06:45 → 18:45 saved, the chart
 * stayed Pisces rising with the Moon in house 9; 18:45 is Virgo rising).
 * p9 R29: any save of a located profile — a display-name change included —
 * saved the birth-place zone without a recast, which also ended the F21
 * backfill's condition, so a chart cast in UTC stayed for good.
 *
 * Now the stored chart is checked against what was just saved, and recast
 * in the birth-place zone when it is not that chart.
 */

const OSAKA = {
  id: 'user-1', displayName: 'QA Reader', birthDate: '1991-03-08', birthTime: '06:45:00', birthPlace: 'Osaka, Japan',
  birthLat: 34.6937, birthLon: 135.5023, birthTz: 'Asia/Tokyo' as string | undefined, timezone: 'Asia/Tokyo', goals: [],
};
let profile: typeof OSAKA = { ...OSAKA };
const updateProfile = vi.fn<(u: Record<string, unknown>) => Promise<{ error: Error | null }>>(async () => ({ error: null }));
const refreshProfile = vi.fn(async () => null);
let stored: { planets: { planet: string; longitude: number }[]; ascendant: number | null } | null = null;
const recastNatalChart = vi.fn<(p: Record<string, unknown>) => Promise<{ natalChart: typeof stored }>>(async () => ({ natalChart: stored }));
const toast = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile, user: { id: 'user-1', email: 'qa@example.com' }, updateProfile, refreshProfile }),
}));
vi.mock('../../hooks/useAstrology', () => ({
  useGeocode: () => ({ results: [], query: '', loading: false, error: null, search: vi.fn(), usedFallback: false, regionMissed: false }),
  loadNatalChart: async () => (stored ? { natalChart: stored } : null),
  recastNatalChart: (p: Record<string, unknown>) => recastNatalChart(p),
}));
vi.mock('../ui', async (importOriginal) => ({ ...(await importOriginal<typeof import('../ui')>()), toast: (...a: unknown[]) => toast(...a) }));

import i18n from '../../i18n/config';
import { EditProfileForm } from './EditProfileForm';
import { castParamsFor, expectedCast, type CastParams } from '../horoscope/birthZone';

/** The chart astrology-compute-natal stores for `p` (the client's copy of its math, held to the server's in birthZone.test). */
async function chartFor(p: CastParams) {
  const { moon, ascendant } = await expectedCast(p);
  return { planets: [{ planet: 'Moon', longitude: moon }], ascendant };
}

const TOKYO_0645 = castParamsFor(OSAKA, 'Asia/Tokyo');

async function save() {
  fireEvent.click(screen.getByRole('button', { name: i18n.t('app:settings.saveChanges') }));
  await waitFor(() => expect(toast).toHaveBeenCalled(), { timeout: 4000 });
}

beforeEach(async () => {
  profile = { ...OSAKA };
  stored = await chartFor(TOKYO_0645);
  updateProfile.mockClear();
  refreshProfile.mockClear();
  recastNatalChart.mockReset();
  recastNatalChart.mockImplementation(async () => ({ natalChart: stored }));
  toast.mockClear();
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('Edit profile keeps the stored chart the chart of the profile', () => {
  it('R30: a corrected birth time is recast, after the save, in the birth place’s zone', async () => {
    render(<EditProfileForm onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:settings.editProfile.birthTime')), { target: { value: '18:45' } });
    await save();
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ birthTime: '18:45', birthTz: 'Asia/Tokyo' }));
    expect(recastNatalChart).toHaveBeenCalledTimes(1);
    expect(recastNatalChart).toHaveBeenCalledWith({ ...TOKYO_0645, birthTime: '18:45' });
    expect(updateProfile.mock.invocationCallOrder[0]).toBeLessThan(recastNatalChart.mock.invocationCallOrder[0]);
    expect(toast).toHaveBeenCalledWith('Profile updated', 'success');
  });

  it('R30: a corrected birth date is recast too', async () => {
    render(<EditProfileForm onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:settings.editProfile.birthDate')), { target: { value: '1991-03-09' } });
    await save();
    // The form saves the time as HH:MM — the same instant to the server.
    expect(recastNatalChart).toHaveBeenCalledWith({ ...TOKYO_0645, birthDate: '1991-03-09', birthTime: '06:45' });
  });

  it('R29: a display-name change on a pre-F21 account recasts its UTC chart in Asia/Tokyo', async () => {
    profile = { ...OSAKA, birthTz: undefined, timezone: 'UTC' };
    stored = await chartFor(castParamsFor(OSAKA, 'UTC'));
    render(<EditProfileForm onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:settings.editProfile.displayName')), { target: { value: 'QA Reader 2' } });
    await save();
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'QA Reader 2', birthTz: 'Asia/Tokyo' }));
    expect(recastNatalChart).toHaveBeenCalledWith({ ...TOKYO_0645, birthTime: '06:45' });
  });

  it('a save that leaves the chart right recasts nothing', async () => {
    render(<EditProfileForm onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:settings.editProfile.displayName')), { target: { value: 'QA Reader 2' } });
    await save();
    expect(recastNatalChart).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Profile updated', 'success');
  });

  it('ja: a recast that fails says the chart follows on the next Horoscope visit', async () => {
    await i18n.changeLanguage('ja');
    recastNatalChart.mockRejectedValue(new Error('offline'));
    render(<EditProfileForm onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(i18n.t('app:settings.editProfile.birthTime')), { target: { value: '18:45' } });
    await save();
    expect(toast).toHaveBeenCalledWith('プロフィールを更新しました。チャートはまだ更新できていません。次に星占いを開いたときに更新されます。', 'info');
  });
});
