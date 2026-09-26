import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button, DeckFan, EyebrowLabel, SparkleFourPoint } from '../ui';

/**
 * The home hero: the deck.
 *
 * The hero used to be an ornate card with a nebula veil, an 18-second
 * aurora, two looping sparks, a bobbing star, a divider and a sweep —
 * four infinite animations that reported no state, stacked on one panel —
 * and the thing the product is actually about, the cards, appeared nowhere
 * above the fold. First-time users got a spinning star in sixty percent of
 * the viewport instead.
 *
 * Now the deck is the hero. Three Arcana backs fan out once on arrival,
 * lit by one soft bloom, under the greeting and over a single call to
 * action. Once the ritual has begun the deck steps aside — the drawn card
 * itself is on the page below — and the hero becomes the greeting with the
 * three parts of the ritual marked.
 */

export interface HomeHeroProps {
  /** "Good morning" — the eyebrow when there is a name, the title otherwise. */
  greeting: string;
  name?: string | null;
  /** Level and rank, under the name. */
  subline?: ReactNode;
  /** The ritual has begun: show progress instead of the deck. */
  started: boolean;
  progress: { horoscope: boolean; tarot: boolean; prompt: boolean };
  /** Accessible summary of `progress`, e.g. "2 of 3 parts done". */
  progressLabel: string;
  /** Title and line under the deck before the ritual starts. */
  title: string;
  lede?: string;
  cta: string;
  onStart: () => void;
  cardBackUrl?: string | null;
  /** Streak pill, rendered top-right beside the greeting. */
  aside?: ReactNode;
}

export function HomeHero({
  greeting,
  name,
  subline,
  started,
  progress,
  progressLabel,
  title,
  lede,
  cta,
  onStart,
  cardBackUrl,
  aside,
}: HomeHeroProps) {
  const parts = [progress.horoscope, progress.tarot, progress.prompt];

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {name ? (
            <>
              <EyebrowLabel className="!text-mystic-400">{greeting}</EyebrowLabel>
              <h1 className="heading-display-xl text-mystic-100 mt-1 truncate">{name}.</h1>
            </>
          ) : (
            <h1 className="heading-display-xl text-mystic-100 truncate">{greeting}.</h1>
          )}
          {subline}
        </div>
        {aside}
      </div>

      {started ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading-display-lg text-mystic-100">{title}</h2>
          <div className="flex items-center gap-2 shrink-0" role="img" aria-label={progressLabel}>
            {parts.map((done, i) => (
              <SparkleFourPoint key={i} size={12} className={done ? 'text-gold' : 'text-mystic-600'} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <DeckFan back={cardBackUrl} size="lg" />
          <h2 className="heading-display-lg text-mystic-100 mt-2">{title}</h2>
          {lede && <p className="text-body text-mystic-300 mt-2 max-w-xs mx-auto">{lede}</p>}
          <div className="mt-5">
            <Button variant="gold" size="lg" onClick={onStart} className="px-8">
              {cta}
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
