import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { Button, Disclaimer, Page, PageHeader, Paper, ListSkeleton, TarotFace } from '../components/ui';
import { decodeReading, endVisit, keepVisitLanguage, sharedDeck, sharedReadingLocale, showVisitIn } from '../services/shareableReadings';
import { useAuth } from '../context/AuthContext';
import { calendarDay } from '../components/readings/tarot/readingDates';
import { fullDeck } from '../data/tarotDeck';
import { getCartoSpread, getPlayingCard } from '../data/cartomancy';
import type { PlayingCard } from '../types/cartomancy';
import type { TarotCard } from '../types';
import { PlayingCardFace } from '../components/cartomancy/PlayingCardFace';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizeCard } from '../i18n/localizeCard';
import { localizeCartoSpread, localizePlayingCard, useCartomancyCorpus } from '../i18n/localizePlayingCard';
import { cartoPositionLabel } from '../components/cartomancy/cartoFlow';
import { firstSentences } from '../components/readings/tarot/readingText';
import { LEGACY_SPREAD_KEY, isCustomSpreadId, tarotPositionLabel, tarotSpreadTitle } from '../components/readings/tarot/spreadLabels';
import { getSpreadBySlug } from '../data/tarotSpreads';
import { getSpreadCardCount } from '../services/readingInterpretation';

/**
 * /reading/:token — a reading someone shared, as one public page in every
 * locale and for both decks.
 *
 * The token names the spread by its stable id and the cards by id; `k: 'p'`
 * (or a `carto-` slug) says they are the playing deck's. The page is the
 * app's own: tarot faces through TarotFace (the art inverted for a reversed
 * card, the localized plate upright), playing cards through
 * PlayingCardFace; the spread and its positions named as the reveal names
 * them (spreadLabels — legacy ids, catalogue slugs, custom spreads); every
 * word of chrome through t(); each card's meaning cut to two sentences in
 * any script (。 included).
 */

type SharedCard = { kind: 'tarot'; card: TarotCard; reversed: boolean } | { kind: 'playing'; card: PlayingCard; reversed: boolean };

/** Catalogue slugs TarotSection casts as a legacy id (as spreadLabels reads them). */
const TAROT_ALIAS: Record<string, string> = {
  'one-card-daily': 'single',
  'three-card-past-present-future': 'three-card',
  'relationship-cross': 'relationship',
};

/** How many positions a tarot spread names, or null when only the reader's account knows (a custom spread). */
function tarotSpreadSize(spreadId: string): number | null {
  const id = TAROT_ALIAS[spreadId] ?? spreadId;
  if (LEGACY_SPREAD_KEY[id]) return getSpreadCardCount(id);
  if (isCustomSpreadId(id)) return null;
  return getSpreadBySlug(id)?.positions.length ?? null;
}

export function SharedReadingPage() {
  const { t } = useT('app');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { user } = useAuth();
  const [shareCopied, setShareCopied] = useState(false);
  const locale = getLocale();

  /*
   * The language the reading was shared in (`?hl=`, buildShareUrl). A friend
   * opening a Japanese reader's link signed out, in English — the language
   * every first visit starts in, since the detector ignores the browser's
   * — sees the page in Japanese, on this page only (showVisitIn stores
   * nothing). A reader who is signed in, or reads the app in a language of
   * their own, keeps theirs (p8 F76). Leaving the page ends it (endVisit):
   * the public nav's Sign in used to open the form and the signed-in app in
   * Japanese and write 'ja' into the account (p9 R12). Taking the page's own
   * invitation into the app ("Get your own reading", in Japanese) keeps the
   * language: that is a choice, where opening a link is not.
   */
  const [visitLocale] = useState(() => {
    const shared = sharedReadingLocale(search);
    return shared && !user && locale === 'en' ? shared : null;
  });
  const [adopting, setAdopting] = useState(visitLocale !== null);
  useEffect(() => {
    if (!visitLocale) return;
    let live = true;
    showVisitIn(visitLocale)
      .catch(() => {})
      .finally(() => {
        if (live) setAdopting(false);
      });
    return () => {
      live = false;
      void endVisit();
    };
    // Once, on arrival: the link's language, before anything is drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo(() => (token ? decodeReading(token) : null), [token]);
  const deck = payload ? sharedDeck(payload) : 'tarot';
  // A playing-card reading reads the corpus, fetched on demand in ja/ko/zh.
  const cartoReady = useCartomancyCorpus(deck === 'playing');

  // Each memo reads the corpus through `cartoReady`: nothing is derived from
  // a playing-card reading until its locale's corpus is in the store.
  const cards = useMemo<SharedCard[]>(() => {
    if (!payload || (deck === 'playing' && !cartoReady)) return [];
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
  }, [payload, deck, locale, cartoReady]);

  /**
   * What each position is called (1-based): the spread's own names, else
   * "Position n". A table dealt with a different number of cards than the
   * spread names (the five-card Yes or No of a three-position spread) is
   * numbered card by card instead, as the reveal numbers it: three named
   * positions followed by "Position 4" and "Position 5" read as a spread
   * the reader never laid.
   */
  const positionLabel = useMemo(() => {
    const generic = (n: number) => t('readings.positions.generic', { index: n });
    if (!payload) return generic;
    const numbered = (n: number) => t('readings.selectView.cardN', { n, defaultValue: 'Card {{n}}' });
    const dealt = payload.c.length;
    if (deck === 'playing') {
      if (!cartoReady) return generic;
      const spread = getCartoSpread(payload.s);
      if (spread && spread.cardCount !== dealt) return numbered;
      const localized = spread ? localizeCartoSpread(spread, locale) : null;
      return (n: number) => cartoPositionLabel(localized, n - 1, generic);
    }
    const size = tarotSpreadSize(payload.s);
    if (size !== null && size !== dealt) return numbered;
    return (n: number) => tarotPositionLabel(t, payload.s, n - 1);
  }, [payload, deck, locale, t, cartoReady]);

  const spreadName = useMemo(() => {
    if (!payload) return '';
    if (deck === 'playing') {
      if (!cartoReady) return '';
      const spread = getCartoSpread(payload.s);
      if (spread) return localizeCartoSpread(spread, locale).name;
      return t('cartomancy.shared.eyebrow', { defaultValue: 'Shared playing-card reading' });
    }
    return tarotSpreadTitle(t, payload.s);
  }, [payload, deck, locale, t, cartoReady]);

  useEffect(() => {
    const title = payload
      ? deck === 'playing'
        ? t('cartomancy.shared.title', { defaultValue: 'Shared playing-card reading — {{count}} cards', defaultValue_one: 'Shared playing-card reading — one card', count: cards.length })
        : t('sharedReading.pageTitle', { defaultValue: 'Shared tarot reading — {{count}} cards', defaultValue_one: 'Shared tarot reading — one card', count: cards.length })
      : t('sharedReading.pageTitleInvalid', { defaultValue: 'Shared tarot reading' });
    setPageMeta(
      title,
      t('sharedReading.pageDescription', { defaultValue: 'A reading shared with you on Arcana. Open the link to see the cards drawn.' }),
    );
  }, [payload, deck, cards.length, t]);

  // The link's language is on its way (showVisitIn): nothing in English first.
  if (adopting) {
    return (
      <Page className="max-w-2xl mx-auto py-6 sm:py-10">
        <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
          <ListSkeleton count={3} />
        </div>
      </Page>
    );
  }

  if (!payload) {
    return (
      <Page className="max-w-2xl mx-auto py-16">
        <PageHeader
          align="center"
          onBack={() => navigate('/')}
          backLabel={t('sharedReading.backToArcana', { defaultValue: 'Back to Arcana' })}
          title={t('sharedReading.invalidTitle', { defaultValue: 'This reading link is invalid' })}
          subtitle={t('sharedReading.invalidBody', { defaultValue: 'The link may be malformed or from an older version of the app.' })}
        />
      </Page>
    );
  }

  if (deck === 'playing' && !cartoReady) {
    return (
      <Page className="max-w-2xl mx-auto py-6 sm:py-10">
        <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
          <ListSkeleton count={3} />
        </div>
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
  // Links made before Phase 7 carry a date-only `d` ('2026-09-01'): that is
  // the sharer's calendar day, not UTC midnight (the day before in the
  // Americas). Newer links carry the instant. A malformed one shows no date.
  const drawnOn = payload.d ? calendarDay(payload.d) : null;
  const drawnLabel =
    drawnOn && !Number.isNaN(drawnOn.getTime())
      ? t('sharedReading.drawn', { defaultValue: 'Drawn {{date}}', date: drawnOn.toLocaleDateString(locale, { dateStyle: 'medium' }) })
      : null;
  // The table: one card large in the middle, two side by side, three or more in rows of three.
  const table =
    cards.length === 1
      ? 'grid grid-cols-1 max-w-[10rem] mx-auto'
      : cards.length === 2
        ? 'grid grid-cols-2 gap-3 max-w-[15.75rem] mx-auto'
        : 'grid grid-cols-3 gap-2 sm:gap-3';

  return (
    <Page className="max-w-2xl mx-auto py-6 sm:py-10">
      <PageHeader
        align="center"
        eyebrow={
          deck === 'playing'
            ? t('cartomancy.shared.eyebrow', { defaultValue: 'Shared playing-card reading' })
            : t('sharedReading.eyebrow', { defaultValue: 'Shared reading' })
        }
        title={<span className="lining-nums">{spreadName}</span>}
        subtitle={
          payload.q || drawnLabel ? (
            <>
              {payload.q && <span className="block italic text-mystic-200">“{payload.q}”</span>}
              {drawnLabel && <span className="block text-meta mt-1">{drawnLabel}</span>}
            </>
          ) : undefined
        }
      />

      {/* The table on navy, the cards in the order they were dealt. */}
      <div className={table}>
        {cards.map((item, idx) => (
          <div key={`${item.card.id}-${idx}`} className="text-center min-w-0">
            {item.kind === 'playing' ? (
              <div className="aspect-[2/3] rounded-inset bg-mystic-900 overflow-hidden text-gold [&>svg]:w-full [&>svg]:h-full [&>svg]:block">
                <PlayingCardFace card={item.card} reversed={item.reversed} detail={cards.length >= 3 ? 'quiet' : 'full'} />
              </div>
            ) : (
              <TarotFace
                card={item.card}
                size="fill"
                reversed={item.reversed}
                reversedTag={false}
                radius={cards.length === 1 ? 'card' : 'inset'}
                loading="lazy"
                alt=""
              />
            )}
            <p className="mt-2 text-caption text-mystic-400 leading-tight">{positionLabel(idx + 1)}</p>
            <p className="mt-0.5 text-meta font-medium text-mystic-100 leading-snug">{item.card.name}</p>
            {item.reversed && <p className="text-caption text-gold">{reversedLabel}</p>}
          </div>
        ))}
      </div>

      <div>
        <Paper tail>
          <h2 className="heading-display-md heading-strong text-ink">
            {t('sharedReading.suggests', { defaultValue: 'What this reading suggests' })}
          </h2>
          <div className="mt-4 divide-y divide-paper-hairline">
            {cards.map((item, idx) => {
              const meaning = item.reversed ? item.card.meaningReversed ?? item.card.meaningUpright : item.card.meaningUpright;
              return (
                <section key={idx} className="py-4 first:pt-0 last:pb-0">
                  <p className="font-display-eyebrow lining-nums">{positionLabel(idx + 1)}</p>
                  <h3 className="mt-1 text-ui font-semibold text-ink">
                    {item.card.name}
                    {item.reversed && <span className="ml-2 text-meta font-medium text-ink-coral">{reversedLabel}</span>}
                  </h3>
                  <p className="reading-copy mt-1">{firstSentences(meaning, 2)}</p>
                </section>
              );
            })}
          </div>
        </Paper>
        <Disclaimer kind={deck === 'playing' ? 'cartomancy' : 'tarot'} tail />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          <Link2 className="w-4 h-4" aria-hidden />
          {shareCopied ? t('common:actions.copied', { defaultValue: 'Copied.' }) : t('sharedReading.copyLink', { defaultValue: 'Copy share link' })}
        </Button>
        <Button
          variant="gold"
          className="flex-1"
          onClick={() => {
            // Into the app in the language the page was read in (see visitLocale):
            // kept before the page unmounts, so leaving does not undo it.
            void keepVisitLanguage();
            navigate(deck === 'playing' ? '/cartomancy' : '/');
          }}
        >
          {deck === 'playing'
            ? t('cartomancy.shared.cta', { defaultValue: 'Read the deck yourself on Arcana' })
            : t('sharedReading.cta', { defaultValue: 'Get your own reading on Arcana' })}
        </Button>
      </div>
    </Page>
  );
}
