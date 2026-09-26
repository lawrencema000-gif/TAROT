import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, EyebrowLabel } from '../ui';
import { useT } from '../../i18n/useT';
import { mansionForDate, PLANET7_INFO } from '../../data/lunarMansions';
import { MANSION_MEANINGS, MANSION_DAILY_ADVICE } from '../../data/lunarMansionsContent';

/**
 * Today's 值日 mansion, for the daily ritual loop.
 *
 * A single line of almanac guidance — the oldest daily-guidance system there
 * is, and one that changes every day without needing the user's birth data, so
 * it works from the very first session.
 */
export function DailyMansionCard() {
  const { t } = useT('app');
  const navigate = useNavigate();
  // Recomputed per mount; the mansion turns over at CST midnight and the whole
  // calculation is a subtraction, so there is nothing to memoise across days.
  const mansion = useMemo(() => mansionForDate(new Date()), []);
  if (!mansion) return null;

  const meaning = MANSION_MEANINGS[mansion.key];
  const advice = MANSION_DAILY_ADVICE[mansion.key];

  return (
    <Card padding="md" interactive role="link" tabIndex={0} onClick={() => navigate('/mansions')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/mansions'); } }}>
      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-control bg-gold/10 text-gold font-display text-title flex items-center justify-center shrink-0" aria-hidden>
          {mansion.cn}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <EyebrowLabel>{t('home.todaysMansion', { defaultValue: 'Today’s mansion' })}</EyebrowLabel>
            <span className="text-caption text-mystic-500">
              {mansion.cn}{PLANET7_INFO[mansion.planet].cn}{mansion.animalCn}
            </span>
          </div>
          <div className="text-ui text-mystic-100 mt-0.5">{meaning?.title}</div>
          <p className="text-meta text-mystic-400 leading-relaxed line-clamp-2 mt-0.5">{advice}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-mystic-500 shrink-0" aria-hidden />
      </div>
    </Card>
  );
}
