import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

/*
 * p9 QU2 R2: Q13 took "Compare our charts" off a pet's page, but the
 * comparison itself still opened for a pet at /people/:id/compare (a link,
 * the back stack, a typed URL): a human synastry — Love, Work, composite
 * charts — cast for the cat Miso, and the viewer asked to add their own
 * birth date to compare with her. A pet's compare URL now goes to the pet's
 * page, replacing the history entry, before any chart is cast.
 */

const PEOPLE: Record<string, Record<string, unknown>> = {
  miso: { id: 'miso', userId: 'u1', name: 'Miso', relationship: 'pet', species: 'cat', birthDate: '2019-05-04', birthTime: null, birthTz: null, birthPlace: null, birthLat: null, birthLon: null, notes: null, createdAt: '2026-10-01' },
  aki: { id: 'aki', userId: 'u1', name: 'Aki', relationship: 'partner', species: null, birthDate: '1992-07-10', birthTime: '08:30', birthTz: 'Asia/Tokyo', birthPlace: 'Tokyo', birthLat: 35.68, birthLon: 139.69, notes: null, createdAt: '2026-10-01' },
};
const CHART = {
  version: 2,
  planets: [{ planet: 'Sun', sign: 'Cancer', degree: 18, house: 12, retrograde: false }],
  ascendant: null, ascendantSign: null, midheaven: null, midheavenSign: null,
  houses: [], hasHouses: false, aspects: [], elements: {}, modalities: {}, chartRuler: null, dominantPlanets: [],
};
const invoke = vi.fn(async () => ({ data: { data: { chart: CHART } }, error: null }));
const ensurePersonZone = vi.fn(async (p: unknown) => p);
let profile: Record<string, unknown> = { birthDate: '1991-03-08', birthTime: null, birthUtc: null, birthLat: null, birthLon: null, birthTz: 'Asia/Tokyo' };

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, profile }) }));
vi.mock('../../dal', () => ({ people: { getById: vi.fn(async (id: string) => ({ ok: true, data: PEOPLE[id] ?? null })) } }));
vi.mock('../../components/people/personZone', () => ({ ensurePersonZone: (p: unknown) => ensurePersonZone(p) }));
vi.mock('../../components/horoscope/birthZone', () => ({ useBirthTzBackfill: () => {}, fallbackZone: () => 'UTC' }));
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: () => invoke() } } }));
vi.mock('../../hooks/useAstrology', () => ({ useInterpretations: () => null }));
vi.mock('../../components/chart/ChartWheel', () => ({ ChartWheel: () => null }));
vi.mock('../../components/charts/AspectGrid', () => ({ AspectGrid: () => null }));

import i18n from '../../i18n/config';
import { PersonComparePage } from '../PersonComparePage';

/** Where the router is, with the browser's Back. */
function Where({ label }: { label: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <p data-testid="where">{`${label}:${location.pathname}`}</p>
      <button type="button" onClick={() => navigate(-1)}>browser-back</button>
    </>
  );
}

function renderCompare(id: string) {
  return render(
    <MemoryRouter initialEntries={['/people', `/people/${id}`, `/people/${id}/compare`]} initialIndex={2}>
      <Routes>
        <Route path="/people" element={<Where label="people" />} />
        <Route path="/people/:id" element={<Where label="detail" />} />
        <Route path="/people/:id/compare" element={<PersonComparePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  invoke.mockClear();
  ensurePersonZone.mockClear();
  profile = { birthDate: '1991-03-08', birthTime: null, birthUtc: null, birthLat: null, birthLon: null, birthTz: 'Asia/Tokyo' };
  await act(async () => { await i18n.changeLanguage('ja'); });
});
afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('PersonComparePage for a pet (QU2 R2)', () => {
  it('a pet’s compare URL goes to the pet’s page, and casts no chart', async () => {
    renderCompare('miso');
    expect(await screen.findByTestId('where')).toHaveTextContent('detail:/people/miso');
    expect(invoke).not.toHaveBeenCalled();
    expect(ensurePersonZone).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(i18n.t('app:people.compare.eyebrow', { defaultValue: 'Synastry' }));
  });

  it('the compare entry is replaced, so Back leaves the pet’s page rather than bouncing off the comparison', async () => {
    renderCompare('miso');
    expect(await screen.findByTestId('where')).toHaveTextContent('detail:/people/miso');
    // History: /people, /people/miso, /people/miso (was …/compare). Back once: the pet's page that led here.
    fireEvent.click(screen.getByRole('button', { name: 'browser-back' }));
    expect(await screen.findByTestId('where')).toHaveTextContent('detail:/people/miso');
    fireEvent.click(screen.getByRole('button', { name: 'browser-back' }));
    expect(await screen.findByTestId('where')).toHaveTextContent('people:/people');
  });

  it('even when the viewer has no birth date of their own: no "add your birth date to compare" for a pet', async () => {
    profile = { ...profile, birthDate: null };
    renderCompare('miso');
    expect(await screen.findByTestId('where')).toHaveTextContent('detail:/people/miso');
    expect(document.body.textContent).not.toContain(i18n.t('app:people.compare.needOwnBirth'));
  });

  it('a person still compares', async () => {
    renderCompare('aki');
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(i18n.t('app:people.compare.title', { name: 'Aki' }))).toBeInTheDocument();
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('a viewer with no birth date is still asked for it before comparing with a person', async () => {
    profile = { ...profile, birthDate: null };
    renderCompare('aki');
    expect(await screen.findByText(i18n.t('app:people.compare.needOwnBirth'))).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });
});
