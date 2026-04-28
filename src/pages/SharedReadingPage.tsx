import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link2, ArrowLeft, Sparkles } from 'lucide-react';
import { decodeReading } from '../services/shareableReadings';
import { fullDeck } from '../data/tarotDeck';
import { setPageMeta } from '../utils/seo';
import { getBundledFullPath } from '../config/bundledImages';

export function SharedReadingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [shareCopied, setShareCopied] = useState(false);

  const payload = useMemo(() => (token ? decodeReading(token) : null), [token]);

  const cards = useMemo(() => {
    if (!payload) return [];
    return payload.c
      .map(([id, reversedFlag]) => {
        const card = fullDeck.find((c) => c.id === id);
        if (!card) return null;
        return { card, reversed: reversedFlag === 1 };
      })
      .filter((x): x is { card: typeof fullDeck[number]; reversed: boolean } => x !== null);
  }, [payload]);

  useEffect(() => {
    const title = payload
      ? `Shared tarot reading — ${cards.length} cards`
      : 'Shared tarot reading';
    setPageMeta(title, 'A tarot reading shared with you on Arcana. Open the link to see the cards drawn.');
  }, [payload, cards.length]);

  if (!payload) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-mystic-100 mb-2">This reading link is invalid</h1>
        <p className="text-sm text-mystic-400 mb-6">The link may be malformed or from an older version of the app.</p>
        <button onClick={() => navigate('/')} className="px-5 py-2 rounded-xl border border-mystic-700 text-mystic-300 hover:text-mystic-100 hover:border-mystic-500 transition-colors">
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back to Arcana
        </button>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <header className="mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs uppercase tracking-wider text-gold">Shared reading</span>
        </div>
        <h1 className="font-display text-3xl text-mystic-100 mb-2">
          {cards.length}-card {payload.s.replace(/-/g, ' ')}
        </h1>
        {payload.q && (
          <p className="text-sm italic text-mystic-300 max-w-lg mx-auto">"{payload.q}"</p>
        )}
        {payload.d && (
          <p className="text-xs text-mystic-500 mt-1">Drawn {new Date(payload.d).toLocaleDateString()}</p>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {cards.map(({ card, reversed }, idx) => {
          const imgUrl = card.imageUrl ? getBundledFullPath(card.imageUrl) : null;
          return (
            <div key={`${card.id}-${idx}`} className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-3">
              <div className="aspect-[2/3] rounded-xl bg-mystic-950 overflow-hidden mb-2">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={card.name}
                    className={`w-full h-full object-cover ${reversed ? 'rotate-180' : ''}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-mystic-500">{card.name}</div>
                )}
              </div>
              <div className="text-xs text-center text-mystic-500 mb-0.5">Position {idx + 1}</div>
              <div className="text-sm text-center font-medium text-mystic-100">{card.name}</div>
              {reversed && <div className="text-[10px] text-center uppercase tracking-wider text-gold mt-0.5">Reversed</div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 mb-6">
        <h2 className="text-sm font-medium text-mystic-300 mb-2">What this reading suggests</h2>
        <p className="text-sm text-mystic-300 leading-relaxed">
          {cards.map(({ card, reversed }, idx) => (
            <span key={idx}>
              <span className="text-mystic-100">{card.name}{reversed ? ' (reversed)' : ''}:</span>{' '}
              <span className="text-mystic-400">{(reversed ? card.meaningReversed : card.meaningUpright).split('.')[0]}.</span>{' '}
            </span>
          ))}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-xl border border-mystic-700 text-mystic-200 hover:text-mystic-100 hover:border-mystic-500 transition-colors"
        >
          <Link2 className="w-4 h-4 inline mr-2" />
          {shareCopied ? 'Copied!' : 'Copy share link'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold via-gold-dark to-gold text-mystic-950 font-semibold"
        >
          Get your own reading on Arcana
        </button>
      </div>
    </div>
  );
}
