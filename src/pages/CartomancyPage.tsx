import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Lock } from 'lucide-react';
import { Badge, Button, DeckFan, ListRow, ListRowGroup, Page, PageHeader, Section, Sheet } from '../components/ui';
import { SpreadGlyph, type SpreadGlyphPosition } from '../components/icons';
import { PlayingCardIcon } from '../components/ui/NavIcons';
import { SuitGlyph } from '../components/cartomancy/SuitGlyph';
import { PlayingCardIcon as JokerIcon } from '../components/ui/NavIcons';
import { CartomancyCardDetail } from '../components/cartomancy/CartomancyCardDetail';
import { cartoCardOfTheDay, loadLessonsDone } from '../components/cartomancy/cartoFlow';
import { CARTO_LESSONS, CARTO_SPREADS, PLAYING_CARDS_ALL } from '../data/cartomancy';
import { CARTO_CARD_COUNT, CARTO_LESSON_COUNT } from '../data/counts';
import type { CartoSpread, PlayingCard } from '../types/cartomancy';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizeCartoLesson, localizeCartoSpread, localizePlayingCard } from '../i18n/localizePlayingCard';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { localDateStr } from '../utils/localDate';
import { CartomancyCorpusGate } from '../components/cartomancy/CartomancyCorpusGate';

/**
 * /cartomancy — the hub of the playing-card section.
 *
 * The deck on the table, one line on what the section is, one gold way
 * in; then the card of the day, the nine spreads as rows, the twelve
 * lessons with their ticks, and the library. Public (SEO): a visitor can
 * read the hub, the cards and the guide without an account; the reading
 * itself asks them to sign in.
 */

const CANONICAL = 'https://tarotlife.app/cartomancy';

function glyphLayout(spread: CartoSpread): SpreadGlyphPosition[] {
  const { layout } = spread;
  if (layout.kind === 'arc') return layout.cells.map((c) => ({ x: c.index, y: c.index === 3 ? 0 : c.index === 2 || c.index === 4 ? 1 : 2 }));
  if (layout.kind === 'row') return layout.cells.map((c) => ({ x: c.col, y: 0 }));
  return layout.cells.map((c) => ({ x: c.span && c.span > 1 ? 0.5 : c.col, y: c.row }));
}

function CartomancyPageBody() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const locale = getLocale();
  const localize = useCallback((card: PlayingCard) => localizePlayingCard(card, locale), [locale]);
  const spreads = useMemo(() => CARTO_SPREADS.map((s) => localizeCartoSpread(s, locale)), [locale]);
  const lessons = useMemo(() => CARTO_LESSONS.map((l) => localizeCartoLesson(l, locale)), [locale]);
  const [done] = useState(() => loadLessonsDone());
  const [detail, setDetail] = useState<{ card: PlayingCard; reversed: boolean } | null>(null);

  const today = localDateStr();
  const daily = useMemo(() => cartoCardOfTheDay(user?.id, today), [user?.id, today]);
  const dailyCard = localize(daily.card);

  useEffect(() => {
    setPageMeta(
      t('cartomancy.seo.hubTitle', { defaultValue: 'Playing Card Cartomancy — Readings, Card Meanings and Lessons' }),
      t('cartomancy.seo.hubDesc', {
        defaultValue: 'Read an ordinary 52-card deck: nine spreads from one card to the twenty-one card Romany table, the meaning of every card, and twelve short lessons.',
      }),
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Playing Card Cartomancy',
      url: CANONICAL,
      description: 'Readings with an ordinary 52-card deck, the meaning of all 54 cards, and twelve lessons.',
      hasPart: [
        { '@type': 'ItemList', name: 'Card meanings', url: `${CANONICAL}/cards`, numberOfItems: PLAYING_CARDS_ALL.length },
        { '@type': 'ItemList', name: 'Lessons', url: `${CANONICAL}/guide`, numberOfItems: CARTO_LESSON_COUNT },
      ],
    });
    return () => removeJsonLd();
  }, [t]);

  const openCard = (card: PlayingCard, reversed = false) => {
    if (user) setDetail({ card, reversed });
    else navigate(`/cartomancy/cards/${card.slug}`);
  };

  const doneCount = lessons.filter((l) => done.has(l.slug)).length;

  return (
    <Page spacing="lg">
      <PageHeader eyebrow={t('cartomancy.eyebrow', { defaultValue: 'Cartomancy' })} title={t('cartomancy.title', { defaultValue: 'Playing cards' })} />

      <section className="text-center space-y-5">
        <DeckFan back={profile?.card_back_url} size="lg" />
        <p className="reading-lede mx-auto text-balance">
          {t('cartomancy.home.lede', {
            defaultValue: 'An ordinary deck, read the old way: Hearts for feeling, Clubs for work, Diamonds for money and news, Spades for what must be faced.',
          })}
        </p>
        <Button variant="gold" size="lg" fullWidth onClick={() => navigate('/cartomancy/reading')}>
          {t('cartomancy.home.cta', { defaultValue: 'Start a reading' })}
        </Button>
      </section>

      <Section title={t('cartomancy.home.cardOfDay', { defaultValue: 'Card of the day' })}>
        <ListRowGroup>
          <ListRow
            size="lg"
            icon={daily.card.suit === 'joker' ? <JokerIcon /> : <SuitGlyph suit={daily.card.suit} size={24} />}
            tone={daily.card.color === 'red' ? 'rose' : 'gold'}
            label={dailyCard.name}
            meta={dailyCard.quickMeaning}
            onClick={() => openCard(daily.card)}
          />
        </ListRowGroup>
      </Section>

      <Section
        title={t('cartomancy.home.spreads', { defaultValue: 'Spreads' })}
        description={t('cartomancy.home.spreadsDesc', { defaultValue: 'From one card to the twenty-one card table.' })}
      >
        <ListRowGroup>
          {spreads.map((s) => (
            <ListRow
              key={s.slug}
              size="lg"
              icon={<SpreadGlyph layout={glyphLayout(s)} />}
              tone="gold"
              // The name may take two lines ("Three Cards: Past, Present,
              // Future" does at 390); the description is held to two.
              label={
                <span className="whitespace-normal">
                  {s.name}
                  {!s.free && !profile?.isPremium && (
                    // A plain space, not a margin: when the badge wraps it starts the line flush.
                    <>{' '}<Badge tone="violet" className="align-middle">
                      <Lock className="w-3 h-3" aria-hidden />
                      {t('cartomancy.reading.premium', { defaultValue: 'Premium' })}
                    </Badge></>
                  )}
                </span>
              }
              meta={<span className="line-clamp-2">{s.shortDescription}</span>}
              onClick={() => navigate(`/cartomancy/reading?spread=${s.slug}`)}
            />
          ))}
        </ListRowGroup>
      </Section>

      <Section
        title={t('cartomancy.home.learn', { defaultValue: 'Learn' })}
        description={t('cartomancy.home.learnProgress', { defaultValue: '{{done}} of {{total}} lessons done', done: doneCount, total: lessons.length })}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/cartomancy/guide')}>
            {t('cartomancy.home.seeAll', { defaultValue: 'See all' })}
          </Button>
        }
      >
        <ListRowGroup>
          {lessons.slice(0, 4).map((lesson) => (
            <ListRow
              key={lesson.slug}
              icon={<span className="text-ui font-semibold tabular-nums">{lesson.order}</span>}
              tone={done.has(lesson.slug) ? 'teal' : 'neutral'}
              label={lesson.title}
              meta={<span className="line-clamp-2">{lesson.lede}</span>}
              trailing={done.has(lesson.slug) ? <Check className="w-5 h-5 text-teal" aria-label={t('cartomancy.guide.done', { defaultValue: 'Done' })} /> : 'chevron'}
              onClick={() => navigate(`/cartomancy/guide/${lesson.slug}`)}
            />
          ))}
          <ListRow
            icon={<BookOpen />}
            label={t('cartomancy.home.allLessons', { defaultValue: 'All twelve lessons' })}
            value={`${doneCount}/${lessons.length}`}
            onClick={() => navigate('/cartomancy/guide')}
          />
        </ListRowGroup>
      </Section>

      <Section title={t('cartomancy.home.library', { defaultValue: 'Library' })}>
        <ListRowGroup>
          <ListRow
            size="lg"
            icon={<PlayingCardIcon />}
            tone="gold"
            label={t('cartomancy.home.libraryTitle', { defaultValue: 'Every card’s meaning' })}
            meta={t('cartomancy.home.libraryMeta', { defaultValue: '{{count}} cards and the two Jokers, by suit', count: CARTO_CARD_COUNT })}
            onClick={() => navigate('/cartomancy/cards')}
          />
        </ListRowGroup>
      </Section>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail ? localize(detail.card).name : undefined}>
        {detail && <CartomancyCardDetail card={detail.card} reversed={detail.reversed} localize={localize} onNavigate={(card) => setDetail({ card, reversed: false })} />}
      </Sheet>
    </Page>
  );
}

/** The page, once the playing-card corpus for the active locale is loaded (English: at once). */
export function CartomancyPage() {
  return (
    <CartomancyCorpusGate>
      <CartomancyPageBody />
    </CartomancyCorpusGate>
  );
}
