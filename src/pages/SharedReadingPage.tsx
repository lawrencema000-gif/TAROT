import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { Page, PageHeader } from '../components/ui';
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
      <Page className="py-16">
        <PageHeader
          align="center"
          onBack={() => navigate('/')}
          backLabel="Back to Arcana"
          title="This reading link is invalid"
          subtitle="The link may be malformed or from an older version of the app."
        />
      </Page>
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
    <Page className="py-6 sm:py-10">
      <PageHeader
        align="center"
        eyebrow="Shared reading"
        title={<>{cards.length}-card {payload.s.replace(/-/g, ' ')}</>}
        subtitle={
          payload.q || payload.d ? (
            <>
              {payload.q && <span className="block italic text-mystic-200">"{payload.q}"</span>}
              {payload.d && <span className="block text-meta mt-1">Drawn {new Date(payload.d).toLocaleDateString()}</span>}
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(({ card, reversed }, idx) => {
          const imgUrl = getBundledFullPath(card.id);
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
              <div className="text-meta text-center text-mystic-400 mb-0.5">Position {idx + 1}</div>
              <div className="text-ui text-center font-medium text-mystic-100">{card.name}</div>
              {reversed && <div className="text-meta text-center uppercase tracking-wider text-gold mt-0.5">Reversed</div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
        <h2 className="heading-display-md text-mystic-100 mb-2">What this reading suggests</h2>
        <div className="reading-copy">
          {cards.map(({ card, reversed }, idx) => (
            <p key={idx}>
              <span className="font-medium text-mystic-100">{card.name}{reversed ? ' (reversed)' : ''}:</span>{' '}
              {(reversed ? card.meaningReversed : card.meaningUpright).split('.')[0]}.
            </p>
          ))}
        </div>
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
    </Page>
  );
}
