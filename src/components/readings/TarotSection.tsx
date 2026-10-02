import { useState, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { useRitual } from '../../context/RitualContext';
import { useGamification } from '../../context/GamificationContext';
import { tarotReadings } from '../../dal';
import { getAllTarotCards } from '../../services/tarotCards';
import { shareOrDownloadCard } from '../../utils/shareCard';
import { encodeReading, buildShareUrl } from '../../services/shareableReadings';
import { TarotCardDetail } from './TarotCardDetail';
import { DeckLibrary } from './DeckLibrary';
import { generatePremiumReading, tarotCardToReadingCard, getSpreadPositions } from '../../services/readingInterpretation';
import { getZodiacSign } from '../../utils/zodiac';
import type { TarotCard } from '../../types';
import { useImagePreloader } from '../../hooks/useImagePreloader';
import { adsService } from '../../services/ads';
import { awardXP } from '../../services/levelSystem';
import { checkAchievementProgress, checkSpecificCardAchievement } from '../../services/achievements';
import { isFullMoon } from '../../utils/moonPhase';
import { getBundledCardPath } from '../../config/bundledImages';
import { WatchAdSheet } from '../premium';
import { rewardedAdsService } from '../../services/rewardedAds';
import { spreadTypeToFeature, FREE_TIER, FREE_CATALOGUE_CARD_LIMIT, type PremiumFeature } from '../../services/premium';
import { isNative } from '../../utils/platform';
import { ratePromptService } from '../../services/ratePrompt';
import { appStorage } from '../../lib/appStorage';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { allSpreads, getSpreadBySlug, getSpreadLayout, type SpreadLayoutPosition } from '../../data/tarotSpreads';
import { SPREAD_LAYOUTS } from '../icons/SpreadGlyph';
import { TarotFocusView } from './tarot/TarotFocusView';
import { TarotShuffleView } from './tarot/TarotShuffleView';
import { TarotSelectView } from './tarot/TarotSelectView';
import { TarotRevealView } from './tarot/TarotRevealView';
import { TarotHomeView } from './tarot/TarotHomeView';
import { FOCUS_AREA_I18N_KEY, type FocusArea, type PickerSpread } from './tarot/types';
import { localDateStr } from '../../utils/localDate';

/*
 * The reading flow: home → focus → shuffle → select → reveal.
 *
 * This component owns every piece of state and every side effect — the
 * deck, the picks, the reversals, the free-tier counters, the ad unlocks,
 * XP and achievements, save, share and the AI interpretation — and hands
 * each stage to one view in ./tarot/.
 *
 * Spreads come from three places. The six LEGACY ids (`single`,
 * `three-card`, `celtic-cross`, `relationship`, `career`, `shadow`) carry
 * localized names and positions in app.json and are what saved readings
 * and achievements know. The CATALOGUE (src/data/tarotSpreads.ts, forty
 * spreads) is castable since Phase 7 by its slug; where a catalogue entry
 * is the same spread as a legacy one it resolves to the legacy id
 * (CATALOGUE_ALIAS), so the picker shows one "Celtic Cross" and the
 * Spread Explorer achievement can still be earned from it. CUSTOM spreads
 * arrive from the builder through router state.
 */

const DAILY_READINGS_KEY = 'arcana_daily_readings';
const DAILY_READINGS_DATE_KEY = 'arcana_daily_readings_date';

/** The spread the home hero always draws. */
const DAILY_SPREAD = 'single';

/** How long the deck shuffles on its own before it settles. A cut ends it sooner. */
const SHUFFLE_MS = 2000;

async function getDailyReadingCount(): Promise<number> {
  try {
    // Local date: the free-tier daily counter should reset at the
    // user's midnight, not at UTC midnight (4pm US-West / 9am Tokyo).
    const today = localDateStr();
    const storedDate = await appStorage.get(DAILY_READINGS_DATE_KEY);
    if (storedDate !== today) {
      await appStorage.set(DAILY_READINGS_DATE_KEY, today);
      await appStorage.set(DAILY_READINGS_KEY, '0');
      return 0;
    }
    return parseInt((await appStorage.get(DAILY_READINGS_KEY)) || '0', 10);
  } catch {
    return 0;
  }
}

async function incrementDailyReadingCount(): Promise<void> {
  try {
    const today = localDateStr();
    await appStorage.set(DAILY_READINGS_DATE_KEY, today);
    const current = await getDailyReadingCount();
    await appStorage.set(DAILY_READINGS_KEY, (current + 1).toString());
  } catch {
    // silent
  }
}

type TarotView = 'home' | 'focus' | 'shuffle' | 'select' | 'reveal' | 'browse';

/**
 * A user-built custom spread launched into the reading flow. `id` is
 * namespaced 'custom:<uuid>' so it never collides with a spread id and
 * persists cleanly into tarot_readings.spread_type.
 */
export interface CustomSpreadInput {
  id: string;
  name: string;
  positions: string[];
  count: number;
}

interface TarotSectionProps {
  onShowPaywall: (feature: string) => void;
  customSpread?: CustomSpreadInput;
}

/**
 * What the ad sheet is open for: a locked spread (`spreadId` set), or one
 * more reading past the free tier's daily allowance (`extra_reading`). One
 * object rather than three flags, so that closing the sheet can dismiss
 * exactly the request it was showing — and not a request the unlock handler
 * queued a moment later (see handleAdUnlocked).
 */
interface AdRequest {
  feature: PremiumFeature;
  spreadId: string | null;
}

// The legacy spreads: i18n keys in app.json (readings.spreads.*,
// readings.spreadPositions.*); .name/.description resolved at render time.
const spreadConfigs = [
  { id: 'single',        i18n: 'single',       free: true,  count: 1  },
  { id: 'three-card',    i18n: 'threeCard',    free: true,  count: 3  },
  { id: 'celtic-cross',  i18n: 'celticCross',  free: false, count: 10 },
  { id: 'relationship',  i18n: 'relationship', free: false, count: 5  },
  { id: 'career',        i18n: 'careerSpread', free: false, count: 6  },
  { id: 'shadow',        i18n: 'shadow',       free: false, count: 7  },
] as const;

type LegacyId = (typeof spreadConfigs)[number]['id'];

/**
 * Catalogue slugs that are the same spread as a legacy id — same card count,
 * same positions in substance — cast as the legacy id so the localized
 * position labels, the saved-reading names and the Spread Explorer
 * achievement (`single` · `three-card` · `celtic-cross`) all keep working.
 * `celtic-cross` is both the slug and the id. Career Path (5) and Shadow
 * Work (5) differ from the legacy six- and seven-card spreads, so they
 * stay catalogue spreads of their own.
 */
const CATALOGUE_ALIAS: Record<string, LegacyId> = {
  'one-card-daily': 'single',
  'three-card-past-present-future': 'three-card',
  'relationship-cross': 'relationship',
};

/** The id the flow casts for a catalogue slug (or a legacy id passed straight through). */
export function resolveSpreadId(slugOrId: string): string {
  return CATALOGUE_ALIAS[slugOrId] ?? slugOrId;
}

/** A catalogue spread's position names, localized with the English as the default. */
export function catalogueSpreadName(
  t: (key: string, opts?: Record<string, unknown>) => string,
  slug: string,
  fallback: string,
): string {
  return t(`spreads.catalog.${slug}.name`, { defaultValue: fallback });
}

export function TarotSection({ onShowPaywall, customSpread }: TarotSectionProps) {
  const { t } = useT('app');
  const location = useLocation();
  const navigate = useNavigate();
  const legacyName = (s: { i18n: string }) => t(`readings.spreads.${s.i18n}.name`);
  const legacyDesc = (s: { i18n: string }) => t(`readings.spreads.${s.i18n}.description`);
  const focusLabel = (f: FocusArea) => t(FOCUS_AREA_I18N_KEY[f]);

  /*
   * The picker: the whole catalogue, each entry resolved to the id the
   * flow casts, with its localized name and one-liner, its free rule and
   * its glyph layout. Legacy entries take their names from the legacy keys
   * (already in four locales); catalogue entries take the catalogue's
   * English with `defaultValue` until the locale files carry
   * `spreads.catalog.<slug>.*`. Free: the legacy rule for a legacy id, up to
   * three cards for a catalogue spread.
   */
  const pickerSpreads = useMemo<PickerSpread[]>(
    () =>
      allSpreads.map((spread) => {
        const id = resolveSpreadId(spread.slug);
        const legacy = spreadConfigs.find((sc) => sc.id === id);
        return {
          id,
          slug: spread.slug,
          name: legacy ? legacyName(legacy) : catalogueSpreadName(t, spread.slug, spread.name),
          description: legacy
            ? legacyDesc(legacy)
            : t(`spreads.catalog.${spread.slug}.description`, { defaultValue: spread.shortDescription }),
          count: legacy ? legacy.count : spread.cardCount,
          free: legacy ? legacy.free : spread.cardCount <= FREE_CATALOGUE_CARD_LIMIT,
          category: spread.category,
          layout: legacy ? SPREAD_LAYOUTS[legacy.id] : getSpreadLayout(spread),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  /**
   * Unified spread metadata — resolves the active custom spread, a legacy
   * id or a catalogue slug to { count, free, name, layout }. Custom spreads
   * are always free (the builder is a premium-independent surface).
   */
  const getSpreadMeta = (
    id: string,
  ): { count: number; free: boolean; name: string; layout?: SpreadLayoutPosition[] } | undefined => {
    if (customSpread && id === customSpread.id) {
      return { count: customSpread.count, free: true, name: customSpread.name };
    }
    const legacy = spreadConfigs.find((sc) => sc.id === id);
    if (legacy) return { count: legacy.count, free: legacy.free, name: legacyName(legacy), layout: SPREAD_LAYOUTS[legacy.id] };
    const catalogue = getSpreadBySlug(id);
    if (catalogue) {
      return {
        count: catalogue.cardCount,
        free: catalogue.cardCount <= FREE_CATALOGUE_CARD_LIMIT,
        name: catalogueSpreadName(t, catalogue.slug, catalogue.name),
        layout: getSpreadLayout(catalogue),
      };
    }
    return undefined;
  };
  const { user, profile, refreshProfile } = useAuth();
  const { tarotRefreshTrigger } = useRitual();
  const { openRatePrompt } = useGamification();
  const [view, setView] = useState<TarotView>('home');
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<{ card: TarotCard; reversed: boolean; revealed: boolean }[]>([]);
  const [currentSpread, setCurrentSpread] = useState<string>(DAILY_SPREAD);
  /**
   * The card detail sheet: a card, its orientation, and the list it was
   * opened from (the drawn cards on the table, or the deck in the browse
   * grid) with the card's index in it, so the sheet's prev / next walk
   * that list.
   */
  const [selectedCard, setSelectedCard] = useState<{
    card: TarotCard;
    reversed: boolean;
    siblings: { card: TarotCard; reversed: boolean }[];
    index: number;
  } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
  const [, setLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [deckCards, setDeckCards] = useState<number[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIInterpretation, setShowAIInterpretation] = useState(false);
  const [adRequest, setAdRequest] = useState<AdRequest | null>(null);
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState<Record<string, boolean>>({});
  const [dailyReadingCount, setDailyReadingCount] = useState(0);
  const [canWatchAd, setCanWatchAd] = useState(false);
  const { tryConsume: tryConsumeAi, refund: refundAi, EarnSheet: AiEarnSheet } = useMoonstoneSpend('tarot-ai-interpret');

  /*
   * The shuffle timer. It used to be a bare setTimeout nobody held on to:
   * Back during the shuffle sent the reader to the focus step and, two
   * seconds later, yanked them into select anyway. Held here so a cut, a
   * Back or an unmount can end it.
   */
  const shuffleTimerRef = useRef<number | null>(null);
  /** Faces already handed to the decoder this session, so a re-pick costs nothing. */
  const preloadedFacesRef = useRef<Set<number>>(new Set());
  /** Set when the completion rewards have fired for the reading on screen. */
  const rewardedRef = useRef(false);

  useEffect(() => {
    getDailyReadingCount().then(setDailyReadingCount);
    if (isNative()) {
      rewardedAdsService.canWatchAd().then(setCanWatchAd);
    }
  }, []);

  useEffect(
    () => () => {
      if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current);
    },
    [],
  );

  const today = new Date().toISOString().split('T')[0];
  const isAtDailyLimit = !profile?.isPremium && dailyReadingCount >= FREE_TIER.dailyReadings;

  const getCardImage = (card: TarotCard): string | undefined => {
    const bundledPath = getBundledCardPath(card.id);
    return bundledPath || card.imageUrl;
  };

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      const cards = await getAllTarotCards();
      setTarotCards(cards);
      setLoading(false);
    };
    loadCards();
  }, [tarotRefreshTrigger]);

  useImagePreloader(
    tarotCards.slice(0, 6).map(card => card.imageUrl).filter((url): url is string => !!url),
    showBrowse
  );

  useEffect(() => {
    const checkTemporaryAccess = async () => {
      if (profile?.isPremium) return;

      const accessMap: Record<string, boolean> = {};

      for (const spread of pickerSpreads) {
        if (spread.free) continue;
        const feature = spreadTypeToFeature(spread.id);
        if (feature) {
          accessMap[spread.id] = await rewardedAdsService.hasTemporaryAccess(feature, spread.id);
        }
      }

      accessMap['extra_reading'] = await rewardedAdsService.hasTemporaryAccess('extra_reading');

      // Merge, never replace. The service only knows the legacy server-side
      // grants (and answers false for everything since the Moonstone
      // refactor); an unlock bought in this session lives in this state and
      // is consumed at the deal. This effect re-ran as the ad sheet closed
      // and overwrote the grant that had just been paid for, so a spread
      // unlocked from the home grid asked to be unlocked again at Draw.
      setHasTemporaryAccess(prev => {
        const next = { ...prev };
        for (const [key, granted] of Object.entries(accessMap)) next[key] = prev[key] || granted;
        return next;
      });
    };

    checkTemporaryAccess();
  }, [profile?.isPremium, adRequest, pickerSpreads]);

  const shuffleArray = <T,>(input: T[]): T[] => {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  /** Everything a new reading starts without. */
  const resetReadingState = () => {
    setSelectedFocus(null);
    setQuestion('');
    setIsSaved(false);
    setShowAIInterpretation(false);
    setAiInterpretation(null);
  };

  /**
   * Everything between the reader and the shuffle, in one place and in one
   * order: the spread's own gate (premium, or an unlock bought for one
   * reading), then the free tier's daily allowance (or its one-reading
   * unlock). Returns true when `spreadId` may be read now. Otherwise the
   * reader has been sent to the ad sheet for the first thing in the way —
   * or to the paywall where ads are not an option — and the caller stops.
   *
   * Both entries (the home picker and the focus step's Draw) and the return
   * from the ad sheet run through here. They used not to: the ad that
   * unlocked a spread sent the reader on to the focus step and the shuffle
   * with the daily limit never asked, so a free reader at the limit could
   * read all day for 50 Moonstones a spread.
   *
   * `access` lets the unlock handler evaluate against the grant it has just
   * made, before the state update has landed.
   */
  const clearGates = (spreadId: string, access: Record<string, boolean> = hasTemporaryAccess): boolean => {
    const spread = getSpreadMeta(spreadId);
    if (!spread) return false;
    if (profile?.isPremium) return true;

    if (!spread.free && !access[spreadId]) {
      const feature = spreadTypeToFeature(spreadId);
      if (feature && isNative() && canWatchAd) {
        setAdRequest({ feature, spreadId });
      } else {
        onShowPaywall(spread.name);
      }
      return false;
    }

    if (isAtDailyLimit && !access['extra_reading']) {
      if (isNative() && canWatchAd) {
        setAdRequest({ feature: 'extra_reading', spreadId: null });
      } else {
        onShowPaywall(t('readings.paywall.unlimited'));
      }
      return false;
    }

    return true;
  };

  /**
   * Start a reading of `spreadId`. The spread is pinned first, so the hero
   * can never inherit the last Celtic Cross (which, once its ad unlock was
   * spent, opened a paywall on the free daily draw). The reading state is
   * cleared before the gates, so that an unlock bought from here returns to
   * the focus step with no focus chosen — the reader has not chosen one.
   */
  const beginReading = (spreadId: string) => {
    setCurrentSpread(spreadId);
    resetReadingState();
    if (!clearGates(spreadId)) return;
    setView('focus');
  };

  /** The home hero: always the one-card daily draw. */
  const handleStartDraw = () => beginReading(DAILY_SPREAD);

  /** Back to the deck on the table; the next hero tap is a daily draw again. */
  const goHome = () => {
    setCurrentSpread(DAILY_SPREAD);
    setView('home');
  };

  // Auto-launch into the reading flow when arriving from the custom-spread
  // builder (ReadingsPage passes the spread via router state). Fires once
  // per distinct custom spread so "New reading" doesn't bounce the user
  // back into it.
  const customLaunchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!customSpread || customLaunchedRef.current === customSpread.id) return;
    customLaunchedRef.current = customSpread.id;
    beginReading(customSpread.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customSpread?.id]);

  /*
   * A catalogue spread handed off from its detail page ("Read this spread"
   * → navigate('/readings', { state: { spreadSlug } })). Read once, the
   * history state is cleared so a reload or a tab switch does not relaunch
   * it, then the flow begins exactly as from the picker — every gate in
   * order.
   */
  const slugLaunchedRef = useRef<string | null>(null);
  useEffect(() => {
    const slug = (location.state as { spreadSlug?: unknown } | null)?.spreadSlug;
    if (typeof slug !== 'string' || slugLaunchedRef.current === slug) return;
    slugLaunchedRef.current = slug;
    navigate('.', { replace: true, state: null });
    const id = resolveSpreadId(slug);
    if (getSpreadMeta(id)) beginReading(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleFocusSelect = (focus: FocusArea) => {
    setSelectedFocus(focus);
  };

  /** The focus step's Draw: the gates again, since an unlock may have been spent since. */
  const handleDraw = () => {
    if (!selectedFocus) return;
    if (!clearGates(currentSpread)) return;
    setView('shuffle');
  };

  /**
   * The ad sheet reports a spend. One spend buys one gate; the other may
   * still be shut — a locked spread at the daily limit, or the daily limit
   * on a spread that is open — so the gates run again against the new
   * grant, and send the reader to the next request or the paywall rather
   * than past it. Only when both are clear does the reading move on:
   * unlocked from the focus step, the focus is chosen, so shuffle; unlocked
   * from the home picker it is not yet, so ask first.
   *
   * The sheet calls `onClose` right after this. That close is scoped to the
   * request it was showing (see the WatchAdSheet below), so a follow-up
   * request made here survives it.
   */
  const handleAdUnlocked = () => {
    if (!adRequest) return;
    const granted = adRequest.feature === 'extra_reading' ? 'extra_reading' : adRequest.spreadId;
    setAdRequest(null);
    if (!granted) return;

    const access = { ...hasTemporaryAccess, [granted]: true };
    setHasTemporaryAccess(access);

    if (!clearGates(currentSpread, access)) return;
    if (selectedFocus) {
      setView('shuffle');
    } else {
      resetReadingState();
      setView('focus');
    }
  };

  /*
   * The shuffle ends one of two ways — the timer runs out, or the reader
   * cuts the deck — and both land here. The order is Fisher–Yates over the
   * loaded deck (or ids 0–77 while it is still loading).
   */
  const finishShuffle = () => {
    if (shuffleTimerRef.current !== null) {
      window.clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }

    const baseIds =
      tarotCards.length > 0
        ? tarotCards.map(c => c.id)
        : Array.from({ length: 78 }, (_, i) => i);

    setDeckCards(shuffleArray(baseIds));
    setSelectedIndices([]);
    setAiInterpretation(null);
    setShowAIInterpretation(false);
    setIsSaved(false);

    setIsShuffling(false);
    setView('select');
  };

  const handleShuffleStart = () => {
    if (isShuffling) return;
    setIsShuffling(true);
    if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current);
    shuffleTimerRef.current = window.setTimeout(finishShuffle, SHUFFLE_MS);
  };

  /** The reader cut the deck: the shuffle is over now. */
  const handleCutDeck = () => {
    if (!isShuffling) return;
    finishShuffle();
  };

  const handleShuffleBack = () => {
    if (shuffleTimerRef.current !== null) {
      window.clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    setIsShuffling(false);
    setView('focus');
  };

  /**
   * Hand a face to the decoder the moment it is picked, so the flip in the
   * reveal lands on a decoded bitmap instead of a fetch. The bundled path
   * is known from the id alone; the deck lookup only matters for a card
   * served from a remote imageUrl.
   */
  const preloadFace = (cardId: number) => {
    if (preloadedFacesRef.current.has(cardId) || typeof Image === 'undefined') return;
    const card = tarotCards.find(c => c.id === cardId);
    const src = card ? getCardImage(card) : getBundledCardPath(cardId) ?? undefined;
    if (!src) return;
    preloadedFacesRef.current.add(cardId);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    try {
      img.decode().catch(() => {});
    } catch {
      // No decode(): the fetch alone still warms the cache.
    }
  };

  /**
   * Picks fill the spread's positions in order, and a position is a
   * position: returning the card in Present also returns Future, so the
   * next draw lands in Present again rather than sliding a later card into
   * a slot it was never drawn for. Never exceeds the spread.
   */
  const handleCardSelect = (cardId: number) => {
    const spread = getSpreadMeta(currentSpread);
    if (!spread) return;

    if (!selectedIndices.includes(cardId)) preloadFace(cardId);

    setSelectedIndices(prev => {
      const at = prev.indexOf(cardId);
      if (at >= 0) return prev.slice(0, at);
      if (prev.length >= spread.count) return prev;
      return [...prev, cardId];
    });
  };

  /**
   * Deal the picked cards face down. The reading is COUNTED here — the free
   * tier's daily allowance and any ad unlock are spent when the cards hit
   * the table, as they always were, so turning n−1 cards and leaving does
   * not make a spread free. XP and achievements wait for the last card to
   * turn (see the effect on `allRevealed`).
   */
  const handleRevealSelected = () => {
    const spread = getSpreadMeta(currentSpread);
    if (!spread || selectedIndices.length !== spread.count) return;
    if (tarotCards.length === 0) return;

    const cardById = new Map(tarotCards.map(c => [c.id, c]));
    const selectedCards = selectedIndices
      .map(id => cardById.get(id))
      .filter((c): c is TarotCard => !!c);

    if (selectedCards.length !== spread.count) {
      toast(t('readings.toasts.cardsNotFound'), 'error');
      return;
    }

    const reversedChance = 0.35;

    rewardedRef.current = false;
    setDrawnCards(
      selectedCards.map(card => ({
        card,
        reversed: Math.random() < reversedChance,
        revealed: false,
      }))
    );

    (async () => {
      await incrementDailyReadingCount();
      setDailyReadingCount(await getDailyReadingCount());

      if (!profile?.isPremium) {
        if (!spread.free && hasTemporaryAccess[currentSpread]) {
          const feature = spreadTypeToFeature(currentSpread);
          if (feature) {
            await rewardedAdsService.consumeTemporaryAccess(feature, currentSpread);
            setHasTemporaryAccess(prev => ({ ...prev, [currentSpread]: false }));
          }
        }

        if (isAtDailyLimit && hasTemporaryAccess['extra_reading']) {
          await rewardedAdsService.consumeTemporaryAccess('extra_reading');
          setHasTemporaryAccess(prev => ({ ...prev, extra_reading: false }));
        }
      }
    })();

    setAiInterpretation(null);
    setShowAIInterpretation(false);
    setIsSaved(false);
    setView('reveal');
  };

  const handleRevealCard = (index: number) => {
    setDrawnCards(prev =>
      prev.map((c, i) => (i === index ? { ...c, revealed: true } : c))
    );
  };

  const revealAll = () => {
    setDrawnCards(prev => prev.map(c => ({ ...c, revealed: true })));
  };

  const allRevealed = drawnCards.every(c => c.revealed);

  /**
   * The reading is complete when its last card is face up. That is when XP
   * and achievements are awarded (the free-tier count and any ad unlock were
   * spent at the deal). `rewardedRef` makes it once per deal: the deps can
   * change again afterwards without re-firing.
   */
  useEffect(() => {
    if (view !== 'reveal' || drawnCards.length === 0 || !allRevealed || rewardedRef.current) return;
    rewardedRef.current = true;

    const completed = drawnCards;

    (async () => {
      if (user) {
        awardXP(user.id, 'reading_complete').then(() => refreshProfile());
        checkAchievementProgress(user.id, 'reading_complete');
        if (currentSpread === 'celtic-cross') {
          checkAchievementProgress(user.id, 'celtic_cross_complete');
        }
        // Spread Explorer is a SET of spread types seen: the server keeps the
        // distinct values and unlocks when every member of the definition's
        // list has been read (F1). The value is the spread id as cast.
        checkAchievementProgress(user.id, 'spread_types_used', 1, currentSpread);

        // Calendar/time achievements
        const now = new Date();
        if (isFullMoon(now)) checkAchievementProgress(user.id, 'full_moon_reading');
        if (now.getMonth() === 0 && now.getDate() === 1) checkAchievementProgress(user.id, 'new_year_reading');
        const hour = now.getHours();
        if (hour >= 0 && hour < 3) checkAchievementProgress(user.id, 'witching_hour_reading');

        // Specific card achievements
        for (const drawn of completed) {
          checkSpecificCardAchievement(user.id, drawn.card.name);
        }
      }
    })();
    // Fires on the transition to all-revealed only; the ref guards the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, allRevealed, drawnCards.length]);

  /**
   * Every share ends in a toast (R5 M-15): the OS sheet took it, the file
   * was saved, the link was copied, or it could not be shared. A cancelled
   * sheet says nothing — the reader closed it on purpose.
   */
  const reportShare = async (outcome: Awaited<ReturnType<typeof shareOrDownloadCard>>, fallbackText: string) => {
    if (outcome === 'shared') {
      toast(t('readings.toasts.shared', { defaultValue: 'Shared' }), 'success');
    } else if (outcome === 'downloaded') {
      toast(t('readings.toasts.imageSaved', { defaultValue: 'Image saved to your downloads' }), 'success');
    } else if (outcome === 'failed') {
      try {
        await navigator.clipboard?.writeText(fallbackText);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: "Couldn't share. Try again." }), 'error');
      }
    }
  };

  // Share the WHOLE reading as a deep link (opens in SharedReadingPage) plus
  // a branded image of the featured card. Reached from TarotRevealView via
  // onShare.
  const handleShareReading = async () => {
    if (drawnCards.length === 0) return;
    const featured = drawnCards.find(c => c.revealed) ?? drawnCards[0];
    const keyword = featured.card.keywords?.[0] ?? '';
    const shareUrl = buildShareUrl(
      encodeReading({
        spreadSlug: currentSpread,
        cards: drawnCards.map(d => ({ id: d.card.id, reversed: d.reversed })),
        date: new Date().toISOString(),
      }),
    );
    const shareText = `${t('readings.shareText', {
      defaultValue: 'My {{spread}} tarot reading on Arcana',
      spread: getSpreadMeta(currentSpread)?.name ?? '',
    })}\n${shareUrl}`;

    const outcome = await shareOrDownloadCard(
      {
        variant: 'tarot',
        cardName: featured.card.name,
        orientation: featured.reversed ? 'reversed' : 'upright',
        keyword,
        cardImageUrl: getCardImage(featured.card),
      },
      `arcana-reading-${currentSpread}.png`,
      shareText,
    );
    await reportShare(outcome, shareText);
  };

  /** Share one card from the detail sheet: its image, its first keyword. */
  const handleShareCard = async (card: TarotCard, reversed: boolean) => {
    const shareText = t('readings.shareCardText', {
      defaultValue: '{{name}} — {{keyword}}. Read the card on Arcana: {{url}}',
      name: card.name,
      keyword: card.keywords?.[0] ?? '',
      url: `https://tarotlife.app/tarot-meanings/${card.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
    });
    const outcome = await shareOrDownloadCard(
      {
        variant: 'tarot',
        cardName: card.name,
        orientation: reversed ? 'reversed' : 'upright',
        keyword: card.keywords?.[0] ?? '',
        cardImageUrl: getCardImage(card),
      },
      `arcana-${card.id}.png`,
      shareText,
    );
    await reportShare(outcome, shareText);
  };

  const handleSaveReading = async () => {
    if (!user || drawnCards.length === 0) return;

    const res = await tarotReadings.insert({
      userId: user.id,
      date: today,
      spreadType: currentSpread,
      focusArea: selectedFocus,
      cards: drawnCards.map((d, i) => ({
        cardId: d.card.id,
        cardName: d.card.name,
        reversed: d.reversed,
        position: getPositionLabel(i),
      })),
      // Persist the AI interpretation so a saved reading keeps it on reload
      // (it's the expensive, non-reproducible part — local focus/traditional
      // text is re-derived deterministically). Omitted when none was generated.
      interpretation: aiInterpretation ?? undefined,
      saved: true,
    });

    if (!res.ok) {
      toast(t('readings.toasts.saveFailed'), 'error');
    } else {
      setIsSaved(true);
      toast(t('readings.toasts.readingSaved'), 'success');

      awardXP(user.id, 'reading_saved').then(() => refreshProfile());
      checkAchievementProgress(user.id, 'reading_saved');
      await adsService.checkAndShowAd(profile?.isPremium || false, 'reading', profile?.isAdFree || false);

      await ratePromptService.incrementPositiveActions(user.id);
      const shouldShow = await ratePromptService.shouldShowPrompt(user.id);
      if (shouldShow) {
        await ratePromptService.recordPromptShown(user.id);
        openRatePrompt();
      }
    }
  };

  const handleGetAIInterpretation = async () => {
    if (!user || drawnCards.length === 0) return;

    // 50 ms per AI interpretation. Premium = no debit (soft cap server-side).
    // The hook opens the earn-Moonstones sheet on insufficient balance.
    const ok = await tryConsumeAi();
    if (!ok) return;

    setLoadingAI(true);
    try {
      const readingCards = drawnCards.map(d => tarotCardToReadingCard(d.card, d.reversed));
      const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;

      const focusForAI: 'love' | 'career' | 'general' =
        selectedFocus === 'Love' ? 'love' : selectedFocus === 'Career' ? 'career' : 'general';

      const result = await generatePremiumReading({
        cards: readingCards,
        spreadType: currentSpread,
        focusArea: focusForAI,
        question: question.trim() || undefined,
        zodiacSign: zodiacSign,
        goals: profile?.goals,
      });

      setAiInterpretation(result.interpretation);
      setShowAIInterpretation(true);
      toast(
        result.usedLlm ? t('readings.toasts.aiReady') : t('readings.toasts.interpretationReady'),
        'success',
      );
    } catch (error) {
      await refundAi();
      console.error('Failed to generate AI interpretation:', error);
      // The edge function refunds the Moonstone debit itself when the reading
      // fails, so a failure never costs the user anything. Map the server's
      // error code (embedded in the thrown message) to a message that says
      // what happened and what to do; never surface the raw text.
      const raw = error instanceof Error ? error.message : '';
      const errorMessage = raw.includes('INSUFFICIENT_BALANCE')
        ? t('readings.toasts.aiInsufficient', { defaultValue: 'Not enough Moonstones for an AI interpretation — top up from the home widget, or earn more from the daily check-in.' })
        : raw.includes('AI_SOFT_CAP') || raw.includes('AI_DAILY_LIMIT')
          ? t('readings.toasts.aiLimit', { defaultValue: 'You’ve reached today’s limit for AI interpretations. Come back tomorrow for more.' })
          : t('readings.toasts.aiFailed', { defaultValue: 'Couldn’t generate the interpretation — your Moonstones weren’t charged. Try again in a moment.' });
      toast(errorMessage, 'error');
    } finally {
      setLoadingAI(false);
    }
  };

  const getPositionLabel = (index: number): string => {
    // Custom spread: use the user-authored position names.
    if (customSpread && currentSpread === customSpread.id) {
      return customSpread.positions[index] || t('readings.positions.generic', { index: index + 1 });
    }
    if (currentSpread === 'single') return t('readings.positions.yourCard');
    if (currentSpread === 'three-card') {
      const keys = ['past', 'present', 'future'] as const;
      const key = keys[index];
      return key
        ? t(`readings.positions.${key}`)
        : t('readings.positions.generic', { index: index + 1 });
    }
    if (spreadConfigs.some((sc) => sc.id === currentSpread)) {
      const positions = getSpreadPositions(currentSpread);
      return positions[index] || t('readings.positions.generic', { index: index + 1 });
    }
    // A catalogue spread: its own position names, localized with the
    // English as the default.
    const catalogue = getSpreadBySlug(currentSpread);
    const position = catalogue?.positions[index];
    if (position) {
      return t(`spreads.catalog.${catalogue!.slug}.positions.${index}`, { defaultValue: position.name });
    }
    return t('readings.positions.generic', { index: index + 1 });
  };

  /** The home picker. The same entry as the hero and the custom-spread launch: every gate, in order. */
  const handleSpreadSelect = (spreadId: string) => {
    if (!getSpreadMeta(spreadId)) return;
    beginReading(spreadId);
  };

  /** A card on the table was tapped: open it, with the drawn cards as its neighbours. */
  const openDrawnCard = (card: TarotCard, reversed: boolean) => {
    const siblings = drawnCards.map((d) => ({ card: d.card, reversed: d.reversed }));
    const index = Math.max(0, siblings.findIndex((s) => s.card.id === card.id));
    setSelectedCard({ card, reversed, siblings, index });
  };

  /** A card in the deck library was tapped: open it, with the deck as its neighbours. */
  const openDeckCard = (card: TarotCard) => {
    const siblings = tarotCards.map((c) => ({ card: c, reversed: false }));
    const index = Math.max(0, tarotCards.findIndex((c) => c.id === card.id));
    setSelectedCard({ card, reversed: false, siblings, index });
    setShowBrowse(false);
    // Track card exploration for achievements
    if (user) checkAchievementProgress(user.id, 'cards_explored');
  };

  const navigateDetail = (index: number) => {
    setSelectedCard((prev) => {
      if (!prev) return prev;
      const next = prev.siblings[index];
      if (!next) return prev;
      return { ...prev, card: next.card, reversed: next.reversed, index };
    });
  };

  /*
   * One stage on screen at a time. The overlays below the switch — the
   * deck library, the card detail, the watch-ad sheet and the Moonstone
   * earn sheet — are mounted in every stage: the card detail is opened from
   * the reveal, the ad sheet from the focus step and the home picker, the
   * earn sheet from the AI button.
   */
  let stage: ReactElement;

  if (view === 'focus') {
    stage = (
      <TarotFocusView
        selectedFocus={selectedFocus}
        question={question}
        onBack={goHome}
        onSelect={handleFocusSelect}
        onQuestionChange={setQuestion}
        onContinue={handleDraw}
      />
    );
  } else if (view === 'shuffle') {
    stage = (
      <TarotShuffleView
        isShuffling={isShuffling}
        cardBackUrl={profile?.card_back_url}
        onBack={handleShuffleBack}
        onShuffle={handleShuffleStart}
        onCut={handleCutDeck}
      />
    );
  } else if (view === 'select') {
    const spreadCount = getSpreadMeta(currentSpread)?.count ?? 0;
    const needsMore = spreadCount - selectedIndices.length;
    const positionLabels = Array.from({ length: spreadCount }, (_, i) => getPositionLabel(i));

    stage = (
      <TarotSelectView
        deckCards={deckCards}
        selectedIndices={selectedIndices}
        needsMore={needsMore}
        positionLabels={positionLabels}
        cardBackUrl={profile?.card_back_url}
        onBack={() => setView('shuffle')}
        onCardSelect={handleCardSelect}
        onReveal={handleRevealSelected}
      />
    );
  } else if (view === 'reveal') {
    const meta = getSpreadMeta(currentSpread);
    stage = (
      <TarotRevealView
        drawnCards={drawnCards}
        currentSpread={currentSpread}
        spreadTitle={meta?.name ?? ''}
        spreadLayout={meta?.layout}
        selectedFocus={selectedFocus}
        question={question}
        allRevealed={allRevealed}
        isSaved={isSaved}
        isPremium={!!profile?.isPremium}
        cardBackUrl={profile?.card_back_url}
        showAIInterpretation={showAIInterpretation}
        aiInterpretation={aiInterpretation}
        loadingAI={loadingAI}
        focusReadingLabel={selectedFocus ? t('readings.revealView.focusReading', { focus: focusLabel(selectedFocus) }) : ''}
        getPositionLabel={getPositionLabel}
        onBack={goHome}
        onSave={handleSaveReading}
        onShare={handleShareReading}
        onRevealCard={handleRevealCard}
        onRevealAll={revealAll}
        onCardClick={openDrawnCard}
        onGetAIInterpretation={handleGetAIInterpretation}
        onHideAIInterpretation={() => setShowAIInterpretation(false)}
        onNewReading={goHome}
      />
    );
  } else {
    stage = (
      <TarotHomeView
        spreads={pickerSpreads}
        isPremium={!!profile?.isPremium}
        canWatchAd={canWatchAd}
        cardBackUrl={profile?.card_back_url}
        hasTemporaryAccess={hasTemporaryAccess}
        onStartDraw={handleStartDraw}
        onSpreadSelect={handleSpreadSelect}
        onOpenBrowse={() => setShowBrowse(true)}
      />
    );
  }

  return (
    <>
      {stage}

      <Sheet open={showBrowse} onClose={() => setShowBrowse(false)} title={t('readings.browse.title')}>
        <DeckLibrary cards={tarotCards} onSelect={openDeckCard} />
      </Sheet>

      <Sheet open={!!selectedCard} onClose={() => setSelectedCard(null)} label={selectedCard?.card.name}>
        {selectedCard && (
          <TarotCardDetail
            card={selectedCard.card}
            reversed={selectedCard.reversed}
            onClose={() => setSelectedCard(null)}
            siblings={selectedCard.siblings}
            index={selectedCard.index}
            onNavigate={navigateDetail}
            onShare={() => handleShareCard(selectedCard.card, selectedCard.reversed)}
          />
        )}
      </Sheet>

      {adRequest && (
        <WatchAdSheet
          // Keyed on the request, so a follow-up request (the daily limit
          // right after a spread unlock) mounts a fresh sheet rather than
          // re-dressing the one that just reported a spend.
          key={`${adRequest.feature}:${adRequest.spreadId ?? ''}`}
          open
          // Dismiss this request only. The sheet calls onClose right after
          // onSpent, and onSpent may have queued the next request by then.
          onClose={() => setAdRequest(prev => (prev === adRequest ? null : prev))}
          actionKey={
            adRequest.feature === 'extra_reading'
              ? 'tarot-extra-reading'
              : `tarot-spread:${adRequest.spreadId ?? 'unknown'}`
          }
          feature={adRequest.feature}
          spreadType={adRequest.spreadId || undefined}
          itemName={adRequest.spreadId ? getSpreadMeta(adRequest.spreadId)?.name : undefined}
          onSpent={handleAdUnlocked}
          onShowPaywall={() => {
            setAdRequest(null);
            // The extra-reading request used to open nothing here: the
            // "open everything with Premium" button on it did nothing.
            onShowPaywall(
              adRequest.spreadId
                ? getSpreadMeta(adRequest.spreadId)?.name ?? t('readings.paywall.unlimited')
                : t('readings.paywall.unlimited'),
            );
          }}
        />
      )}
      {AiEarnSheet}
    </>
  );
}
