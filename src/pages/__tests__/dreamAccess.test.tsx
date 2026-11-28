import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * D15 = A (WP-P1-10): Moonstones open the Dream interpreter, Premium keeps it
 * included. The Dream page already gates the balance and shows the 50-Moonstone
 * cost line, and ai-dream-interpret already debits a free member 50 a reading
 * (dreamCompatPaid.test.tsx). The Readings grid used to lock Dreams behind
 * Premium, so free members could never reach that price. Now every member
 * opens Dreams from the grid and through `{ tab: 'dream' }`.
 *
 * Human Design and Partner keep their Premium lock in the grid until
 * WP-P2-11 and WP-P2-03 are verified on production (D15 step A4, moved to
 * WP-P3-09). Bazi is Premium-only end to end and outside D15.
 */

const h = vi.hoisted(() => ({ isPremium: false }));

vi.mock('../../components/readings', () => ({
  TarotSection: () => <p>tarot section</p>,
  HoroscopeSection: () => <p>horoscope section</p>,
  CompatibilitySection: () => <p>compatibility section</p>,
  LibrarySection: () => <p>library section</p>,
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { isPremium: h.isPremium } }),
}));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => true }));
vi.mock('../../components/premium/PaywallSheet', () => ({
  PaywallSheet: ({ open, feature }: { open: boolean; feature: string }) =>
    open ? (
      <div role="dialog" aria-label="paywall">
        {feature}
      </div>
    ) : null,
}));
vi.mock('../DreamInterpreterPage', () => ({ DreamInterpreterPage: () => <p>dream page</p> }));
vi.mock('../HumanDesignPage', () => ({ HumanDesignPage: () => <p>human design page</p> }));
vi.mock('../PartnerCompatPage', () => ({ PartnerCompatPage: () => <p>partner page</p> }));
vi.mock('../BaziPage', () => ({ BaziPage: () => <p>bazi page</p> }));

import i18n from '../../i18n/config';
import { ReadingsPage } from '../ReadingsPage';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  h.isPremium = false;
});

type Entry = string | { pathname: string; state: unknown };

const mountReadings = (entry: Entry = '/readings') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ReadingsPage />
    </MemoryRouter>,
  );

const openSystemsTab = () => fireEvent.click(screen.getByRole('tab', { name: 'More systems' }));

/** The grid row (its list item) whose label is `label`. */
const row = (label: string) => {
  const item = screen.getAllByRole('listitem').find((li) => within(li).queryByText(label));
  if (!item) throw new Error(`no row ${label}`);
  return item;
};
const pressRow = (label: string) => fireEvent.click(within(row(label)).getAllByRole('button')[0]);

describe('Dreams opens for every member (D15 A)', () => {
  it('a free member sees Dreams without a Premium badge and opens the page, no paywall', async () => {
    mountReadings();
    openSystemsTab();
    expect(within(row('Dreams')).queryByText('Premium')).toBeNull();
    pressRow('Dreams');
    expect(await screen.findByText('dream page')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'paywall' })).toBeNull();
  });

  it('a Premium member opens the page', async () => {
    h.isPremium = true;
    mountReadings();
    openSystemsTab();
    expect(within(row('Dreams')).queryByText('Premium')).toBeNull();
    pressRow('Dreams');
    expect(await screen.findByText('dream page')).toBeTruthy();
  });

  it("{ tab: 'dream' } deep-links straight to the page for a free member", async () => {
    mountReadings({ pathname: '/readings', state: { tab: 'dream' } });
    expect(await screen.findByText('dream page')).toBeTruthy();
    expect(screen.queryByText('tarot section')).toBeNull();
  });
});

describe('systems that stay Premium-only in the grid', () => {
  it('Bazi still shows Premium and opens the paywall for a free member', () => {
    mountReadings();
    openSystemsTab();
    expect(within(row('Bazi')).getByText('Premium')).toBeTruthy();
    pressRow('Bazi');
    expect(screen.getByRole('dialog', { name: 'paywall' }).textContent).toBe('Bazi');
    expect(screen.queryByText('bazi page')).toBeNull();
  });

  // D15 step A4 waits for WP-P2-11 / WP-P2-03 on production (moved to WP-P3-09).
  it.each(['Human Design', 'Partner'])('%s keeps its Premium lock until step A4 ships', (label) => {
    mountReadings();
    openSystemsTab();
    expect(within(row(label)).getByText('Premium')).toBeTruthy();
    pressRow(label);
    expect(screen.getByRole('dialog', { name: 'paywall' }).textContent).toBe(label);
  });

  it('a deep link to a Premium system still lands on tarot', () => {
    mountReadings({ pathname: '/readings', state: { tab: 'bazi' } });
    expect(screen.getByText('tarot section')).toBeTruthy();
  });
});
