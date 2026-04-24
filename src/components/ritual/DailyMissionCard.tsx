import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Sparkles, Flame } from 'lucide-react';
import { Card } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { pickDailyMission } from '../../data/dailyMissions';
import { appStorage } from '../../lib/appStorage';

/**
 * Daily Energy Mission home widget.
 *
 * One 30-second micro-commitment per day, picked deterministically from
 * a 40-prompt pool. Mark-done is a single tap with a satisfying motion
 * reveal. Streak persists per-user in appStorage.
 *
 * Kept UI-only for now — future iterations can plumb XP / moonstones in
 * on `onDone` without touching the widget surface.
 */

const DONE_PREFIX = 'arcana_mission_';
const STREAK_KEY = 'arcana_mission_streak';
const LAST_DATE_KEY = 'arcana_mission_last_date';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface DailyMissionCardProps {
  /** Optional hook fires when the user marks today's mission done. */
  onDone?: () => void;
}

export function DailyMissionCard({ onDone }: DailyMissionCardProps) {
  const { t } = useT('app');
  const { user } = useAuth();
  const today = todayKey();
  const mission = pickDailyMission(user?.id ?? null);

  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [doneRaw, streakRaw] = await Promise.all([
        appStorage.get(DONE_PREFIX + today),
        appStorage.get(STREAK_KEY),
      ]);
      setDone(doneRaw === mission.id);
      const d = streakRaw ? parseInt(streakRaw, 10) : 0;
      setStreak(Number.isFinite(d) ? d : 0);
      setLoading(false);
    })();
  }, [today, mission.id]);

  const handleDone = useCallback(async () => {
    if (done) return;
    setDone(true);
    await appStorage.set(DONE_PREFIX + today, mission.id);

    // Streak rules: +1 if yesterday was done, else reset to 1.
    const lastDate = await appStorage.get(LAST_DATE_KEY);
    const newStreak = lastDate === yesterdayKey() ? streak + 1 : 1;
    setStreak(newStreak);
    await appStorage.set(STREAK_KEY, String(newStreak));
    await appStorage.set(LAST_DATE_KEY, today);

    onDone?.();
  }, [done, today, mission.id, streak, onDone]);

  if (loading) {
    // Height-matched skeleton so the page doesn't jank.
    return <div className="h-[132px] rounded-xl bg-mystic-900/40 animate-pulse" />;
  }

  return (
    <Card
      padding="lg"
      className={`relative overflow-hidden transition-all ${
        done
          ? 'bg-gradient-to-br from-emerald-500/10 via-mystic-900 to-mystic-950 border-emerald-400/25'
          : 'bg-gradient-to-br from-gold/10 via-mystic-900 to-cosmic-violet/10 border-gold/25'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-mystic-500 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {t('dailyMission.label', { defaultValue: "Today's mission" })}
        </p>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25">
            <Flame className="w-3 h-3 text-gold" />
            <span className="text-[10px] text-gold font-medium">{streak}</span>
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-mystic-100 leading-relaxed font-medium mb-1.5">
              {t(`dailyMission.missions.${mission.id}.prompt`, { defaultValue: mission.prompt })}
            </p>
            <p className="text-[11px] text-mystic-400 italic leading-relaxed mb-3">
              {t(`dailyMission.missions.${mission.id}.why`, { defaultValue: mission.why })}
            </p>
            <button
              onClick={handleDone}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gold/10 hover:bg-gold/15 border border-gold/30 text-gold text-sm font-medium active:scale-[0.98] transition-all"
            >
              <Circle className="w-4 h-4" />
              {t('dailyMission.markDone', { defaultValue: 'Mark done' })}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-11 h-11 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-mystic-100">
                {t('dailyMission.doneTitle', { defaultValue: 'Done. Well done.' })}
              </p>
              <p className="text-xs text-mystic-400 leading-relaxed mt-0.5">
                {t('dailyMission.doneSub', { defaultValue: 'New mission arrives at midnight.' })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
