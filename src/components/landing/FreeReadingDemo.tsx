import { useState, useCallback } from 'react';
import { fullDeck } from '../../data/tarotDeck';
import { getBundledFullPath } from '../../config/bundledImages';
import type { TarotCard } from '../../types';

/**
 * Free 1-card demo reading — no signup required.
 *
 * Cold ad traffic hits this on the landing page hero. User picks one of
 * three face-down cards, watches a reveal animation, and sees the card
 * meaning + keywords. Soft CTA at the end drives into full onboarding.
 *
 * Fires a gtag micro-conversion on draw so Google Ads can optimize for
 * engaged visitors even before they sign up.
 */

type Stage = 'prompt' | 'picking' | 'revealed';

function pickThreeRandom(): TarotCard[] {
  const pool = [...fullDeck];
  const out: TarotCard[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  // Window type is extended in src/services/analytics.ts
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === 'function') {
    try { w.gtag('event', event, params || {}); } catch { /* ignore */ }
  }
}

interface FreeReadingDemoProps {
  onSignUp: () => void;
}

export function FreeReadingDemo({ onSignUp }: FreeReadingDemoProps) {
  const [stage, setStage] = useState<Stage>('prompt');
  const [cards, setCards] = useState<TarotCard[]>([]);
  const [chosen, setChosen] = useState<TarotCard | null>(null);
  const [reversed, setReversed] = useState(false);

  const startPicking = useCallback(() => {
    setCards(pickThreeRandom());
    setReversed(Math.random() < 0.3);
    setStage('picking');
    fireGtag('free_reading_started');
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
    <div className="free-reading">
      {stage === 'prompt' && (
        <div className="free-reading-prompt">
          <div className="free-reading-icon">✦</div>
          <h3 className="free-reading-title">Try a free reading</h3>
          <p className="free-reading-sub">Ask a question, then draw a card. No signup.</p>
          <button className="lp-btn-gold free-reading-btn" onClick={startPicking}>
            Draw Your Card
          </button>
        </div>
      )}

      {stage === 'picking' && (
        <div className="free-reading-picking">
          <p className="free-reading-sub">Pick the card that calls to you.</p>
          <div className="free-reading-cards">
            {cards.map((c, i) => (
              <button
                key={c.id}
                className="free-reading-card-back"
                onClick={() => pickCard(c)}
                aria-label={`Card ${i + 1}`}
              >
                <span className="free-reading-card-glyph">☽</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'revealed' && chosen && (
        <div className="free-reading-revealed">
          <div className={`free-reading-card-face ${reversed ? 'reversed' : ''}`}>
            {getBundledFullPath(chosen.id) ? (
              <img
                src={getBundledFullPath(chosen.id)!}
                alt={chosen.name}
                className="free-reading-card-img"
                loading="lazy"
              />
            ) : (
              <div className="free-reading-card-fallback">{chosen.name}</div>
            )}
          </div>
          <div className="free-reading-result">
            <p className="free-reading-orientation">
              {reversed ? 'Reversed' : 'Upright'}
            </p>
            <h4 className="free-reading-card-name">{chosen.name}</h4>
            <div className="free-reading-keywords">
              {chosen.keywords.slice(0, 4).map(k => (
                <span key={k} className="free-reading-keyword">{k}</span>
              ))}
            </div>
            <p className="free-reading-meaning">
              {(reversed ? chosen.meaningReversed : chosen.meaningUpright).slice(0, 220)}…
            </p>
            <div className="free-reading-ctas">
              <button className="lp-btn-gold" onClick={handleSignUp}>
                Get your full reading →
              </button>
              <button className="free-reading-draw-again" onClick={reset}>
                Draw another card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
