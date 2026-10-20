import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

/*
 * p9 QZ-7: the daily card's screen-reader label joined the card and its
 * orientation with a Latin ", " built in code, so a Japanese or Chinese
 * reader heard 「愚者, 正位置」. It takes the locale's list separator
 * (cardMeaning.listSeparator: 、 in ja and zh, ", " in en and ko), as the
 * card-meaning pages already do.
 */

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));
vi.mock('../../hooks/useProgressiveImage', () => ({ useProgressiveImage: () => ({ src: null }) }));
vi.mock('../../utils/haptics', () => ({ flipHaptics: () => () => {} }));

import i18n from '../../i18n/config';
import { fullDeck } from '../../data/tarotDeck';
import { TarotFlipCard } from './TarotFlipCard';
import type { TarotCard } from '../../types';

const FOOL = fullDeck[0];
const NAMES: Record<string, string> = { en: 'The Fool', ja: '愚者', ko: '바보', zh: '愚人' };

function mount(lng: string, opts: { reversed?: boolean; revealed?: boolean } = {}) {
  const card = { ...FOOL, name: NAMES[lng] } as TarotCard;
  return render(
    <TarotFlipCard
      card={card}
      reversed={opts.reversed ?? false}
      revealed={opts.revealed ?? true}
      saved={false}
      onSave={() => {}}
      onShare={() => {}}
      onMeaning={() => {}}
    />,
  );
}

/** The card itself: the turnable target whose label names what lies on the table. */
const cardTarget = () => document.querySelector<HTMLElement>('[role="button"][aria-live="polite"]')!;

const tt = (key: string) => i18n.t(`app:${key}`);

afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('TarotFlipCard: the card’s label uses the locale’s separator (p9 QZ-7)', () => {
  it('ja: 「愚者、正位置」, then 「愚者、逆位置」 when the toggle turns it — never a Latin comma', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    mount('ja');
    expect(cardTarget()).toHaveAttribute('aria-label', '愚者、正位置');
    fireEvent.click(screen.getByRole('button', { name: tt('home.ritualCards.switchToReversed') }));
    expect(cardTarget()).toHaveAttribute('aria-label', '愚者、逆位置');
    expect(cardTarget().getAttribute('aria-label')).not.toMatch(/[,，]/);
  });

  it('zh: 「愚人、逆位」 for a card drawn reversed', async () => {
    await act(async () => { await i18n.changeLanguage('zh'); });
    mount('zh', { reversed: true });
    expect(cardTarget()).toHaveAttribute('aria-label', '愚人、逆位');
  });

  it.each([
    ['en', 'The Fool, Upright'],
    ['ko', '바보, 정방향'],
  ])('%s keeps its comma and space: %s', async (lng, label) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    mount(lng);
    expect(cardTarget()).toHaveAttribute('aria-label', label);
  });

  it('face down, the label is the invitation, in the reader’s language', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    mount('ja', { revealed: false });
    expect(cardTarget()).toHaveAttribute('aria-label', tt('home.ritualCards.faceDownLabel'));
  });
});
