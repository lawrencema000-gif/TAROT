import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Share2, RotateCcw, Flame } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { useNavigate } from 'react-router-dom';
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import { getBundledCardPath } from '../config/bundledImages';
import { appStorage } from '../lib/appStorage';
import type { TarotCard } from '../types';

/**
 * Pick-a-Card daily swipe.
 *
 * Western-audience fun surface: 3 face-down cards fanned out, user taps
 * one, it flips with an eased rotate-Y + scale animation, reveals a
 * one-line reading, and remembers the pick until midnight local time.
 *
 * Deterministic per-user-per-day — same user sees the same 3 cards on
 * the same day across sessions, so the experience feels stable. The
 * pick itself is stored in localStorage (`appStorage`) keyed on
 * `arcana_pick_{yyyy-mm-dd}` so a second visit shows the already-picked
 * card instead of allowing re-pick.
 *
 * Intentionally free-tier: this is a 30-second daily ritual, a pure
 * acquisition / habit-formation surface with no paywall. Premium is
 * reserved for the natal chart, reports, and Bazi depth.
 */

const PICK_STORAGE_PREFIX = 'arcana_pick_';
const STREAK_STORAGE_KEY = 'arcana_pick_streak';
const LAST_PICK_DATE_KEY = 'arcana_pick_last_date';

interface PickedState {
  index: 0 | 1 | 2;
  cardId: number;
  reversed: boolean;
  pickedAtIso: string;
}

interface StreakState {
  days: number;
  lastDate: string | null;
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function PickACardPage() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<TarotCard[] | null>(null);
  const [picked, setPicked] = useState<PickedState | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [streak, setStreak] = useState<StreakState>({ days: 0, lastDate: null });

  const today = todayKey();
  const seed = `${user?.id || 'anonymous'}_pick_${today}`;

  // Today's 3 options (deterministic).
  const options = useMemo(() => {
    if (!deck) return null;
    return drawSeededCards(3, seed, deck);
  }, [deck, seed]);

  useEffect(() => {
    getAllTarotCards().then(setDeck);
  }, []);

  // Load prior pick + streak.
  useEffect(() => {
    (async () => {
      const pickRaw = await appStorage.get(PICK_STORAGE_PREFIX + today);
      if (pickRaw) {
        try {
          setPicked(JSON.parse(pickRaw) as PickedState);
        } catch {
          /* corrupt — ignore */
        }
      }
      const streakRaw = await appStorage.get(STREAK_STORAGE_KEY);
      const lastDate = await appStorage.get(LAST_PICK_DATE_KEY);
      const days = streakRaw ? parseInt(streakRaw, 10) : 0;
      setStreak({ days: Number.isFinite(days) ? days : 0, lastDate });
    })();
  }, [today]);

  const bumpStreak = useCallback(async () => {
    const lastDate = streak.lastDate;
    let newDays = streak.days;
    if (lastDate === today) return; // already counted today
    if (lastDate === yesterdayKey()) newDays += 1; // continuing
    else newDays = 1; // new / broken streak
    setStreak({ days: newDays, lastDate: today });
    await appStorage.set(STREAK_STORAGE_KEY, String(newDays));
    await appStorage.set(LAST_PICK_DATE_KEY, today);
  }, [streak.days, streak.lastDate, today]);

  const handlePick = useCallback(
    async (index: 0 | 1 | 2) => {
      if (picked || !options) return;
      setRevealing(true);
      const chosen = options[index];
      const state: PickedState = {
        index,
        cardId: chosen.card.id,
        reversed: chosen.reversed,
        pickedAtIso: new Date().toISOString(),
      };
      // Short delay so the flip animation finishes before state changes.
      await new Promise((r) => setTimeout(r, 650));
      setPicked(state);
      await appStorage.set(PICK_STORAGE_PREFIX + today, JSON.stringify(state));
      await bumpStreak();
      setRevealing(false);
    },
    [picked, options, today, bumpStreak],
  );

  const pickedCard = useMemo(() => {
    if (!picked || !deck) return null;
    return deck.find((c) => c.id === picked.cardId) ?? null;
  }, [picked, deck]);

  const handleShare = async () => {
    if (!pickedCard) return;
    const name = pickedCard.name;
    const orientation = picked?.reversed ? t('pickACard.reversed', { defaultValue: 'reversed' }) : t('pickACard.upright', { defaultValue: 'upright' });
    const keyword = pickedCard.keywords?.[0] ?? '';
    const shareText = t('pickACard.shareText', {
      defaultValue: "Today I drew {{name}} ({{orientation}}) — {{keyword}}",
      name,
      orientation,
      keyword,
    });
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Arcana — Daily Pick', text: shareText as string, url: `${window.location.origin}/pick-a-card` });
      } catch {
        await navigator.clipboard?.writeText(shareText as string);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      }
    } else {
      await navigator.clipboard?.writeText(shareText as string);
      toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
    }
  };

  const cardBackUrl = profile?.card_back_url ?? undefined;

  if (!deck || !options) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="text-center space-y-2 pt-2">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-2xl text-mystic-100"
        >
          {t('pickACard.title', { defaultValue: 'Pick a card' })}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-sm text-mystic-400 max-w-md mx-auto"
        >
          {picked
            ? t('pickACard.subtitlePicked', { defaultValue: "You've drawn your card for today." })
            : t('pickACard.subtitleChoose', { defaultValue: 'Breathe. Notice which one calls to you. Tap to reveal.' })}
        </motion.p>
        {streak.days > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/20"
          >
            <Flame className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs text-gold font-medium">
              {t('pickACard.streak', { defaultValue: '{{n}}-day streak', n: streak.days })}
            </span>
          </motion.div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {!picked ? (
          /* Three face-down cards */
          <motion.div
            key="options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3 sm:gap-5 pt-4"
          >
            {options.map((opt, i) => (
              <motion.button
                key={`${opt.card.id}-${i}`}
                disabled={revealing}
                onClick={() => handlePick(i as 0 | 1 | 2)}
                initial={{ opacity: 0, y: 24, rotate: i === 0 ? -8 : i === 2 ? 8 : 0 }}
                animate={{ opacity: 1, y: 0, rotate: i === 0 ? -6 : i === 2 ? 6 : 0 }}
                whileHover={{ y: -12, rotate: 0, scale: 1.04, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.5, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-24 sm:w-28 md:w-32 aspect-[2/3] rounded-xl overflow-hidden border border-gold/30 shadow-xl bg-gradient-to-br from-mystic-800 to-mystic-900 disabled:opacity-50"
                aria-label={t('pickACard.optionAria', { defaultValue: 'Card {{n}}', n: i + 1 }) as string}
              >
                {cardBackUrl ? (
                  <img src={cardBackUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-gold/70" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-mystic-950/40 to-transparent pointer-events-none" />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          /* Revealed card */
          <motion.div
            key="revealed"
            initial={{ opacity: 0, rotateY: -90, scale: 0.92 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5 pt-4"
          >
            {pickedCard && (
              <div className="relative w-44 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-gold/60 shadow-[0_0_40px_rgba(212,175,55,0.25)]">
                {getBundledCardPath(pickedCard.id) ? (
                  <img
                    src={getBundledCardPath(pickedCard.id)!}
                    alt={pickedCard.name}
                    className={`w-full h-full object-cover ${picked.reversed ? 'rotate-180' : ''}`}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-mystic-700 to-mystic-900 flex flex-col items-center justify-center p-4 text-center">
                    <Sparkles className="w-8 h-8 text-gold mb-2" />
                    <p className="text-sm text-mystic-200 font-medium">{pickedCard.name}</p>
                  </div>
                )}
              </div>
            )}

            {pickedCard && (
              <Card variant="glow" padding="lg" className="w-full max-w-md text-center">
                <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
                  {picked.reversed
                    ? t('pickACard.reversed', { defaultValue: 'Reversed' })
                    : t('pickACard.upright', { defaultValue: 'Upright' })}
                </p>
                <h2 className="font-display text-xl text-mystic-100 mb-2">{pickedCard.name}</h2>
                <p className="text-sm text-mystic-300 leading-relaxed">
                  {picked.reversed ? pickedCard.meaningReversed : pickedCard.meaningUpright}
                </p>
                {pickedCard.keywords?.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {pickedCard.keywords.slice(0, 3).map((kw) => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-mystic-800/60 border border-mystic-700/40 text-mystic-400">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <div className="flex gap-3 w-full max-w-md">
              <Button variant="outline" onClick={handleShare} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                {t('pickACard.share', { defaultValue: 'Share' })}
              </Button>
              <Button
                variant="gold"
                onClick={() => navigate(`/tarot-meanings/${pickedCard ? pickedCard.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : ''}`)}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('pickACard.learnMore', { defaultValue: 'Learn more' })}
              </Button>
            </div>

            <p className="text-xs text-mystic-500 flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" />
              {t('pickACard.comeBack', { defaultValue: 'New cards arrive at midnight.' })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PickACardPage;
