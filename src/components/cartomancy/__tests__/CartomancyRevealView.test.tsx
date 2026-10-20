import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The AI chip reads the member (for a balance a premium reader is never shown).
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));

import i18n from '../../../i18n/config';
import jaCommon from '../../../i18n/locales/ja/common.json';
import jaApp from '../../../i18n/locales/ja/app.json';
import { CARTO_SPREADS } from '../../../data/cartomancy/spreads';
import { PLAYING_DECK } from '../../../data/cartomancy/deck';
import { CartomancyRevealView, type CartomancyRevealViewProps } from '../CartomancyRevealView';

/*
 * p9 RQB-2: the playing-card bookmark had no saving state. The section
 * guarded a double tap by reading id, but the bookmark looked ready and
 * took taps for the whole insert; the tarot reveal's spins and waits.
 */

function props(over: Partial<CartomancyRevealViewProps> = {}): CartomancyRevealViewProps {
  const spread = CARTO_SPREADS.find((s) => s.slug === 'carto-three-timeline');
  if (!spread) throw new Error('spread missing');
  return {
    spread,
    drawnCards: PLAYING_DECK.slice(0, 3).map((card) => ({ card, reversed: false, revealed: true })),
    question: '',
    focusLabel: '',
    focus: 'general',
    allRevealed: true,
    isSaved: false,
    sharing: false,
    isPremium: true,
    cardBackUrl: null,
    significator: null,
    verdict: null,
    combinations: [],
    showAIInterpretation: false,
    aiInterpretation: null,
    loadingAI: false,
    getPositionLabel: (i) => `Position ${i + 1}`,
    localize: (card) => card,
    onBack: vi.fn(),
    onSave: vi.fn(),
    onShare: vi.fn(),
    onRevealCard: vi.fn(),
    onRevealAll: vi.fn(),
    onCardClick: vi.fn(),
    onGetAIInterpretation: vi.fn(),
    onToggleAI: vi.fn(),
    onNewReading: vi.fn(),
    ...over,
  };
}

function renderView(p: CartomancyRevealViewProps) {
  return render(
    <MemoryRouter>
      <CartomancyRevealView {...p} />
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  i18n.addResourceBundle('ja', 'common', jaCommon, true, true);
  i18n.addResourceBundle('ja', 'app', jaApp, true, true);
  await act(async () => {
    await i18n.changeLanguage('ja');
  });
});
afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('CartomancyRevealView: the bookmark while saving (p9 RQB-2)', () => {
  it('a save on its way: the bookmark spins, is busy and takes no tap', () => {
    const onSave = vi.fn();
    renderView(props({ saving: true, onSave }));
    const bookmark = screen.getByRole('button', { name: 'このリーディングを保存' });
    expect(bookmark.getAttribute('aria-busy')).toBe('true');
    expect((bookmark as HTMLButtonElement).disabled).toBe(true);
    expect(bookmark.querySelector('svg.animate-spin')).not.toBeNull();
    // Busy, not faded: the spinner shows at full strength (TarotRevealView's).
    expect(bookmark.className).toContain('disabled:opacity-100');
    fireEvent.click(bookmark);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('ready, it is a plain bookmark that saves on a tap', () => {
    const onSave = vi.fn();
    renderView(props({ onSave }));
    const bookmark = screen.getByRole('button', { name: 'このリーディングを保存' });
    expect(bookmark.getAttribute('aria-busy')).toBeNull();
    expect((bookmark as HTMLButtonElement).disabled).toBe(false);
    expect(bookmark.querySelector('svg.animate-spin')).toBeNull();
    fireEvent.click(bookmark);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('saved, it is spent: pressed, gold, and no second row', () => {
    const onSave = vi.fn();
    renderView(props({ isSaved: true, onSave }));
    const bookmark = screen.getByRole('button', { name: '保存済み' });
    expect(bookmark.getAttribute('aria-pressed')).toBe('true');
    expect((bookmark as HTMLButtonElement).disabled).toBe(true);
    expect(bookmark.className).toContain('text-gold');
    fireEvent.click(bookmark);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cards still face down: nothing to save yet', () => {
    renderView(props({ allRevealed: false }));
    expect((screen.getByRole('button', { name: 'このリーディングを保存' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
