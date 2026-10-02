import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, type ReactNode } from 'react';
import { Card } from '../Card';

// framer-motion's AnimatePresence keeps an exiting toast mounted until its
// exit animation ends, which jsdom never plays to completion in a
// deterministic time. The toast tests are about the stack's state, not the
// departure, so the presence layer is replaced with a plain pass-through.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    // Only the two props the stack reads; the motion props (layout, initial,
    // animate, exit, transition) are dropped on the floor.
    div: forwardRef<HTMLDivElement, { children?: ReactNode; className?: string }>(function MotionDiv(
      { children, className },
      ref,
    ) {
      return <div ref={ref} className={className}>{children}</div>;
    }),
  },
  useReducedMotion: () => true,
}));
import { ListRow } from '../ListRow';
import { ToastContainer, toast, dismissToasts } from '../Toast';
import { Tag, KeywordRow, Badge } from '../Chip';
import { EyebrowLabel, StarDivider } from '../Ornament';
import { Paper } from '../Paper';
import { Disclaimer } from '../Disclaimer';
import { ResultSheet } from '../ResultSheet';
import { AffirmationPanel } from '../AffirmationPanel';
import { ReadingProse } from '../ReadingProse';
import { SpreadGlyph, SPREAD_LAYOUTS } from '../../icons/SpreadGlyph';
import { SUIT_GLYPHS, suitKeyFor } from '../../icons/SuitGlyphs';
import { majorEnrichment, minorEnrichment } from '../../../data/tarotEnrichment';

/**
 * Phase 7 — the design foundation, behaviourally.
 *
 * jsdom loads no stylesheet, so colour and contrast are proven in the
 * browser (scratchpad/p7-F2/contrast.json); these tests hold the parts
 * that are markup: roles, keys, dedupe, composition order, data shape.
 */

describe('Card: interactive + onClick is a button to the keyboard (R6 A4)', () => {
  it('renders role=button, tabIndex 0 and fires on Enter and Space, not on a nested control', async () => {
    const onClick = vi.fn();
    const inner = vi.fn();
    render(
      <Card interactive onClick={onClick} data-testid="card">
        Quiz{' '}
        <button
          onClick={(e) => {
            // A nested control owns its click (the same stopPropagation a
            // pointer needs); the test is that the card's KEY handler stays
            // quiet when the key lands on the child.
            e.stopPropagation();
            inner();
          }}
        >
          inner
        </button>
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
    card.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
    // Enter on the nested button is the button's own click; the card stays quiet.
    screen.getByText('inner').focus();
    await userEvent.keyboard('{Enter}');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is a plain div without onClick', () => {
    render(<Card interactive data-testid="card">Static</Card>);
    expect(screen.getByTestId('card')).not.toHaveAttribute('role');
    expect(screen.getByTestId('card')).not.toHaveAttribute('tabindex');
  });
});

describe('ListRow: the label keeps its width, the value truncates (R5 m-8, R6 A20)', () => {
  it('caps the value at 45% and truncates it', () => {
    render(<ListRow label="Edit profile" value="averyveryverylongemaillocalpart" />);
    const value = screen.getByText('averyveryverylongemaillocalpart');
    expect(value.className).toMatch(/max-w-\[45%\]/);
    expect(value.className).toMatch(/\btruncate\b/);
    expect(screen.getByText('Edit profile').className).toMatch(/\btruncate\b/);
  });
});

describe('Toast: identical messages collapse while one is visible (R7)', () => {
  it('shows one toast for three identical calls, and dismissToasts clears by type', () => {
    render(<ToastContainer />);
    act(() => {
      toast('Could not load the feed', 'error');
      toast('Could not load the feed', 'error');
      toast('Could not load the feed', 'error');
      toast('Saved', 'success');
    });
    expect(screen.getAllByText('Could not load the feed')).toHaveLength(1);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => dismissToasts({ type: 'error' }));
    expect(screen.queryByText('Could not load the feed')).toBeNull();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => dismissToasts());
    expect(screen.queryByText('Saved')).toBeNull();
  });
});

describe('Tag variant="keyword", KeywordRow, Badge violet', () => {
  it('renders the pill recipe with the paper hook class', () => {
    render(<Tag variant="keyword">Opportunity</Tag>);
    const pill = screen.getByText('Opportunity');
    expect(pill.className).toMatch(/\bkeyword-pill\b/);
    expect(pill.className).toMatch(/\brounded-full\b/);
    expect(pill.className).toMatch(/\buppercase\b/);
    expect(pill.className).toMatch(/\bh-7\b/);
  });
  it('KeywordRow renders one pill per keyword, centred and wrapping', () => {
    const { container } = render(<KeywordRow keywords={['a', 'b', 'c', 'd']} />);
    expect(container.querySelectorAll('.keyword-pill')).toHaveLength(4);
    expect((container.firstChild as HTMLElement).className).toMatch(/justify-center/);
  });
  it('Badge tone="violet" uses the violet ink', () => {
    render(<Badge tone="violet">Premium</Badge>);
    expect(screen.getByText('Premium').className).toMatch(/text-cosmic-violet-ink/);
  });
});

describe('EyebrowLabel tone', () => {
  it('stays gold by default and takes mystic-300 as ink, yielding to a caller colour', () => {
    const { rerender } = render(<EyebrowLabel>Kicker</EyebrowLabel>);
    expect(screen.getByText('Kicker').className).not.toMatch(/text-mystic-300/);
    rerender(<EyebrowLabel tone="ink">Kicker</EyebrowLabel>);
    expect(screen.getByText('Kicker').className).toMatch(/text-mystic-300/);
    rerender(<EyebrowLabel tone="ink" className="text-mystic-400">Kicker</EyebrowLabel>);
    expect(screen.getByText('Kicker').className).toMatch(/text-mystic-400/);
    expect(screen.getByText('Kicker').className).not.toMatch(/text-mystic-300/);
  });
});

describe('Paper, Disclaimer, AffirmationPanel, ResultSheet', () => {
  it('Paper applies the scope and squares its foot for a tail', () => {
    const { container, rerender } = render(<Paper>Body</Paper>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('SECTION');
    expect(el.className).toMatch(/\bpaper-prose\b/);
    expect(el.className).toMatch(/\bbg-paper\b/);
    expect(el.className).toMatch(/\brounded-sheet\b/);
    rerender(<Paper tail as="article">Body</Paper>);
    const tail = container.firstChild as HTMLElement;
    expect(tail.tagName).toBe('ARTICLE');
    expect(tail.className).toMatch(/\brounded-t-sheet\b/);
  });

  it('Disclaimer carries the English defaults for every kind', () => {
    const { rerender } = render(<Disclaimer kind="tarot" />);
    expect(screen.getByText('Tarot can’t answer everything.')).toBeInTheDocument();
    expect(screen.getByText(/Arcana’s readings are for reflection and entertainment/)).toBeInTheDocument();
    rerender(<Disclaimer kind="astrology" />);
    expect(screen.getByText('Astrology is a lens, not a forecast.')).toBeInTheDocument();
    rerender(<Disclaimer kind="quiz" />);
    expect(screen.getByText('A quiz is a mirror, not a verdict.')).toBeInTheDocument();
    rerender(<Disclaimer kind="ai" />);
    expect(screen.getByText('This reading was written by a model.')).toBeInTheDocument();
    rerender(<Disclaimer kind="cartomancy" />);
    expect(screen.getByText('The cards suggest; they don’t decide.')).toBeInTheDocument();
    rerender(<Disclaimer />);
    expect(screen.getByText('For reflection, not advice.')).toBeInTheDocument();
  });

  it('AffirmationPanel labels itself and sets the sentence in the display serif', () => {
    render(<AffirmationPanel text="I step forward before I feel ready." />);
    expect(screen.getByText('Affirmation')).toBeInTheDocument();
    expect(screen.getByText('I step forward before I feel ready.').className).toMatch(/font-display/);
  });

  it('ResultSheet composes the order and steps the headings', () => {
    const { container } = render(
      <ResultSheet eyebrow="Your question" title="How will my day go?" summary="A steady day." disclaimer="tarot">
        <p>body</p>
      </ResultSheet>,
    );
    const h1 = container.querySelector('h1');
    const h2 = container.querySelector('h2');
    expect(h1?.textContent).toBe('How will my day go?');
    expect(h1?.className).toMatch(/heading-strong/);
    expect(h2?.textContent).toBe('Reading summary');
    // order: eyebrow, title, stars, summary heading, lede, body, disclaimer (sibling after the Paper)
    const text = container.textContent ?? '';
    expect(text.indexOf('Your question')).toBeLessThan(text.indexOf('How will my day go?'));
    expect(text.indexOf('Reading summary')).toBeLessThan(text.indexOf('A steady day.'));
    expect(text.indexOf('body')).toBeLessThan(text.indexOf('Disclaimer'));
    const paper = container.querySelector('.paper-prose') as HTMLElement;
    expect(paper.className).toMatch(/rounded-t-sheet/);
    expect(paper.querySelector('aside')).toBeNull(); // the Disclaimer is not inside the scope
    expect(container.querySelector('aside')?.className).toMatch(/rounded-b-sheet/);
  });

  it('ResultSheet at h2 steps the summary to h3', () => {
    const { container } = render(<ResultSheet eyebrow="E" title="T" summary="S" headingLevel="h2" />);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('T');
    expect(container.querySelector('h3')?.textContent).toBe('Reading summary');
  });

  it('ReadingProse no longer sets a drop cap', () => {
    const { container } = render(<ReadingProse text={'First.\n\nSecond.'} />);
    expect(container.querySelector('.drop-cap')).toBeNull();
    expect(container.querySelector('.reading-lede')?.textContent).toBe('First.');
  });

  it('StarDivider is three sparkles, hidden from AT', () => {
    const { container } = render(<StarDivider />);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
    expect(container.firstChild).toHaveAttribute('aria-hidden');
  });
});

describe('SpreadGlyph and SuitGlyphs', () => {
  it('draws one card per position and rotates the crossing card', () => {
    const { container } = render(<SpreadGlyph layout={SPREAD_LAYOUTS['celtic-cross']} />);
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(10);
    expect([...rects].filter((r) => r.getAttribute('transform')?.startsWith('rotate(90'))).toHaveLength(1);
  });
  it('carries the six castable spreads by TarotSection id', () => {
    expect(Object.keys(SPREAD_LAYOUTS).sort()).toEqual(
      ['career', 'celtic-cross', 'relationship', 'shadow', 'single', 'three-card'],
    );
    expect(SPREAD_LAYOUTS.single).toHaveLength(1);
    expect(SPREAD_LAYOUTS['three-card']).toHaveLength(3);
    expect(SPREAD_LAYOUTS.relationship).toHaveLength(5);
    expect(SPREAD_LAYOUTS.career).toHaveLength(6);
    expect(SPREAD_LAYOUTS.shadow).toHaveLength(7);
  });
  it('wraps itself in a tile on request', () => {
    const { container } = render(<SpreadGlyph layout={SPREAD_LAYOUTS.single} tile="paper" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/bg-paper-2/);
  });
  it('maps every deck suit plus the crown', () => {
    expect(Object.keys(SUIT_GLYPHS).sort()).toEqual(['cups', 'major', 'pentacles', 'swords', 'wands']);
    expect(suitKeyFor({ arcana: 'major' })).toBe('major');
    expect(suitKeyFor({ arcana: 'minor', suit: 'cups' })).toBe('cups');
  });
});

describe('tarotEnrichment carries an affirmation for all 78 cards', () => {
  it('is first person, present tense, twelve words or fewer', () => {
    const all = [...Object.values(majorEnrichment), ...Object.values(minorEnrichment)];
    expect(all).toHaveLength(78);
    for (const e of all) {
      expect(e.affirmation).toMatch(/^I\b/);
      expect(e.affirmation.split(/\s+/).length).toBeLessThanOrEqual(12);
      expect(e.affirmation).toMatch(/\.$/);
      expect(e.affirmation).not.toMatch(/!/);
    }
    expect(majorEnrichment[0].affirmation).toBe('I step forward before I feel ready.');
    expect(minorEnrichment['ace-of-pentacles'].affirmation).toBe('I take the opportunity in front of me.');
  });
});
