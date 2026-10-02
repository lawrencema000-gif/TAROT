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
 *
 * `streak` is profile.streak, which the server recomputes from the same
 * rows the constellation draws (ritual_streak), so the number and the
 * picture agree: 0 when nothing reaches today or yesterday, 1 on the first
 * night, and never a count of app launches.
 */
export function StreakCelebration({ streak, open, onClose, nights, today, justCompleted = false }: StreakCelebrationProps) {
  const { t } = useT(['app', 'common']);
  const completed = nights.filter((n) => n.completed).length;

  // "No gaps" is a claim about the record: the window shows where the run
  // started (a night before it with nothing done) and the streak reaches
  // back to that start. Tonight, if not yet completed, is not a gap.
  const last = nights[nights.length - 1];
  const settled = last && last.date === today && !last.completed ? nights.slice(0, -1) : nights;
  const start = settled.findIndex((n) => n.completed);
  const gapless = start > 0 && streak >= settled.length - start;
  const isFirstNight = streak === 1 && completed === 1;

  const milestone =
    streak === 7
      ? t('celebration.streak.milestone.week')
      : streak === 14
        ? t('celebration.streak.milestone.fortnight', { defaultValue: 'Two weeks of nights.' })
        : streak === 30
          ? t('celebration.streak.milestone.month')
          : streak === 60
            ? t('celebration.streak.milestone.sixty', { defaultValue: 'Sixty nights.' })
            : streak === 100
              ? t('celebration.streak.milestone.hundred')
              : streak === 365
                ? t('celebration.streak.milestone.year')
                : null;

  const heading =
    streak <= 0
      ? t('celebration.streak.notStarted', { defaultValue: 'No streak yet.' })
      : isFirstNight
        ? t('celebration.streak.firstNight')
        : t('celebration.streak.days', { n: streak });

  const line =
    milestone ??
    (streak <= 0
      ? t('celebration.streak.startTonight', { defaultValue: 'Complete tonight’s ritual to begin one.' })
      : gapless && !justCompleted
        ? t('celebration.streak.dedication')
        : t('celebration.streak.keepFlowing'));

  return (
    <Sheet open={open} onClose={onClose} title={justCompleted ? t('celebration.streak.ritualComplete') : t('celebration.streak.title')}>
      <div className="text-center space-y-5 pb-2">
        <StreakConstellation nights={nights} today={today} className="w-full text-gold" height={140} />

        <div className="space-y-1.5">
          <h2 className="heading-display-xl text-gold">{heading}</h2>
          <p className="text-body text-mystic-300">{line}</p>
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
