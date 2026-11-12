import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * The Readings page's own tab strip. Another tab unmounts the section on
 * screen, so a tarot reveal with a bought AI interpretation it had not saved
 * was dropped without a word — the bottom bar and Android Back ask first
 * (leaveGuard), and the strip now does too. The sections are stand-ins: the
 * tarot one holds the step, as TarotSection does in that state
 * (TarotLeaveConfirm drives the real sheet).
 */

const h = vi.hoisted(() => ({ holds: true, held: [] as Array<() => void> }));

vi.mock('../../components/readings', async () => {
  const { useLeaveGuard } = await import('../../context/leaveGuard');
  return {
    TarotSection: () => {
      useLeaveGuard((leave) => {
        if (!h.holds) return false;
        h.held.push(leave);
        return true;
      });
      return <p>tarot section</p>;
    },
    HoroscopeSection: () => <p>horoscope section</p>,
    CompatibilitySection: () => <p>compatibility section</p>,
    LibrarySection: () => <p>library section</p>,
  };
});
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: { isPremium: false } }) }));
vi.mock('../../components/premium/PaywallSheet', () => ({ PaywallSheet: () => null }));

import i18n from '../../i18n/config';
import { ReadingsPage } from '../ReadingsPage';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  h.held.length = 0;
  h.holds = true;
});

const mountReadings = () =>
  render(
    <MemoryRouter initialEntries={['/readings']}>
      <ReadingsPage />
    </MemoryRouter>,
  );

describe('the Readings tab strip asks before it drops a reading that would lose something', () => {
  it('another tab is held until the reading says go, then opens', () => {
    mountReadings();
    expect(screen.getByText('tarot section')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Horoscope' }));
    expect(h.held).toHaveLength(1);
    expect(screen.getByText('tarot section')).toBeTruthy();
    expect(screen.queryByText('horoscope section')).toBeNull();

    act(() => h.held[0]());
    expect(screen.getByText('horoscope section')).toBeTruthy();
    expect(screen.queryByText('tarot section')).toBeNull();
  });

  it('the tab already on screen leaves nothing and asks nothing', () => {
    mountReadings();
    fireEvent.click(screen.getByRole('tab', { name: 'Tarot' }));
    expect(h.held).toHaveLength(0);
    expect(screen.getByText('tarot section')).toBeTruthy();
  });

  it('a reading with nothing to lose lets the tab go at once', () => {
    h.holds = false;
    mountReadings();
    fireEvent.click(screen.getByRole('tab', { name: 'Library' }));
    expect(h.held).toHaveLength(0);
    expect(screen.getByText('library section')).toBeTruthy();
  });
});
