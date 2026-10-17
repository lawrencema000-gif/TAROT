import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

/*
 * p9 R27/R28 (RQA-3): a birth place typed but never picked from a list — the
 * OAuth onboarding saves exactly that, with lat/lon/tz null — was resolved
 * here by casting the place search's FIRST row without asking.
 * horo-autoresolve-kyoto: 京都 was cast at 23.19,116.55 (Asia/Shanghai) and
 * the profile rewritten to 'Jingdu, Shantou, Guangdong, China';
 * horo-autoresolve: 福岡 cast in Saitama. The places are now listed, and the
 * chart is cast for the one the reader picks.
 */

type Place = { lat: number; lon: number; displayName: string };
const computeChart = vi.fn(async () => ({}));
const updateProfile = vi.fn(async () => ({ error: null }));
const search = vi.fn();
const JINGDU: Place = { lat: 23.19, lon: 116.55, displayName: 'Jingdu, Shantou, Guangdong, China' };
const KYOTO: Place = { lat: 35.02, lon: 135.75, displayName: '京都市, 京都府, 日本' };
/** What the place search answers, by query; the first row is the wrong town, as it was live. */
const answers = new Map<string, { results: Place[]; error?: string }>();
const profile = { id: 'u1', birthDate: '1991-03-08', birthTime: '06:45:00', birthPlace: '京都', timezone: 'Asia/Tokyo' };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile, updateProfile }),
}));
vi.mock('../../hooks/useAstrology', async () => {
  const React = await import('react');
  return {
    // The real hook's contract: loading, then the rows (or an error) with the query they answer.
    useGeocode: () => {
      const [state, setState] = React.useState<{ results: Place[]; query: string; loading: boolean; error: string | null }>({ results: [], query: '', loading: false, error: null });
      const run = React.useCallback(async (q: string) => {
        search(q);
        setState((s) => ({ ...s, loading: true, error: null }));
        await new Promise((r) => setTimeout(r, 20));
        const a = answers.get(q) ?? { results: [] };
        setState({ results: a.results, query: q, loading: false, error: a.error ?? null });
      }, []);
      return { ...state, search: run, usedFallback: false, regionMissed: false };
    },
  };
});

import i18n from '../../i18n/config';
import { HoroscopeOnboarding } from './HoroscopeOnboarding';

// The zone lookup is a lazy chunk; loaded once here, a blind cast would land well inside `settle`.
beforeAll(async () => { await import('tz-lookup'); });
beforeEach(async () => {
  computeChart.mockClear();
  updateProfile.mockClear();
  search.mockClear();
  answers.clear();
  answers.set('京都', { results: [JINGDU, KYOTO] });
  profile.birthPlace = '京都';
  await i18n.changeLanguage('ja');
});
afterEach(() => cleanup());

/** Long enough for a blind cast (the zone lookup is a lazy chunk) to have happened. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 500)); });

describe('HoroscopeOnboarding with a typed, unpicked birth place', () => {
  it('lists the places found for it and casts nothing until one is picked — not the first row', async () => {
    render(<HoroscopeOnboarding onComplete={() => {}} computeChart={computeChart} />);
    await waitFor(() => expect(search).toHaveBeenCalledWith('京都'));
    await settle();
    expect(computeChart).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Jingdu/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /京都市/ })).toBeInTheDocument();
    // The typed text stays in the box, and the reader is asked to pick.
    expect(screen.getByDisplayValue('京都')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('app:horoscope.onboarding.selectLocationToContinue'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('app:horoscope.onboarding.computeMyChart') })).toBeDisabled();
  });

  it('casts the chart for the place picked, in its zone', async () => {
    const onComplete = vi.fn();
    render(<HoroscopeOnboarding onComplete={onComplete} computeChart={computeChart} />);
    fireEvent.click(await screen.findByRole('button', { name: /京都市/ }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:horoscope.onboarding.computeMyChart') }));
    await waitFor(() => expect(computeChart).toHaveBeenCalledTimes(1));
    expect(computeChart).toHaveBeenCalledWith(expect.objectContaining({ lat: 35.02, lon: 135.75, timezone: 'Asia/Tokyo', birthTime: '06:45:00' }));
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ birthPlace: '京都市, 京都府, 日本', birthLat: 35.02, birthLon: 135.75, birthTz: 'Asia/Tokyo' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('a typed place nothing answers says so, and casts nothing', async () => {
    profile.birthPlace = 'Atlantis';
    answers.set('Atlantis', { results: [], error: '一致する場所がありませんでした。' });
    render(<HoroscopeOnboarding onComplete={() => {}} computeChart={computeChart} />);
    expect(await screen.findByText('一致する場所がありませんでした。')).toBeInTheDocument();
    await settle();
    expect(computeChart).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Atlantis')).toBeInTheDocument();
  });
});
