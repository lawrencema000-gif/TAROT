import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { Button, Page, PageHeader } from '../components/ui';
import { decodeReading, sharedDeck } from '../services/shareableReadings';
import { fullDeck } from '../data/tarotDeck';
import { getSpreadBySlug } from '../data/tarotSpreads';
import { getCartoSpread, getPlayingCard } from '../data/cartomancy';
import type { PlayingCard } from '../types/cartomancy';
import type { TarotCard } from '../types';
import { PlayingCardFace } from '../components/cartomancy/PlayingCardFace';
import { setPageMeta } from '../utils/seo';
import { getBundledFullPath } from '../config/bundledImages';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizeCard } from '../i18n/localizeCard';
import { localizeCartoSpread, localizePlayingCard } from '../i18n/localizePlayingCard';

/**
 * /reading/:token — a reading someone shared.
 *
 * The token names the spread and the cards; `k: 'p'` (or a `carto-` slug)
 * says they are the playing deck's, drawn as faces, otherwise the tarot
 * deck's bundled art. The title is the spread's own name — the six legacy
 * ids, the tarot catalogue and the cartomancy spreads are all looked up —
 * rather than the slug with its hyphens knocked out.
 */

type SharedCard = { kind: 'tarot'; card: TarotCard; reversed: boolean } | { kind: 'playing'; card: PlayingCard; reversed: boolean };

const LEGACY_SPREAD_KEY: Record<string, string> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
  relationship: 'relationship',
  career: 'careerSpread',
  shadow: 'shadow',
};

export function SharedReadingPage() {
  const { t } = useT('app');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [shareCopied, setShareCopied] = useState(false);
  const locale = getLocale();

  const payload = useMemo(() => (token ? decodeReading(token) : null), [token]);
  const deck = payload ? sharedDeck(payload) : 'tarot';

  const cards = useMemo<SharedCard[]>(() => {
    if (!payload) return [];
    const out: SharedCard[] = [];
    for (const [id, reversedFlag] of payload.c) {
      const reversed = reversedFlag === 1;
      if (deck === 'playing') {
        const card = getPlayingCard(id);
        if (card) out.push({ kind: 'playing', card: localizePlayingCard(card, locale), reversed });
      } else {
        const card = fullDeck.find((c) => c.id === id);
        if (card) out.push({ kind: 'tarot', card: localizeCard(card, locale), reversed });
      }
    }
    return out;
  }, [payload, deck, locale]);

  const spreadName = useMemo(() => {
    if (!payload) return '';
    if (deck === 'playing') {
      const spread = getCartoSpread(payload.s);
      if (spread) return localizeCartoSpread(spread, locale).name;
    }
    const legacy = LEGACY_SPREAD_KEY[payload.s];
    if (legacy) return t(`readings.spreads.${legacy}.name`);
    const catalogue = getSpreadBySlug(payload.s);
    if (catalogue) return catalogue.name;
    return payload.s.replace(/^carto-/, '').replace(/-/g, ' ');
  }, [payload, deck, locale, t]);

  useEffect(() => {
    const title = payload
      ? deck === 'playing'
        ? t('cartomancy.shared.title', { defaultValue: 'Shared playing-card reading — {{count}} cards', count: cards.length })
        : `Shared tarot reading — ${cards.length} cards`
      : 'Shared tarot reading';
    setPageMeta(title, 'A reading shared with you on Arcana. Open the link to see the cards drawn.');
  }, [payload, deck, cards.length, t]);

  if (!payload) {
    return (
      <Page className="max-w-2xl mx-auto py-16">
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

  const reversedLabel = t('readings.revealView.reversed');

  return (
    <Page className="max-w-2xl mx-auto py-6 sm:py-10">
      <PageHeader
        align="center"
        eyebrow={deck === 'playing' ? t('cartomancy.shared.eyebrow', { defaultValue: 'Shared playing-card reading' }) : 'Shared reading'}
        title={spreadName}
        subtitle={
          payload.q || payload.d ? (
            <>
              {payload.q && <span className="block italic text-mystic-200">“{payload.q}”</span>}
              {payload.d && <span className="block text-meta mt-1">Drawn {new Date(payload.d).toLocaleDateString()}</span>}
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((item, idx) => (
          <div key={`${item.card.id}-${idx}`} className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-3">
            <div className="aspect-[2/3] rounded-control bg-mystic-950 overflow-hidden mb-2 text-gold [&>svg]:w-full [&>svg]:h-full [&>svg]:block">
              {item.kind === 'playing' ? (
                <PlayingCardFace card={item.card} reversed={item.reversed} />
              ) : getBundledFullPath(item.card.id) ? (
                <img
                  src={getBundledFullPath(item.card.id) ?? undefined}
                  alt={item.card.name}
                  className={`w-full h-full object-cover ${item.reversed ? 'rotate-180' : ''}`}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-caption text-mystic-500">{item.card.name}</div>
              )}
            </div>
            <div className="text-meta text-center text-mystic-400 mb-0.5">{t('readings.positions.generic', { index: idx + 1 })}</div>
            <div className="text-ui text-center font-medium text-mystic-100">{item.card.name}</div>
            {item.reversed && <div className="text-meta text-center uppercase tracking-wider text-gold mt-0.5">{reversedLabel}</div>}
          </div>
        ))}
      </div>

      <div className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4">
        <h2 className="heading-display-md text-mystic-100 mb-2">What this reading suggests</h2>
        <div className="reading-copy">
          {cards.map((item, idx) => {
            const meaning = item.reversed ? item.card.meaningReversed ?? item.card.meaningUpright : item.card.meaningUpright;
            return (
              <p key={idx}>
                <span className="font-medium text-mystic-100">{item.card.name}{item.reversed ? ` (${reversedLabel.toLowerCase()})` : ''}:</span>{' '}
                {meaning.split('.')[0]}.
              </p>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          <Link2 className="w-4 h-4" aria-hidden />
          {shareCopied ? t('common:actions.copied', { defaultValue: 'Copied.' }) : 'Copy share link'}
        </Button>
        <Button variant="gold" className="flex-1" onClick={() => navigate(deck === 'playing' ? '/cartomancy' : '/')}>
          {deck === 'playing' ? t('cartomancy.shared.cta', { defaultValue: 'Read the deck yourself on Arcana' }) : 'Get your own reading on Arcana'}
        </Button>
      </div>
    </Page>
  );
}
