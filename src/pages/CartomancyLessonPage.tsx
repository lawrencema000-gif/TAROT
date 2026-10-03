import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { Button, EyebrowLabel, ListRow, ListRowGroup, Paper, Section, toast } from '../components/ui';
import { LearnEntryNotFound, LearnEntryTemplate } from '../components/learn/LearnEntryTemplate';
import { CardGrid } from '../components/cartomancy/CardGrid';
import { loadLessonsDone, setLessonDone } from '../components/cartomancy/cartoFlow';
import { CARTO_LESSONS, getCartoLesson, getPlayingCardBySlug } from '../data/cartomancy';
import type { PlayingCard } from '../types/cartomancy';
import { useAuth } from '../context/AuthContext';
import { checkAchievementProgress } from '../services/achievements';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizeCartoLesson, localizePlayingCard } from '../i18n/localizePlayingCard';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';
import { CartomancyCorpusGate } from '../components/cartomancy/CartomancyCorpusGate';

/**
 * /cartomancy/guide/:lesson — one lesson on the learn-entry frame: eyebrow,
 * title, lede on the canvas; the points, the three paragraphs and the
 * practice on paper; the lesson's four cards as faces; the lessons either
 * side; and Mark as done, which ticks the guide and reports the lesson to
 * the Card Reader badge.
 */
function CartomancyLessonPageBody() {
  const { t } = useT('app');
  const { lesson: slug } = useParams<{ lesson: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const locale = getLocale();
  const localize = useCallback((card: PlayingCard) => localizePlayingCard(card, locale), [locale]);
  const source = slug ? getCartoLesson(slug) : null;
  const lesson = useMemo(() => (source ? localizeCartoLesson(source, locale) : null), [source, locale]);
  const [done, setDone] = useState(() => loadLessonsDone());
  const isDone = source ? done.has(source.slug) : false;

  const prev = source ? CARTO_LESSONS.find((l) => l.order === source.order - 1) ?? null : null;
  const next = source ? CARTO_LESSONS.find((l) => l.order === source.order + 1) ?? null : null;
  const cards = useMemo(() => (source ? source.relatedCards.map((s) => getPlayingCardBySlug(s)).filter((c): c is PlayingCard => !!c) : []), [source]);

  useEffect(() => {
    if (!source || !lesson) return;
    window.scrollTo({ top: 0 });
    setPageMeta(
      t('cartomancy.seo.lessonTitle', { defaultValue: '{{title}} — How to Read Playing Cards', title: lesson.title }),
      lesson.lede,
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: source.title,
      description: source.lede,
      author: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      publisher: { '@type': 'Organization', name: 'Arcana', url: 'https://tarotlife.app' },
      url: `https://tarotlife.app/cartomancy/guide/${source.slug}`,
      isPartOf: { '@type': 'ItemList', name: 'How to read playing cards', url: 'https://tarotlife.app/cartomancy/guide' },
    });
    return () => removeJsonLd();
  }, [source, lesson, t]);

  if (!source || !lesson) {
    return (
      <LearnEntryNotFound
        title={t('cartomancy.guide.notFound', { defaultValue: 'That lesson is not in the guide' })}
        backLabel={t('cartomancy.guide.title', { defaultValue: 'Guide' })}
        onBack={() => navigate('/cartomancy/guide')}
      />
    );
  }

  const toggleDone = () => {
    const nextDone = !isDone;
    setDone(setLessonDone(source.slug, nextDone));
    if (nextDone) {
      toast(t('cartomancy.guide.markedDone', { defaultValue: 'Lesson marked as done' }), 'success');
      if (user) checkAchievementProgress(user.id, 'cartomancy_lesson_complete', 1, source.slug);
    }
  };

  return (
    <LearnEntryTemplate
      eyebrow={lesson.eyebrow}
      title={lesson.title}
      lede={lesson.lede}
      backHref="/cartomancy/guide"
      backLabel={t('cartomancy.guide.title', { defaultValue: 'Guide' })}
    >
      <Paper as="article">
        <div className="mx-auto max-w-[66ch] space-y-7">
          <section className="space-y-3">
            <h2 className="heading-display-md heading-strong text-ink">{t('cartomancy.guide.inBrief', { defaultValue: 'In brief' })}</h2>
            <ul className="reading-copy list-disc pl-5 marker:text-ink-gold space-y-2">
              {lesson.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
          <div className="reading-copy border-t border-paper-hairline pt-6">
            {lesson.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <aside className="rounded-control border border-paper-hairline p-5">
            <EyebrowLabel tone="ink" align="left" className="block tracking-[0.18em]">
              {t('cartomancy.guide.practice', { defaultValue: 'Practice' })}
            </EyebrowLabel>
            <p className="reading-copy mt-2">{lesson.practice}</p>
          </aside>
        </div>
      </Paper>

      {cards.length > 0 && (
        <Section title={t('cartomancy.guide.cardsInLesson', { defaultValue: 'Cards in this lesson' })}>
          <CardGrid cards={cards} localize={localize} columns="grid-cols-4" hrefFor={(c) => `/cartomancy/cards/${c.slug}`} onSelect={(c) => navigate(`/cartomancy/cards/${c.slug}`)} />
        </Section>
      )}

      <div className="space-y-3">
        <Button variant={isDone ? 'secondary' : 'gold'} fullWidth size="lg" onClick={toggleDone} aria-pressed={isDone}>
          {isDone ? (
            <>
              <Check className="w-4 h-4" aria-hidden />
              {t('cartomancy.guide.done', { defaultValue: 'Done' })}
            </>
          ) : (
            t('cartomancy.guide.markDone', { defaultValue: 'Mark as done' })
          )}
        </Button>
        {isDone && next && (
          <Button variant="outline" fullWidth onClick={() => navigate(`/cartomancy/guide/${next.slug}`)}>
            {t('cartomancy.guide.nextLesson', { defaultValue: 'Next lesson' })}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Button>
        )}
      </div>

      {(prev || next) && (
        <ListRowGroup>
          {prev && (
            <ListRow
              icon={<span className="text-ui font-semibold tabular-nums">{prev.order}</span>}
              label={localizeCartoLesson(prev, locale).title}
              meta={t('cartomancy.guide.previousLesson', { defaultValue: 'Previous lesson' })}
              onClick={() => navigate(`/cartomancy/guide/${prev.slug}`)}
            />
          )}
          {next && (
            <ListRow
              icon={<span className="text-ui font-semibold tabular-nums">{next.order}</span>}
              label={localizeCartoLesson(next, locale).title}
              meta={t('cartomancy.guide.nextLesson', { defaultValue: 'Next lesson' })}
              onClick={() => navigate(`/cartomancy/guide/${next.slug}`)}
            />
          )}
        </ListRowGroup>
      )}
    </LearnEntryTemplate>
  );
}

/** The page, once the playing-card corpus for the active locale is loaded (English: at once). */
export function CartomancyLessonPage() {
  return (
    <CartomancyCorpusGate>
      <CartomancyLessonPageBody />
    </CartomancyCorpusGate>
  );
}
