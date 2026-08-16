import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '../ui';
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
  const navigate = useNavigate();
  // Recomputed per mount; the mansion turns over at CST midnight and the whole
  // calculation is a subtraction, so there is nothing to memoise across days.
  const mansion = useMemo(() => mansionForDate(new Date()), []);
  if (!mansion) return null;

  const meaning = MANSION_MEANINGS[mansion.key];
  const advice = MANSION_DAILY_ADVICE[mansion.key];

  return (
    <Card
      className="p-4 cursor-pointer hover:border-gold/30 transition-colors active:scale-[0.99]"
      onClick={() => navigate('/mansions')}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl text-gold flex-shrink-0" style={{ fontFamily: 'serif' }}>
          {mansion.cn}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-wider text-mystic-500">
              Today’s mansion
            </span>
            <span className="text-[10px] text-mystic-600">
              {mansion.cn}{PLANET7_INFO[mansion.planet].cn}{mansion.animalCn}
            </span>
          </div>
          <div className="text-sm text-mystic-100">{meaning?.title}</div>
          <p className="text-xs text-mystic-400 leading-relaxed line-clamp-2 mt-0.5">{advice}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-mystic-600 flex-shrink-0" />
      </div>
    </Card>
  );
}
