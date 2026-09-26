import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Share2, RotateCcw, Flame, BookOpen } from 'lucide-react';
import { Button, Page, ResultLayout, Tag, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { useNavigate } from 'react-router-dom';
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import { getBundledCardPath, getBundledFullPath } from '../config/bundledImages';
import { appStorage } from '../lib/appStorage';
import { shareOrDownloadCard } from '../utils/shareCard';
import { encodeReading, buildShareUrl } from '../services/shareableReadings';
import { localDateStr, localYesterdayStr } from '../utils/localDate';
import { flipHaptics } from '../utils/haptics';
import type { TarotCard } from '../types';

/**
 * Pick-a-Card daily swipe.
 *
 * Western-audience fun surface: 3 face-down cards fanned out, user taps
 * one, it turns over in place — a real card on a real hinge — and a
 * moment later the two it was drawn from turn face-up too, dimmed, so
 * the reader sees what they passed on. The chosen card stays where it
 * was picked; the reading arrives beneath the fan.
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

/*
 * The flip. Same numbers as the reading flow's reveal: 520ms, a long
 * ease-out tail, and a reversed card turning INTO its reversal (a
 * half-turn on Z rides along with the flip). framer writes transforms in
 * a fixed order — rotateY before rotateZ — which is the order the face,
 * pre-turned 180° on Y, needs to land upright-or-inverted and facing out.
 */
const FLIP_MS = 520;
const FLIP_EASE: [number, number, number, number] = [0.22, 0.68, 0.24, 1];
/** The two cards not taken show themselves after the chosen one has landed. */
const OTHERS_DELAY_MS = 650;
const DEFAULT_BACK = '/card-backs/default.svg';
const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

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

// Local-midnight keys: the pick + streak are client-only state, so the
// "day" should roll over at the user's local midnight — the UTC date
// flips at 4pm for a US-West user and 9am next-day for Tokyo.
function todayKey(): string {
  return localDateStr();
}

function yesterdayKey(): string {
  return localYesterdayStr();
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function PickACardPage() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = !!useReducedMotion();

  const [deck, setDeck] = useState<TarotCard[] | null>(null);
  const [picked, setPicked] = useState<PickedState | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [streak, setStreak] = useState<StreakState>({ days: 0, lastDate: null });
  /* The live reveal: which card was just tapped, and whether the other
     two have turned yet. A stored pick skips both — everything is up. */
  const [chosenIndex, setChosenIndex] = useState<0 | 1 | 2 | null>(null);
  const [othersUp, setOthersUp] = useState(false);

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

  // Held so an unmount mid-flip cannot buzz a phone whose card is gone,
  // and so the delayed state writes stop when the page does.
  const mounted = useRef(true);
  const cancelHaptic = useRef<() => void>(() => {});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelHaptic.current();
    };
  }, []);

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
      if (picked || chosenIndex !== null || !options) return;
      cancelHaptic.current();
      cancelHaptic.current = flipHaptics(FLIP_MS, reduceMotion);
      setRevealing(true);
      setChosenIndex(index);
      const chosen = options[index];
      const state: PickedState = {
        index,
        cardId: chosen.card.id,
        reversed: chosen.reversed,
        pickedAtIso: new Date().toISOString(),
      };
      // The chosen card lands first; then the two it was drawn from turn
      // over, and the reading arrives. Under reduced motion there is no
      // turn to wait for.
      await wait(reduceMotion ? 0 : OTHERS_DELAY_MS);
      // Only the React state is gated on being mounted: the pick and the
      // streak are persisted whether or not the reader stayed to watch.
      if (mounted.current) {
        setOthersUp(true);
        setPicked(state);
      }
      await appStorage.set(PICK_STORAGE_PREFIX + today, JSON.stringify(state));
      await bumpStreak();
      if (mounted.current) setRevealing(false);
    },
    [picked, chosenIndex, options, today, bumpStreak, reduceMotion],
  );

  const pickedCard = useMemo(() => {
    if (!picked || !deck) return null;
    return deck.find((c) => c.id === picked.cardId) ?? null;
  }, [picked, deck]);

  const handleShare = async () => {
    if (!pickedCard || !picked) return;
    const keyword = pickedCard.keywords?.[0] ?? '';
    const baseText = t('pickACard.shareText', {
      defaultValue: "Today I drew {{name}} ({{orientation}}) — {{keyword}}",
      name: pickedCard.name,
      orientation: picked.reversed ? t('pickACard.reversed', { defaultValue: 'reversed' }) : t('pickACard.upright', { defaultValue: 'upright' }),
      keyword,
    }) as string;

    // Deep link so a recipient opens the actual card in SharedReadingPage,
    // not just an image. Single-card "spread".
    const shareUrl = buildShareUrl(
      encodeReading({
        spreadSlug: 'single',
        cards: [{ id: pickedCard.id, reversed: picked.reversed }],
        date: new Date().toISOString(),
      }),
    );
    const shareText = `${baseText}\n${shareUrl}`;

    const result = await shareOrDownloadCard(
      {
        variant: 'tarot',
        cardName: pickedCard.name,
        orientation: picked.reversed ? 'reversed' : 'upright',
        keyword,
        cardImageUrl: getBundledCardPath(pickedCard.id) || undefined,
      },
      `arcana-${pickedCard.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      shareText,
    );

    if (result === 'downloaded') {
      toast(t('common:actions.saved', { defaultValue: 'Saved' }), 'success');
    } else if (result === 'failed') {
      // Final fallback to clipboard.
      try {
        await navigator.clipboard?.writeText(shareText);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: "Couldn't share. Try again." }), 'error');
      }
    }
    // 'shared' = native share sheet handled it silently.
  };

  // Always fall back to the Arcana back so every card-selection surface
  // shows a real card, never a placeholder icon.
  const cardBackUrl = profile?.card_back_url || DEFAULT_BACK;

  if (!deck || !options) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  /*
   * Which card is the reader's, and whether the fan is fully face-up. A
   * pick restored from storage has no live `chosenIndex`, so it reads
   * straight from the stored state and every card is already turned.
   */
  const chosen: 0 | 1 | 2 | null = chosenIndex ?? picked?.index ?? null;
  const allUp = othersUp || (picked !== null && chosenIndex === null);
  const locked = revealing || picked !== null || chosenIndex !== null;

  return (
    <Page spacing="md">
      <header className="text-center space-y-2 pt-2">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="heading-display-lg text-mystic-100"
        >
          {t('pickACard.title', { defaultValue: 'Pick a card' })}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-ui text-mystic-400 max-w-md mx-auto"
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10"
          >
            <Flame className="w-3.5 h-3.5 text-gold" />
            <span className="text-caption text-gold font-medium">
              {t('pickACard.streak', { defaultValue: '{{n}}-day streak', n: streak.days })}
            </span>
          </motion.div>
        )}
      </header>

      {/* Three cards, fanned. The one the reader takes turns over where it lies. */}
      <div className="flex items-start justify-center gap-3 sm:gap-5 pt-4 pb-2">
        {options.map((opt, i) => {
          const isChosen = chosen === i;
          const up = isChosen || allUp;
          const dimmed = allUp && chosen !== null && !isChosen;
          const face = getBundledFullPath(opt.card.id) ?? getBundledCardPath(opt.card.id) ?? opt.card.imageUrl;
          const fanRotate = i === 0 ? -6 : i === 2 ? 6 : 0;
          /* Two phases: the fan deals in with a stagger; once the pick is
             resolved the dim, the lift and the others' turn land together
             as one 300ms beat. */
          const phase = allUp
            ? { duration: reduceMotion ? 0 : 0.3, ease: [0.22, 0.8, 0.25, 1] as [number, number, number, number] }
            : { duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.15 * i, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };
          return (
            /* Perspective on the wrapper, the turn on the child: the hinge
               is real only when the rotating element sits inside a
               perspective it does not carry itself. */
            <motion.button
              key={`${opt.card.id}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => handlePick(i as 0 | 1 | 2)}
              initial={{ opacity: 0, y: 24, rotate: i === 0 ? -8 : i === 2 ? 8 : 0 }}
              animate={{
                opacity: dimmed ? 0.45 : 1,
                y: isChosen && allUp ? -10 : 0,
                rotate: isChosen && allUp ? 0 : fanRotate,
                scale: isChosen && allUp ? 1.1 : 1,
              }}
              whileHover={locked ? undefined : { y: -12, rotate: 0, scale: 1.04, transition: { duration: 0.2 } }}
              whileTap={locked ? undefined : { scale: 0.95 }}
              transition={phase}
              className={`relative w-24 sm:w-28 md:w-32 aspect-[2/3] rounded-inset select-none touch-manipulation [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                isChosen ? 'z-10' : ''
              }`}
              style={{ perspective: 1000 }}
              aria-label={
                up
                  ? opt.card.name
                  : (t('pickACard.optionAria', { defaultValue: 'Card {{n}}', n: i + 1 }) as string)
              }
            >
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: up ? 180 : 0, rotateZ: up && opt.reversed ? 180 : 0 }}
                transition={{ duration: reduceMotion ? 0 : FLIP_MS / 1000, ease: FLIP_EASE }}
              >
                {/* Back — the Arcana back. */}
                <div className="absolute inset-0 rounded-inset overflow-hidden bg-mystic-850" style={BACKFACE}>
                  <img
                    src={cardBackUrl}
                    alt=""
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
                {/* Face — pre-turned and mounted from the start so the art is
                    decoded before the hinge moves. It frames itself. */}
                <div
                  className="absolute inset-0 rounded-inset overflow-hidden bg-mystic-850"
                  style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
                  aria-hidden={!up}
                >
                  {face ? (
                    <img
                      src={face}
                      alt={opt.card.name}
                      decoding="async"
                      className="w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-center">
                      <p className="text-caption text-mystic-200 font-medium">{opt.card.name}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {picked && pickedCard && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 0.8, 0.25, 1] }}
          className="flex flex-col items-center pt-2"
        >
          <ResultLayout
            as="h2"
            className="w-full max-w-md"
            eyebrow={
              picked.reversed
                ? t('pickACard.reversed', { defaultValue: 'Reversed' })
                : t('pickACard.upright', { defaultValue: 'Upright' })
            }
            verdict={pickedCard.name}
            summary={picked.reversed ? pickedCard.meaningReversed : pickedCard.meaningUpright}
            subtitle={
              pickedCard.keywords?.length > 0 ? (
                <span className="inline-flex flex-wrap justify-center gap-1.5">
                  {pickedCard.keywords.slice(0, 3).map((kw) => (
                    <Tag key={kw} tone="neutral">{kw}</Tag>
                  ))}
                </span>
              ) : undefined
            }
            actions={
              <>
                <Button variant="outline" onClick={handleShare} className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('pickACard.share', { defaultValue: 'Share my card' })}
                </Button>
                <Button
                  variant="gold"
                  onClick={() => navigate(`/tarot-meanings/${pickedCard ? pickedCard.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : ''}`)}
                  className="flex-1"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('pickACard.learnMore', { defaultValue: "Read this card's meaning" })}
                </Button>
              </>
            }
            footer={
              <p className="text-ui text-mystic-400 flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3 h-3" />
                {t('pickACard.comeBack', { defaultValue: 'New cards arrive at midnight.' })}
              </p>
            }
          />
        </motion.div>
      )}
    </Page>
  );
}

export default PickACardPage;
