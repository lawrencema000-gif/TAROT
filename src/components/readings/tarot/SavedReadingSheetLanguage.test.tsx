import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { forwardRef, type ReactNode } from 'react';

/*
 * A saved reading reopened from the Library read the deck once, in the
 * language on screen when it opened: after a switch in Settings its cards'
 * names, keywords and meanings stayed in the old language (Home's daily
 * card had the same cause, p10 d1-en-01). The deck is read again in the
 * new language, and the reading on screen follows.
 */

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: forwardRef<HTMLDivElement, { children?: ReactNode; className?: string }>(function MotionDiv({ children, className }, ref) {
      return <div ref={ref} className={className}>{children}</div>;
    }),
  },
  useReducedMotion: () => true,
}));
// The deck as the service returns it: localized, at the moment it is read, into the language on screen.
const getAllTarotCards = vi.fn();
vi.mock('../../../services/tarotCards', () => ({ getAllTarotCards: (...a: unknown[]) => getAllTarotCards(...a) }));
vi.mock('../../../utils/shareCard', () => ({ shareOrDownloadCard: async () => 'cancelled' }));

import i18n from '../../../i18n/config';
import { fullDeck } from '../../../data/tarotDeck';
import { localizeCard, localizeCards } from '../../../i18n/localizeCard';
import { SavedReadingSheet, type SavedReadingRow } from './SavedReadingSheet';
import '@testing-library/jest-dom/vitest';

const POSITIONS = ['Past', 'Present', 'Future'];
const threeCards: SavedReadingRow = {
  id: 'r-three',
  date: '2026-10-19',
  created_at: '2026-10-19T03:00:00+00:00',
  spread_type: 'three-card',
  focus_area: 'Love',
  cards: [0, 17, 40].map((cardId, i) => ({ cardId, cardName: fullDeck.find((c) => c.id === cardId)!.name, reversed: i === 1, position: POSITIONS[i] })),
};

/** The language changes under the open sheet, as the Settings sheet changes it. */
const switchTo = async (lng: 'en' | 'ja' | 'ko' | 'zh') => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

/** Each card's reading, as the sheet must print it in `lng`: its name heading and its keywords. */
async function expectReadingIn(lng: 'en' | 'ja' | 'ko' | 'zh') {
  const cards = threeCards.cards.map((row) => localizeCard(fullDeck.find((c) => c.id === row.cardId)!, lng));
  for (const card of cards) {
    expect(await screen.findByRole('heading', { level: 3, name: card.name })).toBeInTheDocument();
    for (const k of card.keywords.slice(0, 4)) expect(screen.getAllByText(k).length).toBeGreaterThan(0);
  }
  return cards.map((c) => c.name);
}

beforeEach(async () => {
  getAllTarotCards.mockReset().mockImplementation(async () => localizeCards(fullDeck));
  await switchTo('en');
});
afterEach(() => cleanup());
afterAll(async () => {
  await switchTo('en');
});

describe('a saved tarot reading follows a language change at once (p10 d1-en-01)', { timeout: 20_000 }, () => {
  it('en → ja → en: every card’s name and reading, in the language on screen', async () => {
    render(<SavedReadingSheet reading={threeCards} dateLabel="Oct 19" />);
    const en = await expectReadingIn('en');

    await switchTo('ja');
    const ja = await expectReadingIn('ja');
    for (const name of en) expect(screen.queryByRole('heading', { level: 3, name })).toBeNull();
    // The reading never left the screen for a skeleton while the deck was read again.
    expect(screen.queryByRole('status')).toBeNull();

    await switchTo('en');
    await expectReadingIn('en');
    for (const name of ja) expect(screen.queryByRole('heading', { level: 3, name })).toBeNull();
    expect(getAllTarotCards).toHaveBeenCalledTimes(3);
  });

  it('a playing-card reading reads no tarot deck, in any language', async () => {
    render(
      <SavedReadingSheet
        reading={{ id: 'r-carto', date: '2026-10-19', spread_type: 'carto-single', focus_area: 'General', cards: [{ cardId: 138, cardName: 'King of Diamonds', reversed: false, position: 'Your card', deck: 'playing' }] }}
      />,
    );
    await switchTo('ko');
    expect(getAllTarotCards).not.toHaveBeenCalled();
  });
});
