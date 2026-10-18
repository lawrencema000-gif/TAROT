import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/*
 * The shared reading page in Japanese (p9 QU1 R-d, QU2 R3 d):
 *  - the position label and the card name under each card are short labels
 *    in a column a third of the page wide, set as body copy: Japanese breaks
 *    anywhere, so 「ソードの/8」 and 「近い未/来」 split a word. They keep
 *    their phrases now (index.css .keep-phrases, as TarotSelectView's names);
 *  - the reader's question was quoted in Latin marks built in code
 *    (“今の仕事を…”); it is quoted as the locale quotes (spreadDetail.quoted:
 *    「…」 in ja).
 */

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-shared' }, profile: null }) }));

import i18n from '../../i18n/config';
import { encodeReading } from '../../services/shareableReadings';
import { localizeCard } from '../../i18n/localizeCard';
import { fullDeck } from '../../data/tarotDeck';
import { tarotPositionLabel } from '../../components/readings/tarot/spreadLabels';
import { cjkBreaking, KEEPS_PHRASES, DEFAULT_BREAKING } from '../../test/cjkCascade';
import { SharedReadingPage } from '../SharedReadingPage';

const QUESTION_JA = '今の仕事を続けるべきですか？';
const tokenFor = (question: string) =>
  encodeReading({
    spreadSlug: 'three-card',
    cards: [{ id: 0, reversed: false }, { id: 57, reversed: true }, { id: 16, reversed: false }],
    question,
    date: '2026-10-07T00:05:00.000Z',
  });

function renderShared(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/reading/${token}`]}>
      <Routes>
        <Route path="/reading/:token" element={<SharedReadingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The table: each card's caption, as [position label, card name, "Reversed" or null] paragraphs. */
function tableCaptions(container: HTMLElement): Array<[HTMLElement, HTMLElement, HTMLElement | null]> {
  const cells = Array.from(container.querySelectorAll<HTMLElement>('div.text-center.min-w-0'));
  return cells.map((cell) => {
    const ps = Array.from(cell.querySelectorAll<HTMLElement>(':scope > p'));
    return [ps[0], ps[1], ps[2] ?? null];
  });
}

describe('SharedReadingPage in Japanese (QU1 R-d, QU2 R3 d)', () => {
  beforeEach(async () => {
    cleanup();
    await act(async () => { await i18n.changeLanguage('ja'); });
  });
  afterAll(async () => {
    cleanup();
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  it('the position label and the card name under each card keep their phrases', async () => {
    const { container } = renderShared(tokenFor(QUESTION_JA));
    const t = i18n.getFixedT('ja', 'app');
    const eight = localizeCard(fullDeck.find((c) => c.id === 57)!, 'ja').name;
    await screen.findAllByText(eight);
    const captions = tableCaptions(container);
    expect(captions).toHaveLength(3);
    captions.forEach(([label, name], i) => {
      expect(label.textContent).toBe(tarotPositionLabel(t as never, 'three-card', i));
      expect(cjkBreaking(label)).toBe(KEEPS_PHRASES.ja);
      expect(cjkBreaking(name)).toBe(KEEPS_PHRASES.ja);
    });
    expect(captions[1][1].textContent).toBe(eight);
    // The reversed card's third label, the same.
    expect(captions[1][2]?.textContent).toBe(t('readings.revealView.reversed'));
    expect(cjkBreaking(captions[1][2]!)).toBe(KEEPS_PHRASES.ja);
    expect(captions[0][2]).toBeNull();
    // The meanings on paper stay body copy.
    const meaning = container.querySelector<HTMLElement>('p.reading-copy')!;
    expect(cjkBreaking(meaning)).toBe(DEFAULT_BREAKING);
  });

  it('the question is quoted in 「」, not in Latin marks built in code', async () => {
    renderShared(tokenFor(QUESTION_JA));
    const quote = await screen.findByText(`「${QUESTION_JA}」`);
    expect(quote.tagName).toBe('SPAN');
    expect(document.body.textContent).not.toContain(`“${QUESTION_JA}”`);
  });

  it('en: curly quotes, as before', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    renderShared(tokenFor('Should I stay?'));
    expect(await screen.findByText('“Should I stay?”')).toBeInTheDocument();
  });
});
