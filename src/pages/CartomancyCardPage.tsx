import { useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Disclaimer, EyebrowLabel, KeywordRow, PageHeader, Paper, Section } from '../components/ui';
import { LearnEntryNotFound } from '../components/learn/LearnEntryTemplate';
import { PlayingCardFace } from '../components/cartomancy/PlayingCardFace';
import { CardGrid } from '../components/cartomancy/CardGrid';
import { cardsOfSuit, getPlayingCardBySlug, isJoker, PLAYING_CARDS_ALL, PLAYING_JOKERS } from '../data/cartomancy';
import type { PlayingCard, PlayingSuit } from '../types/cartomancy';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizePlayingCard } from '../i18n/localizePlayingCard';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { CartomancyCorpusGate } from '../components/cartomancy/CartomancyCorpusGate';

/**
 * /cartomancy/cards/:slug — one card's meaning, public.
 *
 * The face at 256 px on paper, the keywords, then every field the corpus
 * carries as a titled section: meaning, reversed, love, career, advice,
 * timing, as a person (courts and Jokers), and the reflection; the card's
 * named pairings link to their pages. JSON-LD Article and breadcrumbs with
 * English names on the English slug, which is the canonical URL in every
 * locale (TarotCardMeaningPage pattern).
 */

const ORIGIN = 'https://tarotlife.app';

function CartomancyCardPageBody() {
  const { t } = useT('app');
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const locale = getLocale();
  const localize = useCallback((card: PlayingCard) => localizePlayingCard(card, locale), [locale]);

  const source = slug ? getPlayingCardBySlug(slug) : undefined;
  const card = useMemo(() => (source ? localize(source) : null), [source, localize]);
  const index = source ? PLAYING_CARDS_ALL.findIndex((c) => c.id === source.id) : -1;
  const prev = index > 0 ? PLAYING_CARDS_ALL[index - 1] : null;
  const next = index >= 0 && index < PLAYING_CARDS_ALL.length - 1 ? PLAYING_CARDS_ALL[index + 1] : null;
  const related = useMemo(() => (source ? (isJoker(source) ? PLAYING_JOKERS : cardsOfSuit(source.suit as PlayingSuit)).filter((c) => c.id !== source.id) : []), [source]);

  useEffect(() => {
    if (!source || !card) return;
    window.scrollTo({ top: 0 });
    setPageMeta(
      t('cartomancy.seo.cardTitle', { defaultValue: '{{name}} Meaning in Cartomancy — Playing Card Reading', name: card.name }),
      t('cartomancy.seo.cardDesc', { defaultValue: '{{name}} in playing-card reading: {{keywords}}. Upright and reversed, love, career, advice and timing.', name: card.name, keywords: card.keywords.join(', ') }),
    );
    removeJsonLd();
    const url = `${ORIGIN}/cartomancy/cards/${source.slug}`;
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${source.name} Meaning in Cartomancy`,
      description: `${source.name}: ${source.keywords.join(', ')}. The card's meaning in playing-card reading, upright and reversed.`,
      author: { '@type': 'Organization', name: 'Arcana', url: ORIGIN },
      publisher: { '@type': 'Organization', name: 'Arcana', url: ORIGIN },
      url,
      keywords: source.keywords.join(', '),
    });
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN },
        { '@type': 'ListItem', position: 2, name: 'Playing cards', item: `${ORIGIN}/cartomancy` },
        { '@type': 'ListItem', position: 3, name: 'Card meanings', item: `${ORIGIN}/cartomancy/cards` },
        { '@type': 'ListItem', position: 4, name: source.name, item: url },
      ],
    });
    return () => removeJsonLd();
  }, [source, card, t]);

  if (!source || !card) {
    return (
      <LearnEntryNotFound
        title={t('cartomancy.card.notFound', { defaultValue: 'That card is not in the deck' })}
        backLabel={t('cartomancy.cards.hub', { defaultValue: 'Card meanings' })}
        onBack={() => navigate('/cartomancy/cards')}
      />
    );
  }

  const suitLabel = isJoker(source)
    ? t('cartomancy.suits.joker', { defaultValue: 'Joker' })
    : t(`cartomancy.suits.${source.suit}.title`, { defaultValue: source.suit.charAt(0).toUpperCase() + source.suit.slice(1) });

  const section = (title: string, body: string | undefined) =>
    body ? (
      <section key={title} className="space-y-2">
        <h2 className="heading-display-md heading-strong text-ink">{title}</h2>
        <p className="reading-copy">{body}</p>
      </section>
    ) : null;

  const navRow = (target: PlayingCard | null, dir: 'prev' | 'next') => {
    if (!target) return <span className="flex-1" />;
    const name = localize(target).name;
    return (
      <Link
        to={`/cartomancy/cards/${target.slug}`}
        className={`flex flex-1 items-center gap-2 min-h-[48px] rounded-control border border-mystic-700 px-3 text-ui text-mystic-200 no-underline transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:border-mystic-500 active:border-mystic-500 ${dir === 'next' ? 'justify-end text-right' : ''}`}
      >
        {dir === 'prev' && <ChevronLeft className="w-4 h-4 shrink-0 text-mystic-500" aria-hidden />}
        <span className="min-w-0">
          <span className="block text-caption text-mystic-500">{dir === 'prev' ? t('cartomancy.card.previousShort', { defaultValue: 'Previous' }) : t('cartomancy.card.nextShort', { defaultValue: 'Next' })}</span>
          <span className="block truncate">{name}</span>
        </span>
        {dir === 'next' && <ChevronRight className="w-4 h-4 shrink-0 text-mystic-500" aria-hidden />}
      </Link>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      <PageHeader
        as="h1"
        eyebrow={suitLabel}
        title={card.name}
        backHref="/cartomancy/cards"
        onBack={(e) => {
          e.preventDefault();
          navigate('/cartomancy/cards');
        }}
        backLabel={t('cartomancy.cards.hub', { defaultValue: 'Card meanings' })}
      />

      <Paper as="article" tail>
        <div className="mx-auto max-w-[66ch] space-y-7">
          <div className="mx-auto w-64 rounded-card overflow-hidden text-ink-gold [&>svg]:w-full [&>svg]:h-auto [&>svg]:block" aria-hidden>
            <PlayingCardFace card={source} surface="paper" />
          </div>
          <KeywordRow keywords={card.keywords} />
          <p className="reading-lede text-center mx-auto">{card.quickMeaning}</p>

          <div className="space-y-6 border-t border-paper-hairline pt-6">
            {section(t('cartomancy.card.meaning', { defaultValue: 'Meaning' }), card.meaningUpright)}
            {section(t('tarot.reversed'), card.meaningReversed)}
            {section(t('tarot.detail.loveTitle'), card.loveMeaning)}
            {section(t('tarot.detail.careerTitle'), card.careerMeaning)}
            {section(t('cartomancy.card.advice', { defaultValue: 'Advice' }), card.adviceMeaning)}
            {section(t('cartomancy.card.timing', { defaultValue: 'Timing' }), card.timing)}
            {section(t('cartomancy.card.asPerson', { defaultValue: 'As a person' }), card.asPerson)}
            <section className="space-y-2">
              <h2 className="heading-display-md heading-strong text-ink">{t('tarot.detail.reflectionTitle')}</h2>
              <blockquote className="reading-quote">{card.reflectionPrompt}</blockquote>
            </section>
            {card.combinations.length > 0 && (
              <section className="space-y-3">
                <h2 className="heading-display-md heading-strong text-ink">{t('cartomancy.card.withOtherCards', { defaultValue: 'With other cards' })}</h2>
                <ul className="space-y-3">
                  {card.combinations.map((combo) => {
                    const other = getPlayingCardBySlug(combo.with);
                    return (
                      <li key={combo.with} className="reading-copy">
                        {other ? (
                          <Link to={`/cartomancy/cards/${other.slug}`} className="font-semibold">
                            {localize(other).name}
                          </Link>
                        ) : (
                          <strong>{combo.with}</strong>
                        )}
                        . {combo.meaning}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      </Paper>
      <Disclaimer kind="cartomancy" tail />

      <nav className="flex gap-2" aria-label={t('cartomancy.card.deckOrder', { defaultValue: 'Deck order' })}>
        {navRow(prev, 'prev')}
        {navRow(next, 'next')}
      </nav>

      {related.length > 0 && (
        <Section title={isJoker(source) ? t('cartomancy.card.otherJoker', { defaultValue: 'The other Joker' }) : t('cartomancy.card.sameSuit', { defaultValue: 'The rest of the suit' })}>
          <CardGrid cards={related} localize={localize} hrefFor={(c) => `/cartomancy/cards/${c.slug}`} onSelect={(c) => navigate(`/cartomancy/cards/${c.slug}`)} />
        </Section>
      )}

      <div className="text-center space-y-3">
        <EyebrowLabel>{t('cartomancy.eyebrow', { defaultValue: 'Cartomancy' })}</EyebrowLabel>
        <p className="text-ui text-mystic-300">{t('cartomancy.card.readWithDeck', { defaultValue: 'Draw this card for yourself in a reading.' })}</p>
        <Button variant="gold" onClick={() => navigate(user ? '/cartomancy/reading' : '/signin')}>
          {user ? t('cartomancy.home.cta', { defaultValue: 'Start a reading' }) : t('publicNav.signIn', { defaultValue: 'Sign in' })}
        </Button>
      </div>
    </div>
  );
}

/** The page, once the playing-card corpus for the active locale is loaded (English: at once). */
export function CartomancyCardPage() {
  return (
    <CartomancyCorpusGate>
      <CartomancyCardPageBody />
    </CartomancyCorpusGate>
  );
}
