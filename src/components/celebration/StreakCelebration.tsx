import { Button, Sheet } from '../ui';
import { useT } from '../../i18n/useT';
import { StreakConstellation, type ConstellationNight } from './StreakConstellation';

interface StreakCelebrationProps {
  streak: number;
  open: boolean;
  onClose: () => void;
  /** The last fortnight of ritual rows, oldest first. */
  nights: ConstellationNight[];
  /** ISO date of today, to mark tonight's star. */
  today: string;
  /** Opened because the ritual was just completed, not from the streak pill. */
  justCompleted?: boolean;
}

/**
 * The streak, shown as the nights it is made of.
 *
 * This was a modal with a pulsing flame, a ping ring and twenty random
 * tri-colour stars falling as confetti — the stock way to celebrate a
 * number. It is a Sheet now, like every other overlay in the app, and what
 * it shows is the record: the last fourteen nights as a constellation, lit
 * by how much of each ritual was done, joined where the nights were
 * consecutive. A streak is visible as a figure; a broken one shows the gap.
 * Nothing loops.
 */
export function StreakCelebration({ streak, open, onClose, nights, today, justCompleted = false }: StreakCelebrationProps) {
  const { t } = useT(['app', 'common']);
  const completed = nights.filter((n) => n.completed).length;
  // `streak` is the profile counter, which resets to 1 on any app open that
  // does not follow a ritual day. The record is what is drawn above, so the
  // words follow the record: "first night" only when it really is, and "no
  // gaps" only when the window shows a start followed by unbroken nights.
  const firstLit = nights.findIndex((n) => n.parts > 0);
  const gapless = firstLit > 0 && nights.slice(firstLit).every((n) => n.parts > 0);
  const shown = Math.max(streak, 1);
  const isFirstNight = shown <= 1 && completed <= 1;

  const milestone =
    streak === 7
      ? t('celebration.streak.milestone.week')
      : streak === 30
        ? t('celebration.streak.milestone.month')
        : streak === 100
          ? t('celebration.streak.milestone.hundred')
          : streak === 365
            ? t('celebration.streak.milestone.year')
            : null;

  return (
    <Sheet open={open} onClose={onClose} title={justCompleted ? t('celebration.streak.ritualComplete') : t('celebration.streak.title')}>
      <div className="text-center space-y-5 pb-2">
        <StreakConstellation nights={nights} today={today} className="w-full text-gold" height={140} />

        <div className="space-y-1.5">
          <h2 className="heading-display-xl text-gold">
            {isFirstNight ? t('celebration.streak.firstNight') : t('celebration.streak.days', { n: shown })}
          </h2>
          <p className="text-body text-mystic-300">
            {milestone ?? (gapless && !justCompleted ? t('celebration.streak.dedication') : t('celebration.streak.keepFlowing'))}
          </p>
          <p className="text-meta text-mystic-500">
            {t('celebration.streak.lastNights', { done: completed, total: nights.length })}
          </p>
        </div>

        <Button variant="gold" size="lg" fullWidth onClick={onClose}>
          {t('common:actions.continue')}
        </Button>
      </div>
    </Sheet>
  );
}
