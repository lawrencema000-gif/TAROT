import { useState, useCallback, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { getBundledFullPath } from '../../config/bundledImages';
import { useT } from '../../i18n/useT';
import { localizeCard } from '../../i18n/localizeCard';
import { Button, Card, TarotCardIcon } from '../ui';
import type { TarotCard } from '../../types';

/**
 * Free 1-card demo reading — no signup required.
 *
 * The draw moment, directly under the hero's call to action. The visitor
 * picks one of three face-down Arcana backs (the same
 * public/card-backs/default.svg the DeckFan above it shows), the chosen
 * card turns over once, and the meaning and keywords appear with a soft
 * CTA into onboarding.
 *
 * The deck arrives on the first tap, not with the page. `tarotDeck.ts` is
 * 86 KB gzipped — the meanings of all 78 cards — and a static import put
 * it in the landing chunk for every visitor, most of whom never draw. The
 * dynamic import below is fetched when "Draw" is pressed (one round trip
 * the visitor spends looking at the three backs appearing) and cached for
 * the session; the full meanings, keywords and `localizeCard` overlay stay
 * exactly as they were, so nothing about the reading is slimmed.
 *
 * Fires a gtag micro-conversion on draw so Google Ads can optimize for
 * engaged visitors even before they sign up.
 */

type Stage = 'prompt' | 'picking' | 'revealed';

const CARD_BACK = '/card-backs/default.svg';

type Deck = TarotCard[];
let deckPromise: Promise<Deck> | null = null;
function loadDeck(): Promise<Deck> {
  if (!deckPromise) {
    deckPromise = import('../../data/tarotDeck').then((m) => m.fullDeck);
  }
  return deckPromise;
}

function pickThreeRandom(deck: Deck): TarotCard[] {
  const pool = [...deck];
  const out: TarotCard[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(localizeCard(pool.splice(idx, 1)[0]));
  }
  return out;
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  // Deferred + dual-push (gtag + dataLayer) for reliable delivery from
  // inside React event handlers. See gtagEvent() comment in
  // src/services/analytics.ts for the why.
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    try {
      const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
      };
      if (typeof w.gtag === 'function') {
        w.gtag('event', event, params || {});
      }
      if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({ event, ...(params || {}) });
      }
    } catch {
      // ignore — never let tracking break the demo
    }
  }, 0);
}

interface FreeReadingDemoProps {
  onSignUp: () => void;
}

export function FreeReadingDemo({ onSignUp }: FreeReadingDemoProps) {
  const { t } = useT('landing');
  const [stage, setStage] = useState<Stage>('prompt');
  const [cards, setCards] = useState<TarotCard[]>([]);
  const [chosen, setChosen] = useState<TarotCard | null>(null);
  const [reversed, setReversed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const drawId = useRef(0);

  const startPicking = useCallback(() => {
    const id = ++drawId.current;
    setDrawing(true);
    fireGtag('free_reading_started');
    void loadDeck()
      .then((deck) => {
        if (id !== drawId.current) return;
        setCards(pickThreeRandom(deck));
        setReversed(Math.random() < 0.3);
        setStage('picking');
      })
      .catch(() => {
        // The deck chunk failed to load (offline, stale deploy): stay on the
        // prompt so the visitor can try again rather than see three blanks.
      })
      .finally(() => {
        if (id === drawId.current) setDrawing(false);
      });
  }, []);

  const pickCard = useCallback((card: TarotCard) => {
    setChosen(card);
    setStage('revealed');
    fireGtag('free_reading_drawn', {
      card_name: card.name,
      card_id: card.id,
      reversed,
    });
  }, [reversed]);

  const reset = useCallback(() => {
    setStage('prompt');
    setChosen(null);
  }, []);

  const handleSignUp = useCallback(() => {
    fireGtag('free_reading_cta_clicked');
    onSignUp();
  }, [onSignUp]);

  return (
    <Card variant="accent" padding="md" className="free-reading">
      {stage === 'prompt' && (
        <div>
          <TarotCardIcon className="w-7 h-7 text-gold mx-auto mb-2" />
          {/* h2: this sits directly under the page's h1, before any section
              heading, so an h3 here skipped a level. */}
          <h2 className="heading-display-md text-mystic-100 mb-1">{t('demo.title')}</h2>
          <p className="text-ui text-mystic-400 mb-4">{t('demo.sub')}</p>
          <Button variant="gold" onClick={startPicking} loading={drawing}>
            {t('demo.drawBtn')}
          </Button>
        </div>
      )}

      {stage === 'picking' && (
        <div>
          <p className="text-ui text-mystic-400">{t('demo.pickCalling')}</p>
          <div className="free-reading-cards" role="group" aria-label={t('demo.pickCalling')}>
            {cards.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="free-reading-card-back"
                onClick={() => pickCard(c)}
                aria-label={t('demo.cardLabel', { n: i + 1 })}
              >
                <img src={CARD_BACK} alt="" decoding="async" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'revealed' && chosen && (
        <div className="free-reading-revealed">
          <div className={`free-reading-card-face lp-flip ${reversed ? 'reversed' : ''}`}>
            {getBundledFullPath(chosen.id) ? (
              <img
                src={getBundledFullPath(chosen.id)!}
                alt={chosen.name}
                width={400}
                height={600}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gold text-meta p-3 text-center">{chosen.name}</div>
            )}
          </div>
          <div className="free-reading-result">
            <p className="text-caption font-semibold uppercase tracking-wider text-gold mb-1">
              {reversed ? t('demo.reversed') : t('demo.upright')}
            </p>
            <h3 className="heading-display-md text-mystic-100">{chosen.name}</h3>
            <div className="free-reading-keywords">
              {chosen.keywords.slice(0, 4).map(k => (
                <span key={k} className="text-caption px-2 py-0.5 rounded-full bg-gold/10 text-gold">{k}</span>
              ))}
            </div>
            <p className="text-ui text-mystic-300 mb-4">
              {(reversed ? chosen.meaningReversed : chosen.meaningUpright).slice(0, 220)}…
            </p>
            <div className="free-reading-ctas">
              <Button variant="gold" onClick={handleSignUp}>
                {t('demo.fullCta')}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </Button>
              <Button variant="ghost" onClick={reset}>
                {t('demo.drawAnother')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
