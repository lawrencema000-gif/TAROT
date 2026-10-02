import type { PlayingCard } from '../../types/cartomancy';
import { PlayingCardFace } from './PlayingCardFace';

/**
 * A grid of quiet faces, no captions: the name is on the card.
 *
 * Four columns at phone width (tiles ≈ 80 px over 358 px with 12 px
 * gutters), six from `sm`, nine from `lg`. Each tile is a button named by
 * the card so the grid reads to assistive tech; the caller decides whether
 * a tap opens a sheet or a route.
 */
export function CardGrid({
  cards,
  localize,
  onSelect,
  hrefFor,
  columns = 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-9',
}: {
  cards: PlayingCard[];
  localize: (card: PlayingCard) => PlayingCard;
  onSelect?: (card: PlayingCard) => void;
  /** Render anchors instead of buttons (the public library). */
  hrefFor?: (card: PlayingCard) => string;
  columns?: string;
}) {
  const tile =
    'block aspect-[2/3] rounded-inset overflow-hidden border border-gold/25 bg-mystic-850 text-gold select-none touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
    'transition-[transform,border-color] duration-fast ease-out motion-safe:active:scale-95 [@media(hover:hover)]:[&:hover:not(:active)]:border-gold/60 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 [&>svg]:w-full [&>svg]:h-full [&>svg]:block';
  return (
    <ul className={`grid gap-3 ${columns}`} role="list">
      {cards.map((card) => {
        const name = localize(card).name;
        const face = <PlayingCardFace card={card} detail="quiet" />;
        return (
          <li key={card.id}>
            {hrefFor ? (
              <a href={hrefFor(card)} aria-label={name} className={tile} onClick={onSelect ? (e) => { e.preventDefault(); onSelect(card); } : undefined}>
                {face}
              </a>
            ) : (
              <button type="button" aria-label={name} className={`${tile} w-full`} onClick={() => onSelect?.(card)}>
                {face}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
