import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Tag, Badge } from '../Chip';

/*
 * p10 d2-ja-04: in the Library at 390px the pills beside a truncated title
 * broke inside their word — キャリ/ア on a saved spread, A/I and Car/eer on
 * an AI reading — each two lines tall. A pill could shrink with the title,
 * and inside a button the ja/ko/zh text rules (`overflow-wrap: anywhere`)
 * let it break between any two letters.
 *
 * The first fix held every Tag to one unshrinking line (shrink-0, keep-all,
 * `overflow-wrap: normal`), and the Tags that carry a sentence ran off the
 * phone: the quiz's "Early reading: You’re leaning INFJ so far — keep going
 * to confirm." measured about 430px in a 328px column, and could neither
 * shrink nor wrap. A Tag shrinks and wraps with its row again; the two
 * Library row pills are held whole where they sit.
 *
 * jsdom lays nothing out, so this holds the class lists that decide it.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000a4', email: 'qa@example.com' };
const listHighlights = vi.fn();
const listSaved = vi.fn();
const listPremium = vi.fn();

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../../dal', () => ({
  savedHighlights: { listRawForUser: (...a: unknown[]) => listHighlights(...a), deleteById: vi.fn() },
  tarotReadings: { listSaved: (...a: unknown[]) => listSaved(...a), deleteById: vi.fn() },
  premiumReadings: { listRawForUser: (...a: unknown[]) => listPremium(...a), deleteByIdOnly: vi.fn() },
}));

import i18n from '../../../i18n/config';
import { LibrarySection } from '../../readings/LibrarySection';

afterEach(() => cleanup());
const classes = (el: Element) => el.className.split(/\s+/).filter(Boolean);
/** What holds a pill to one line at its full width. */
const ONE_LINE = ['shrink-0', 'flex-shrink-0', 'flex-none', 'whitespace-nowrap', 'truncate', 'break-keep', '[overflow-wrap:normal]'];

describe('Tag and Badge: which pills keep to one line (d2-ja-04)', () => {
  it.each([
    ['en', 'Early reading: You’re leaning INFJ so far — keep going to confirm.'],
    ['ja', '途中経過： 今のところ INFJ 寄りです——続けて確定させましょう。'],
  ])('%s: a sentence Tag in a narrow centred flex row (the quiz’s early reading) carries no one-line rule', (_lng, sentence) => {
    const { container } = render(
      <div className="flex justify-center">
        <Tag tone="gold" size="md">{sentence}</Tag>
      </div>,
    );
    const tag = container.firstElementChild!.firstElementChild!;
    expect(tag.textContent).toBe(sentence);
    expect(classes(tag).filter((c) => ONE_LINE.includes(c))).toEqual([]);
  });

  it('a Badge is one line that never shrinks', () => {
    const { container } = render(<Badge tone="violet">AI</Badge>);
    expect(classes(container.firstElementChild!)).toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap']));
  });

  it('the keyword pill still wraps a long keyword inside itself (P7 #75)', () => {
    const { container } = render(<Tag variant="keyword">SMALL TALK THAT MUST BECOME REAL TALK</Tag>);
    const pill = classes(container.firstElementChild!);
    expect(pill).toContain('max-w-full');
    expect(pill).not.toContain('whitespace-nowrap');
    expect(pill).not.toContain('break-keep');
  });

  it('a caller’s own classes still come after the base', () => {
    const { container } = render(<Tag className="w-12 justify-center">Fire</Tag>);
    const list = classes(container.firstElementChild!);
    expect(list.indexOf('w-12')).toBeGreaterThan(list.indexOf('rounded-full'));
  });
});

/** The same reading, saved (focus as TarotSection stores it) and bought (focus as the AI request sent it). */
const SAVED = {
  id: 's1', date: '2026-10-20', spread_type: 'three-card', focus_area: 'Career',
  cards: [{ cardId: 61, cardName: 'Knight of Swords', reversed: false, position: 'Past' }, { cardId: 3, cardName: 'The Empress', reversed: false, position: 'Present' }],
  interpretation: null, question: null, created_at: '2026-10-20T03:00:00Z',
};
const BOUGHT = {
  id: 'p1', reading_type: 'three-card', content: '1) Overview\nYour network carries you.',
  context: { usedLlm: true, focusArea: 'career' },
  cards: [{ id: 61, name: 'Knight of Swords', reversed: false }, { id: 3, name: 'The Empress', reversed: false }],
  created_at: '2026-10-20T03:00:00Z',
};

describe('the Library row pills stay whole beside the truncating title (d2-ja-04)', () => {
  beforeEach(async () => {
    listHighlights.mockReset().mockResolvedValue({ ok: true, data: [] });
    listSaved.mockReset().mockResolvedValue({ ok: true, data: [SAVED] });
    listPremium.mockReset().mockResolvedValue({ ok: true, data: [BOUGHT] });
    await act(async () => { await i18n.changeLanguage('ja'); });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('ja: the saved spread’s focus pill and the AI reading’s neither shrink nor wrap', async () => {
    render(<MemoryRouter><LibrarySection /></MemoryRouter>);
    const whole = (pill: HTMLElement) => {
      expect(classes(pill), pill.textContent ?? '').toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap']));
      // The room comes from the title in the same row, which truncates.
      expect(classes(pill.parentElement!.firstElementChild!)).toContain('truncate');
    };
    whole(await screen.findByText('キャリア'));
    fireEvent.click(await screen.findByRole('tab', { name: i18n.t('app:library.tabs.aiReadings') }));
    const badge = await screen.findByText('AI');
    const pill = await screen.findByText('キャリア');
    expect(pill.parentElement).toBe(badge.parentElement);
    whole(pill);
  });
});
