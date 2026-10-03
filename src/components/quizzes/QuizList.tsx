import { useMemo } from 'react';
import { Button, Chip, ListRow, ListSkeleton, Tag } from '../ui';
import { useT } from '../../i18n/useT';
import type { QuizDefinition } from '../../types';
import type { QuizCategory, QuizMetadataEntry } from '../../data/quizzes';
import { CATEGORY_ORDER, CATEGORY_LABEL_EN, TILE_INK } from './shared';
import { QuizGlyph } from './icons';
import { resultChipLabel } from './chipLabel';
import { relativeDay } from './relativeDay';

export interface QuizListEntry {
  quiz: QuizDefinition;
  metadata: QuizMetadataEntry;
}

export interface QuizLastResult {
  label?: string;
  completed_at: string;
}

export interface QuizListProps {
  entries: QuizListEntry[];
  loading: boolean;
  lastResultFor: (quizId: string) => QuizLastResult | undefined;
  onStart: (quiz: QuizDefinition) => void;
  onSeeResult: (quiz: QuizDefinition) => void;
  locale: string;
  /** The category tab on screen. The page owns it, so it survives a quiz. */
  category: QuizCategory;
  onCategoryChange: (category: QuizCategory) => void;
}

/**
 * The quiz shelf (R6 A31): compact rows grouped under Chip tabs by
 * category, two columns at lg, three at xl. A row that has a result shows
 * its chip and splits into "See result · Retake" (A33) instead of making
 * the whole card one ambiguous tap. The page owns the Page + PageHeader
 * around this (titles gate); this is the body.
 */
export function QuizList({ entries, loading, lastResultFor, onStart, onSeeResult, locale, category, onCategoryChange }: QuizListProps) {
  const { t } = useT('app');

  const grouped = useMemo(() => {
    const map = new Map<QuizCategory, QuizListEntry[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const e of entries) map.get(e.metadata.category)?.push(e);
    return map;
  }, [entries]);

  const rows = grouped.get(category) ?? [];
  const typeLabel = (n: number) =>
    n === 1 ? t('quizzes.list.oneQuestion', { defaultValue: '1 question' }) : t('quizzes.list.questions', { defaultValue: '{{n}} questions', n });

  return (
    <>
      <div
        role="group"
        aria-label={t('quizzes.list.categories.label', { defaultValue: 'Quiz categories' })}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 scroll-px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x"
      >
        {CATEGORY_ORDER.map((c) => (
          <Chip
            key={c}
            selected={category === c}
            onSelect={() => onCategoryChange(c)}
            label={`${t(`quizzes.list.categories.${c}`, { defaultValue: CATEGORY_LABEL_EN[c] })} · ${grouped.get(c)?.length ?? 0}`}
          />
        ))}
      </div>

      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <ul
          className="
            overflow-hidden rounded-card border border-mystic-700 bg-mystic-850 divide-y divide-mystic-700
            lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:divide-y-0
          "
        >
          {rows.map(({ quiz, metadata }) => {
            const last = lastResultFor(quiz.id);
            const chip = last ? resultChipLabel(quiz, last.label, t) : undefined;
            const tile = TILE_INK[metadata.color] ?? 'text-gold';
            const meta = `${metadata.timeEstimate} · ${typeLabel(quiz.questions.length)}`;
            return (
              <li key={quiz.id} className="lg:overflow-hidden lg:rounded-card lg:border lg:border-mystic-700 lg:bg-mystic-850">
                {last ? (
                  <div>
                    <ListRow
                      icon={<QuizGlyph icon={metadata.icon} className={`h-5 w-5 ${tile}`} />}
                      label={quiz.title}
                      meta={`${meta} · ${relativeDay(last.completed_at, locale)}`}
                      trailing="none"
                    />
                    {/* The verdict sits under the title, not in the row's value
                        slot: that slot is capped at 45% and clipped "Higher
                        signal — reach out" mid-word at 390px. */}
                    {chip && (
                      <div className="-mt-1 px-4 pb-2 pl-[68px]">
                        <Tag tone="gold" size="sm" className="max-w-full">
                          <span className="min-w-0 truncate">{chip}</span>
                        </Tag>
                      </div>
                    )}
                    <div className="flex gap-2 px-4 pb-3 pl-[68px]">
                      <Button size="sm" variant="outline" onClick={() => onSeeResult(quiz)}>
                        {t('quizzes.list.seeResult', { defaultValue: 'See result' })}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onStart(quiz)}>
                        {t('quizzes.retake', { defaultValue: 'Retake' })}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ListRow
                    icon={<QuizGlyph icon={metadata.icon} className={`h-5 w-5 ${tile}`} />}
                    label={quiz.title}
                    meta={meta}
                    onClick={() => onStart(quiz)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
