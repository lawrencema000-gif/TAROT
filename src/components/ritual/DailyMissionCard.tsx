import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button, Card, EyebrowLabel } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { pickDailyMission } from '../../data/dailyMissions';
import { appStorage } from '../../lib/appStorage';
import { localDateStr } from '../../utils/localDate';

/**
 * Daily Energy Mission home widget.
 *
 * One 30-second micro-commitment per day, picked deterministically from
 * a 40-prompt pool. Mark-done is a single tap with a short motion reveal.
 *
 * It used to keep its own streak in appStorage, with its own flame tag —
 * the third streak on one Home screen, next to the ritual streak and the
 * Moonstone check-in streak. Home has one streak now, the ritual's; this
 * card just records today.
 */

const DONE_PREFIX = 'arcana_mission_';

interface DailyMissionCardProps {
  /** Optional hook fires when the user marks today's mission done. */
  onDone?: () => void;
}

export function DailyMissionCard({ onDone }: DailyMissionCardProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  // Local-calendar date: the mission is client-side, so the user's local
  // "today" is what counts.
  const today = localDateStr();
  const mission = pickDailyMission(user?.id ?? null);

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const doneRaw = await appStorage.get(DONE_PREFIX + today);
      setDone(doneRaw === mission.id);
      setLoading(false);
    })();
  }, [today, mission.id]);

  const handleDone = useCallback(async () => {
    if (done) return;
    setDone(true);
    await appStorage.set(DONE_PREFIX + today, mission.id);
    onDone?.();
  }, [done, today, mission.id, onDone]);

  if (loading) {
    // Height-matched skeleton so the page doesn't jank.
    return <div className="h-[132px] rounded-card bg-mystic-850 border border-mystic-700" aria-hidden />;
  }

  return (
    <Card padding="md">
      <EyebrowLabel>{t('dailyMission.label', { defaultValue: 'Today’s mission' })}</EyebrowLabel>

      <AnimatePresence mode="wait" initial={false}>
        {!done ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <p className="text-ui text-mystic-100 leading-relaxed font-medium">
              {t(`dailyMission.missions.${mission.id}.prompt`, { defaultValue: mission.prompt })}
            </p>
            <p className="text-meta text-mystic-400 leading-relaxed mt-1 mb-4">
              {t(`dailyMission.missions.${mission.id}.why`, { defaultValue: mission.why })}
            </p>
            <Button variant="outline" fullWidth onClick={handleDone}>
              <Circle className="w-4 h-4" aria-hidden />
              {t('dailyMission.markDone', { defaultValue: 'Mark done' })}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mt-3"
          >
            <div className="w-11 h-11 rounded-full bg-teal/15 text-teal flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" aria-hidden />
            </div>
            <div>
              <p className="text-ui font-medium text-mystic-100">
                {t('dailyMission.doneTitle', { defaultValue: 'Done. Well done.' })}
              </p>
              <p className="text-meta text-mystic-400 leading-relaxed mt-0.5">
                {t('dailyMission.doneSub', { defaultValue: 'New mission arrives at midnight.' })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
