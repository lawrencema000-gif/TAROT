import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

/*
 * p10: the landing page's free reading localized the three cards as they
 * were drawn and kept them in state, so switching the landing page's
 * language with a card revealed left its name, keywords and meaning in the
 * old language (the cause Home had, d1-en-01). The cards are kept in English
 * now and the revealed one is read in the language on screen.
 */

import i18n from '../../../i18n/config';
import { FreeReadingDemo } from '../FreeReadingDemo';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the free reading follows a language change', () => {
  it('a revealed card is renamed and reread at once, without a new draw', async () => {
    await i18n.changeLanguage('en');
    // Math.random() = 0 draws the first card of the deck, The Fool, upright.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<FreeReadingDemo onSignUp={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw your card' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Card 1' }, { timeout: 5000 }));
    expect(screen.getByRole('heading', { name: 'The Fool' })).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    expect(await screen.findByRole('heading', { name: '愚者' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The Fool' })).toBeNull();
    expect(screen.getByText('新しい始まり')).toBeInTheDocument();
  });
});
