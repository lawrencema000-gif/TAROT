import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { ListRow, ListRowGroup, Page, PageHeader, Progress } from '../components/ui';
import { loadLessonsDone } from '../components/cartomancy/cartoFlow';
import { CARTO_LESSONS } from '../data/cartomancy';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { localizeCartoLesson } from '../i18n/localizePlayingCard';
import { setPageMeta } from '../utils/seo';
import { addJsonLd, removeJsonLd } from '../utils/seoHelpers';

/**
 * /cartomancy/guide — the twelve lessons in reading order, with the ticks
 * this viewer has earned (localStorage; a convenience, not a record).
 */
export function CartomancyGuidePage() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const locale = getLocale();
  const lessons = useMemo(() => CARTO_LESSONS.map((l) => localizeCartoLesson(l, locale)), [locale]);
  const [done] = useState(() => loadLessonsDone());
  const doneCount = lessons.filter((l) => done.has(l.slug)).length;

  useEffect(() => {
    setPageMeta(
      t('cartomancy.seo.guideTitle', { defaultValue: 'How to Read Playing Cards — Twelve Lessons' }),
      t('cartomancy.seo.guideDesc', { defaultValue: 'Learn cartomancy from the deck in your hand: the suits, the numbers, the court cards, red and black, combinations, timing and the big spreads.' }),
    );
    removeJsonLd();
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'How to read playing cards',
      url: 'https://tarotlife.app/cartomancy/guide',
      itemListElement: CARTO_LESSONS.map((l) => ({ '@type': 'ListItem', position: l.order, name: l.title, url: `https://tarotlife.app/cartomancy/guide/${l.slug}` })),
    });
    return () => removeJsonLd();
  }, [t]);

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow={t('cartomancy.eyebrow', { defaultValue: 'Cartomancy' })}
        title={t('cartomancy.guide.title', { defaultValue: 'Guide' })}
        subtitle={t('cartomancy.guide.subtitle', { defaultValue: 'Twelve short lessons, in order. Each one ends with something to try with a real deck.' })}
        backHref="/cartomancy"
        onBack={(e) => {
          e.preventDefault();
          navigate('/cartomancy');
        }}
        backLabel={t('cartomancy.title', { defaultValue: 'Playing cards' })}
      />

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-meta text-mystic-400">{t('cartomancy.guide.progress', { defaultValue: 'Progress' })}</span>
          <span className="text-meta tabular-nums text-mystic-300">
            {t('cartomancy.home.learnProgress', { defaultValue: '{{done}} of {{total}} lessons done', done: doneCount, total: lessons.length })}
          </span>
        </div>
        <Progress value={doneCount} max={lessons.length} size="sm" label={t('cartomancy.guide.progress', { defaultValue: 'Progress' })} />
      </div>

      <ListRowGroup>
        {lessons.map((lesson) => {
          const isDone = done.has(lesson.slug);
          return (
            <ListRow
              key={lesson.slug}
              size="lg"
              icon={<span className="text-ui font-semibold tabular-nums">{lesson.order}</span>}
              tone={isDone ? 'teal' : 'neutral'}
              label={lesson.title}
              meta={lesson.lede}
              trailing={isDone ? <Check className="w-5 h-5 text-teal" aria-label={t('cartomancy.guide.done', { defaultValue: 'Done' })} /> : 'chevron'}
              onClick={() => navigate(`/cartomancy/guide/${lesson.slug}`)}
            />
          );
        })}
      </ListRowGroup>
    </Page>
  );
}
