import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button, DeckFan, EyebrowLabel, SparkleFourPoint } from '../ui';
import { useT } from '../../i18n/useT';

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
 *
 * The title (the name, or the greeting when there is no name to use) is
 * punctuated by the language — "Sakura." in English, "さくら さん" in
 * Japanese — and is never cut: beside the streak pill, Japanese
 * "おはようございます." needed 293px of 244 and read "おはようござい…" every
 * morning (p8 F72). A title too wide for the line at the display size is set
 * one size down; only if that is still too wide does it wrap, between
 * phrases (keep-phrases: Japanese and Chinese by phrase, Korean by word). It
 * used to set [word-break:auto-phrase], which Chromium implements for
 * Japanese only, so a Korean title broke between syllables (p10 d3-ko-09).
 */

/**
 * True while `text` fits on one line of `box` at heading-display-xl. The
 * probe is the title at that size, unwrapped and clipped to nothing, so it
 * is measured whichever size the title is shown at.
 */
function useFitsDisplaySize(text: string) {
  const boxRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const probe = probeRef.current;
    if (!box || !probe) return;
    let live = true;
    const measure = () => {
      if (!live || box.clientWidth === 0) return;
      setFits(probe.offsetWidth <= box.clientWidth);
    };
    measure();
    // A rotation or a narrower pill changes the line; a web font landing
    // changes the title's width.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(box);
    void document.fonts?.ready.then(measure);
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, [text]);

  return { boxRef, probeRef, fits };
}

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
  const { t } = useT('app');
  const parts = [progress.horoscope, progress.tarot, progress.prompt];
  // The page title: the name with the greeting above it, or the greeting.
  const heading = name
    ? t('home.nameTitle', { defaultValue: '{{name}}.', name })
    : t('home.greetingTitle', { defaultValue: '{{greeting}}.', greeting });
  const { boxRef, probeRef, fits } = useFitsDisplaySize(heading);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div ref={boxRef} className="min-w-0 flex-1">
          {name && <EyebrowLabel className="!text-mystic-400">{greeting}</EyebrowLabel>}
          <h1
            className={`${fits ? 'heading-display-xl' : 'heading-display-lg line-clamp-2 keep-phrases [overflow-wrap:anywhere]'} lining-nums text-mystic-100 ${name ? 'mt-1' : ''}`}
          >
            {heading}
          </h1>
          <div className="h-0 overflow-hidden" aria-hidden>
            <span ref={probeRef} className="heading-display-xl lining-nums invisible inline-block whitespace-nowrap">
              {heading}
            </span>
          </div>
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
