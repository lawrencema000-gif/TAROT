import { useEffect, useState } from 'react';
import { Button, Sheet, SparkleFourPoint } from '../ui';
import { useT } from '../../i18n/useT';
import { localizeSeekerRank } from '../../i18n/localizeRank';

interface LevelUpCelebrationProps {
  open: boolean;
  onClose: () => void;
  newLevel: number;
  seekerRank: string;
  xpEarned: number;
}

/** How often to look again while another sheet or dialog is up. */
const RETRY_MS = 1_000;

/**
 * Something modal is already up: any Sheet (it marks the body), a dialog.
 * The same test as the trial reminder (TrialReminderModal.tsx).
 */
function somethingIsOpen(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.body.classList.contains('sheet-open')) return true;
  return document.querySelector('[role="dialog"], [aria-modal="true"]') !== null;
}

/**
 * The level-up moment.
 *
 * It was a gradient trophy medallion, "Congratulations!", a gradient stat
 * box, a second card promising "new abilities" nothing delivers, and an
 * English-only button — and it opened over whatever sheet the action that
 * earned the XP had left up (saving a reading opens the rate prompt), so its
 * own button could cover that sheet's. Now: one flat surface, the gold
 * sparkle, the new level as the title in Inter numerals, the rank under it,
 * one button. It waits its turn: while another sheet or dialog is open it
 * stays queued and opens once that one has closed.
 */
export function LevelUpCelebration({ open, onClose, newLevel, seekerRank, xpEarned }: LevelUpCelebrationProps) {
  const { t } = useT('app');
  const [clear, setClear] = useState(false);

  useEffect(() => {
    if (!open) {
      setClear(false);
      return;
    }
    if (!somethingIsOpen()) {
      setClear(true);
      return;
    }
    const id = window.setInterval(() => {
      if (!somethingIsOpen()) {
        setClear(true);
        window.clearInterval(id);
      }
    }, RETRY_MS);
    return () => window.clearInterval(id);
  }, [open]);

  const levelTitle = t('celebration.levelUp.levelN', { defaultValue: 'Level {{level}}', level: newLevel });

  return (
    <Sheet open={open && clear} onClose={onClose} label={levelTitle}>
      <div className="text-center pt-2 pb-1">
        <SparkleFourPoint size={28} className="block text-gold mx-auto" />
        <p className="font-display-eyebrow mt-4">{t('celebration.levelUp.eyebrow', { defaultValue: 'Level up' })}</p>
        <h2 className="mt-2 font-body text-hero font-semibold text-mystic-100 tabular-nums">{levelTitle}</h2>
        <p className="mt-2 text-ui text-mystic-300">{localizeSeekerRank(seekerRank)}</p>
        {xpEarned > 0 && (
          <p className="mt-1 text-meta text-mystic-400 tabular-nums">
            {t('celebration.levelUp.xpEarned', { defaultValue: '+{{xp}} XP', xp: xpEarned })}
          </p>
        )}
        <Button variant="gold" onClick={onClose} className="w-full mt-8">
          {t('celebration.levelUp.continue', { defaultValue: 'Continue' })}
        </Button>
      </div>
    </Sheet>
  );
}
