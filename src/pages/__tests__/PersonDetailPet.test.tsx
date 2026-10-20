import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * p9 Q13: a pet's page offered "Compare our charts", which opened the human
 * synastry: 'Cancer ♥ Taurus', 'Love · …', 'Work · A supportive, steady
 * team…' for the cat Miso. A pet reads by temperament, with no natal wheel
 * and no comparison; a person keeps theirs.
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

vi.mock('../../dal', () => ({
  people: { getById: vi.fn(async (id: string) => ({ ok: true, data: PEOPLE[id] })), remove: vi.fn() },
}));
vi.mock('../../components/people/personZone', () => ({ ensurePersonZone: async (p: unknown) => p }));
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: () => invoke() } } }));
vi.mock('../../hooks/useAstrology', () => ({ useInterpretations: () => null }));
vi.mock('../../components/people/PersonAIReading', () => ({ PersonAIReading: () => null }));
vi.mock('../../components/chart/ChartWheel', () => ({ ChartWheel: () => null }));
vi.mock('../../components/charts/ElementBalance', () => ({ ElementBalance: () => null }));
vi.mock('../../components/charts/AspectGrid', () => ({ AspectGrid: () => null }));

import i18n from '../../i18n/config';
import { PersonDetailPage } from '../PersonDetailPage';

function renderPerson(id: string) {
  render(
    <MemoryRouter initialEntries={[`/people/${id}`]}>
      <Routes>
        <Route path="/people/:id" element={<PersonDetailPage />} />
        <Route path="/people/:id/compare" element={<p>synastry</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const compareName = () => i18n.t('app:people.detail.compare');
const editName = () => i18n.t('app:people.detail.edit');

beforeEach(async () => {
  invoke.mockClear();
  await i18n.changeLanguage('ja');
});
afterEach(() => cleanup());

describe('PersonDetailPage actions (p9 Q13)', () => {
  it('offers a pet no chart comparison, and casts no chart for it', async () => {
    renderPerson('miso');
    expect(await screen.findByRole('button', { name: new RegExp(editName()) })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(compareName()) })).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('keeps "Compare our charts" for a person, and it opens the synastry', async () => {
    renderPerson('aki');
    const compare = await screen.findByRole('button', { name: new RegExp(compareName()) });
    fireEvent.click(compare);
    expect(await screen.findByText('synastry')).toBeInTheDocument();
  });
});
