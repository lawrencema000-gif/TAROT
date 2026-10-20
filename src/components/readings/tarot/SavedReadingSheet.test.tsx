import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, act, within } from '@testing-library/react';
import { forwardRef, type ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Celtic Cross's flip reads reduced motion; nothing here animates.
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

// The deck arrives when the test says so (it is a ~1 MB fetch in the app).
let resolveDeck: (cards: unknown[]) => void = () => {};
vi.mock('../../../services/tarotCards', () => ({
  getAllTarotCards: () => new Promise((resolve) => (resolveDeck = resolve)),
}));

// The share image: a render that takes a while, then the OS sheet.
const shareCalls: Array<{ opts: Record<string, unknown>; text: string }> = [];
vi.mock('../../../utils/shareCard', () => ({
  shareOrDownloadCard: (opts: Record<string, unknown>, _file: string, text: string) => {
    shareCalls.push({ opts, text });
    return new Promise((resolve) => setTimeout(() => resolve('shared'), 50));
  },
}));

import i18n from '../../../i18n/config';
import { ToastContainer } from '../../ui';
import { fullDeck } from '../../../data/tarotDeck';
import { decodeReading } from '../../../services/shareableReadings';
import { SavedReadingSheet, type SavedReadingRow } from './SavedReadingSheet';

/**
 * A saved reading reopened from the Library, through the real sheet and the
 * real locale files: the Celtic Cross is laid as a cross from the first
 * frame (O#42); a playing-card reading reads as the live result read it —
 * no sentence twice (F17), a five-card Yes or No numbered (F18), the Wish's
 * verdict translated (F12) — and either kind shares once per tap, with the
 * link the reveal sends (F58, F75).
 */

const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `${ns}.json`), 'utf8'));

beforeAll(async () => {
  for (const ns of ['app', 'common', 'cartomancy', 'tarot']) i18n.addResourceBundle('ja', ns, read('ja', ns), true, true);
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  shareCalls.length = 0;
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

const playing = (cardId: number, cardName: string, position: string, reversed = false) => ({ cardId, cardName, reversed, position, deck: 'playing' as const });

const yesNoFive: SavedReadingRow = {
  id: 'r-yes-no',
  date: '2026-10-16',
  created_at: '2026-10-16T03:00:00+00:00',
  spread_type: 'carto-yes-no',
  focus_area: 'General',
  question: 'Should I send the message?',
  cards: [
    playing(129, 'Four of Diamonds', 'Card 1'),
    playing(151, 'King of Spades', 'Card 2'),
    playing(101, 'Two of Hearts', 'Card 3'),
    playing(119, 'Seven of Clubs', 'Card 4'),
    playing(111, 'Queen of Hearts', 'Card 5'),
  ],
};

const wish: SavedReadingRow = {
  id: 'r-wish',
  date: '2026-10-15',
  spread_type: 'carto-wish',
  focus_area: 'Love',
  cards: [113, 114, 128, 116, 108, 131, 119, 133, 109].map((id, i) => playing(id, `card ${id}`, `p${i}`)),
};

const kingAlone: SavedReadingRow = {
  id: 'r-single',
  date: '2026-10-14',
  spread_type: 'carto-single',
  focus_area: 'General',
  cards: [playing(138, 'King of Diamonds', 'Your card')],
};

const CELTIC = ['Present situation', 'Challenge or obstacle', 'Subconscious influences', 'Recent past', 'Best possible outcome', 'Near future', 'Your attitude', 'External influences', 'Hopes and fears', 'Final outcome'];
const celtic: SavedReadingRow = {
  id: 'r-celtic',
  date: '2026-10-13',
  created_at: '2026-10-13T03:00:00+00:00',
  spread_type: 'celtic-cross',
  focus_area: 'Career',
  cards: ['The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit'].map(
    (cardName, i) => ({ cardId: i, cardName, reversed: i === 3, position: CELTIC[i] }),
  ),
};
const legacyCeltic: SavedReadingRow = {
  ...celtic,
  id: 'r-legacy',
  cards: ['Ace of Cups', 'Two of Swords', 'The Star', 'Six of Wands', 'The Sun', 'Page of Pentacles', 'Knight of Cups', 'Death', 'Temperance', 'A card that is not in the deck'].map(
    (cardName, i) => ({ cardName, reversed: false, position: CELTIC[i] }),
  ),
};

describe('a saved Celtic Cross (O#42)', () => {
  it('is laid as the cross from the first frame, before the deck has arrived, and never as the glyph table', async () => {
    const { container } = render(<SavedReadingSheet reading={celtic} dateLabel="Oct 13" />);
    // the cross and the staff, all ten faces drawn from the row, the reading still on its way
    expect(screen.getByText('The cross and the staff')).toBeInTheDocument();
    for (const name of ['The Fool', 'The Magician', 'The High Priestess', 'The Hermit']) expect(screen.getByRole('img', { name })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    // the glyph table's grid (cards 0 and 1 in one cell) is not on the page
    expect(container.querySelector('[style*="grid-template-columns"]')).toBeNull();
    // every position named once, under its own slot
    for (const label of CELTIC) expect(screen.getAllByText(label)).toHaveLength(1);
    await act(async () => resolveDeck(fullDeck));
    expect(screen.getByText('The cross and the staff')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('region', { name: /Present situation: The Fool/ })).toBeInTheDocument();
  });

  it('keeps the cross for a row a card of which nothing can name, with that card as a placeholder in its slot', async () => {
    render(<SavedReadingSheet reading={legacyCeltic} />);
    expect(screen.getByText('The cross and the staff')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ace of Cups' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'A card that is not in the deck' })).toBeInTheDocument();
    await act(async () => resolveDeck(fullDeck));
    expect(screen.getByText('The cross and the staff')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'A card that is not in the deck' })).toBeInTheDocument();
  });

  it('shares once per tap, as a v1 tarot link with the row’s cards, question and day (F58, F75)', async () => {
    render(<SavedReadingSheet reading={{ ...celtic, question: 'Where is my work going?' }} dateLabel="Oct 13" />);
    const share = screen.getByRole('button', { name: 'Share this reading' });
    expect(share).toBeDisabled(); // the image's keyword comes with the deck
    await act(async () => resolveDeck(fullDeck));
    expect(share).toBeEnabled();
    act(() => {
      share.click();
      share.click();
    });
    expect(screen.getByRole('button', { name: 'Preparing the share image' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => new Promise((r) => setTimeout(r, 120)));
    expect(shareCalls).toHaveLength(1);
    expect(shareCalls[0].opts).toMatchObject({ variant: 'tarot', cardName: 'The Fool', orientation: 'upright' });
    const token = shareCalls[0].text.match(/\/reading\/([A-Za-z0-9_-]+)/)![1];
    expect(decodeReading(token)).toEqual({
      v: 1,
      s: 'celtic-cross',
      c: [[0, 0], [1, 0], [2, 0], [3, 1], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0]],
      q: 'Where is my work going?',
      d: '2026-10-13T03:00:00+00:00',
    });
    expect(screen.getByRole('button', { name: 'Share this reading' })).toBeEnabled();
  });
});

describe('a saved playing-card reading', () => {
  it('prints no sentence twice: a lone card’s section continues after the summary (F17)', () => {
    render(<SavedReadingSheet reading={kingAlone} dateLabel="Oct 14" />);
    const summary = 'The King of Diamonds is power through money and position';
    expect(screen.getAllByText(new RegExp(summary))).toHaveLength(1);
  });

  it('numbers a five-card Yes or No card by card, in the reader’s language (F18)', async () => {
    const { unmount } = render(<SavedReadingSheet reading={yesNoFive} dateLabel="Oct 16" />);
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getAllByText(`Card ${n}`).length).toBeGreaterThan(0);
    expect(screen.queryByText('First card')).toBeNull();
    expect(screen.queryByText('Third card')).toBeNull();
    unmount();
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    render(<SavedReadingSheet reading={yesNoFive} dateLabel="10月16日" />);
    for (const n of [1, 2, 3, 4, 5]) expect(screen.getAllByText(`カード${n}`).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Card \d$/)).toBeNull();
    expect(screen.queryByText('1枚目')).toBeNull();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('reads the Wish’s verdict in the reader’s language (F12)', async () => {
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    render(<SavedReadingSheet reading={wish} />);
    expect(screen.getByText(read('ja', 'cartomancy').spreads['carto-wish'].verdictLabels.favored)).toBeInTheDocument();
    expect(screen.queryByText('Favored')).toBeNull();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('shares once per tap, as the reveal’s v2 playing-card link (F58, F75)', async () => {
    render(
      <>
        <SavedReadingSheet reading={yesNoFive} dateLabel="Oct 16" />
        <ToastContainer />
      </>,
    );
    const share = screen.getByRole('button', { name: 'Share this reading' });
    act(() => {
      share.click();
      share.click();
      share.click();
    });
    await act(async () => new Promise((r) => setTimeout(r, 120)));
    expect(shareCalls).toHaveLength(1);
    expect(shareCalls[0].opts).toMatchObject({ variant: 'cartomancy', cardSlug: 'four-of-diamonds', spreadName: 'Yes or No' });
    const token = shareCalls[0].text.match(/\/reading\/([A-Za-z0-9_-]+)/)![1];
    expect(decodeReading(token)).toMatchObject({
      v: 2,
      k: 'p',
      s: 'carto-yes-no',
      c: [[129, 0], [151, 0], [101, 0], [119, 0], [111, 0]],
      q: 'Should I send the message?',
      d: '2026-10-16T03:00:00+00:00',
    });
    expect(within(document.body).getByText('Shared')).toBeInTheDocument();
  });
});
