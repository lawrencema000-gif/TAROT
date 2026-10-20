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
import { encodeReading, buildShareUrl, shareLocaleQuery } from '../../services/shareableReadings';
import { TarotCardDetail } from './TarotCardDetail';
import { DeckLibrary } from './DeckLibrary';
import { generatePremiumReading, tarotCardToReadingCard, MAX_AI_TAROT_CARDS } from '../../services/readingInterpretation';
import { tarotPositionLabel } from './tarot/spreadLabels';
import { takePendingSpread } from './tarot/pendingSpread';
import { loadContentOverlay } from '../../i18n/contentOverlay';
import { canonicalCardName, cardMeaningPath } from './tarot/cardSlug';
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
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { allSpreads, getSpreadBySlug, getSpreadLayout, type SpreadLayoutPosition } from '../../data/tarotSpreads';
import { SPREAD_LAYOUTS } from '../icons/SpreadGlyph';
import { TarotFocusView } from './tarot/TarotFocusView';
import { TarotShuffleView } from './tarot/TarotShuffleView';
import { TarotSelectView } from './tarot/TarotSelectView';
import { TarotRevealView, LeaveReadingSheet } from './tarot/TarotRevealView';
import { TarotHomeView } from './tarot/TarotHomeView';
import { FOCUS_AREA_I18N_KEY, type FocusArea, type PickerSpread } from './tarot/types';
import { newReadingId } from './tarot/readingId';
import { localDateStr } from '../../utils/localDate';
// The free tier's 3-a-day count belongs to the account (shared with the
// playing-card section), so signing out and back in does not reset it.
import { getDailyReadingCount, incrementDailyReadingCount } from '../../services/offline';

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

/** The spread the home hero always draws. */
const DAILY_SPREAD = 'single';

/** How long the deck shuffles on its own before it settles. A cut ends it sooner. */
const SHUFFLE_MS = 2000;


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
  /** A save is in flight: the bookmark ignores taps until it lands (one reading, one row). */
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  /** The row the reading on screen was saved as, so a later AI interpretation joins it. */
  const savedIdRef = useRef<string | null>(null);
  /** A share image is rendering: the share buttons wait (a second tap used to download a PNG). */
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
  const [, setLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [deckCards, setDeckCards] = useState<number[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  /**
   * The reading on the table, by id: minted when its cards are dealt and
   * sent as the requestId of every AI request for it, so the server treats
   * a second request for the same reading as a free replay (readingId.ts).
   */
  const readingIdRef = useRef<string | null>(null);
  /**
   * The reading whose AI interpretation is on its way. Set before the first
   * await, so a second tap during the balance check or the request is
   * ignored: `loadingAI` only lands with the next render, and a double tap
   * used to get two requests out 3 ms apart, each charged (p8 F09).
   */
  const aiInFlightRef = useRef<string | null>(null);
  /**
   * The interpretation on the table is filed under the Library's AI
   * readings. generate-reading files every interpretation it charges for —
   * since p9 QZ-6 one served from its cache (`cached: true`) as well. A
   * function deployed before that fix answered a cache hit before filing
   * it, so for `cached: true` the leave sheet still says the text is only
   * here (QU1 R-c): harmless once the fixed function is live.
   */
  const [aiInLibrary, setAiInLibrary] = useState(false);
  /** "Start a new reading" or Back on an unsaved reveal with a bought interpretation: asked first. */
  const [confirmLeave, setConfirmLeave] = useState(false);
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
    if (isNative()) {
      rewardedAdsService.canWatchAd().then(setCanWatchAd);
    }
  }, []);

  // Re-read on an account switch: the count is per account.
  const userId = user?.id ?? null;
  useEffect(() => {
    let alive = true;
    getDailyReadingCount(userId).then((n) => {
      if (alive) setDailyReadingCount(n);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(
    () => () => {
      if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current);
    },
    [],
  );

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
    savedIdRef.current = null;
    setShowAIInterpretation(false);
    setAiInterpretation(null);
  };

  // The affirmation at the end of the result reads the enrichment overlay;
  // fetched now so it is in memory by the time the cards turn.
  useEffect(() => {
    void loadContentOverlay('enrichment');
  }, []);

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

  /**
   * The reveal's "Start a new reading" and Back. A bought AI interpretation
   * on a reading that is not saved (nor being saved) went with one tap; the
   * reader is asked first (LeaveReadingSheet), and told where the text is.
   */
  const leaveReveal = () => {
    const unsaved = !isSaved && !savedIdRef.current && !savingRef.current;
    if (aiInterpretation && unsaved) {
      setConfirmLeave(true);
      return;
    }
    goHome();
  };

  /** The sheet's "Save and leave": home once the row is written; a failed save stays (its toast says so). */
  const saveAndLeave = async () => {
    const saved = await handleSaveReading();
    setConfirmLeave(false);
    if (saved) goHome();
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
    // Or a spread chosen on its public page before the reader signed up,
    // when they reach the Readings tab before Home took it (pendingSpread).
    const fromState = (location.state as { spreadSlug?: unknown } | null)?.spreadSlug;
    const slug = typeof fromState === 'string' ? fromState : slugLaunchedRef.current === null ? takePendingSpread() : null;
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
    savedIdRef.current = null;

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
      await incrementDailyReadingCount(user?.id);
      setDailyReadingCount(await getDailyReadingCount(user?.id));

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

    // A new reading on the table: its own id, and no AI request of its own
    // yet (one still running for the last reading answers into nothing).
    readingIdRef.current = newReadingId();
    setLoadingAI(false);
    setAiInterpretation(null);
    setShowAIInterpretation(false);
    setIsSaved(false);
    savedIdRef.current = null;
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
        // awardXP reports 'reading_complete' to the badges itself; a second
        // report here counted every reading twice (Apprentice Reader at 5).
        awardXP(user.id, 'reading_complete').then(() => refreshProfile());
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

        // Specific card achievements. The badge names its card in English
        // ("The Tower"); the deck on screen is localized (塔), so the card is
        // reported by its canonical name, looked up by id.
        for (const drawn of completed) {
          checkSpecificCardAchievement(user.id, canonicalCardName(drawn.card.id));
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
        // No clipboard (an insecure context, an old WebView) is a failure,
        // not "Copied".
        if (!navigator.clipboard) throw new Error('no clipboard');
        await navigator.clipboard.writeText(fallbackText);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: "Couldn't share. Try again." }), 'error');
      }
    }
  };

  /**
   * Run one share at a time. The image takes a second or more to render
   * before the OS sheet opens; a second tap used to start a second render,
   * whose navigator.share was refused ("an earlier share has not yet
   * completed") and fell back to downloading the PNG.
   */
  const shareOnce = async (run: () => Promise<void>) => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    try {
      await run();
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  /** The spread's title as the reveal shows it (the daily draw is not "1-card daily"). */
  const spreadTitleFor = (id: string): string =>
    id === DAILY_SPREAD ? t('readings.dailyDraw.title') : getSpreadMeta(id)?.name ?? '';

  // Share the WHOLE reading as a deep link (opens in SharedReadingPage) plus
  // a branded image of the featured card. Reached from TarotRevealView via
  // onShare. The link carries the spread's stable id (a legacy id, a
  // catalogue slug or `custom:<uuid>` — never a display name), the cards,
  // the reader's question as cartomancy's links do, and the date; the token
  // shape is shareableReadings' (v1 for tarot, which every app build opens).
  const handleShareReading = () =>
    shareOnce(async () => {
      if (drawnCards.length === 0) return;
      const featured = drawnCards.find(c => c.revealed) ?? drawnCards[0];
      const keyword = featured.card.keywords?.[0] ?? '';
      const shareUrl = buildShareUrl(
        encodeReading({
          spreadSlug: currentSpread,
          cards: drawnCards.map(d => ({ id: d.card.id, reversed: d.reversed })),
          question: question.trim() || undefined,
          date: new Date().toISOString(),
        }),
      );
      const shareText = `${t('readings.shareText', {
        defaultValue: 'My {{spread}} tarot reading on Arcana',
        spread: spreadTitleFor(currentSpread),
      })}\n${shareUrl}`;

      const outcome = await shareOrDownloadCard(
        {
          variant: 'tarot',
          cardName: featured.card.name,
          orientation: featured.reversed ? 'reversed' : 'upright',
          keyword,
          cardImageUrl: getCardImage(featured.card),
        },
        `arcana-reading-${currentSpread.replace(/[^a-z0-9-]/gi, '-')}.png`,
        shareText,
      );
      await reportShare(outcome, shareText);
    });

  /**
   * Share one card from the detail sheet: its image, its first keyword, and
   * its page — by id, so a localized name (ワンドの5, 太陽) still links to
   * the card rather than to `/tarot-meanings/5` or the hub. The link names
   * the sharer's language (`?hl=`), as a reading's does: the text was
   * Japanese and the page it linked opened in English for a signed-out
   * friend (p9 R13).
   */
  const handleShareCard = (card: TarotCard, reversed: boolean) =>
    shareOnce(async () => {
      const shareText = t('readings.shareCardText', {
        defaultValue: '{{name}} — {{keyword}}. Read the card on Arcana: {{url}}',
        name: card.name,
        keyword: card.keywords?.[0] ?? '',
        url: `https://tarotlife.app${cardMeaningPath(card.id)}${shareLocaleQuery()}`,
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
    });

  /**
   * The row a saved reading is written as. `date` is the reader's own
   * calendar day (localDateStr), as the ritual, the journal and the mood
   * diary write theirs: the UTC day filed a reading saved before 09:00 in
   * Tokyo under the day before, and one saved in the evening in the
   * Americas under the day after (p8 F14, F47, F73).
   */
  const savedRow = (interpretation: string | null) => ({
    userId: user!.id,
    date: localDateStr(),
    spreadType: currentSpread,
    focusArea: selectedFocus,
    cards: drawnCards.map((d, i) => ({
      cardId: d.card.id,
      // The canonical English name: the Library resolves rows by id, and by
      // this name for rows that predate ids.
      cardName: canonicalCardName(d.card.id) || d.card.name,
      reversed: d.reversed,
      position: getPositionLabel(i),
    })),
    // Persist the AI interpretation so a saved reading keeps it on reload
    // (it's the expensive, non-reproducible part — local focus/traditional
    // text is re-derived deterministically). Omitted when none was generated.
    interpretation: interpretation ?? undefined,
    question: question.trim() || undefined,
    saved: true,
  });

  /**
   * Save the reading on screen — once. The bookmark used to insert a row
   * on every tap (and re-run the XP, the ad check and the rate prompt), so
   * a second tap or a double tap during the insert left two copies in the
   * Library. A save in flight or already made is a no-op — read from refs
   * as well as `isSaved`, which renders only after the insert has answered
   * (savedIdRef is set in the same tick the insert returns). Resolves true
   * once the reading on screen is saved (now or before), false when it is
   * not, so "Save and leave" (LeaveReadingSheet) leaves only a saved reading.
   */
  const handleSaveReading = async (): Promise<boolean> => {
    if (!user || drawnCards.length === 0) return false;
    if (isSaved || savedIdRef.current) return true;
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    const res = await tarotReadings.insertReturningId(savedRow(aiInterpretation));
    savingRef.current = false;
    setSaving(false);

    if (!res.ok) {
      toast(t('readings.toasts.saveFailed'), 'error');
      return false;
    } else {
      savedIdRef.current = res.data.id;
      setIsSaved(true);
      toast(t('readings.toasts.readingSaved'), 'success');

      // awardXP reports 'reading_saved' to the badges itself (one report, not two).
      awardXP(user.id, 'reading_saved').then(() => refreshProfile());
      await adsService.checkAndShowAd(profile?.isPremium || false, 'reading', profile?.isAdFree || false);

      await ratePromptService.incrementPositiveActions(user.id);
      const shouldShow = await ratePromptService.shouldShowPrompt(user.id);
      if (shouldShow) {
        await ratePromptService.recordPromptShown(user.id);
        openRatePrompt();
      }
      return true;
    }
  };

  /**
   * A saved reading that gets its AI interpretation afterwards: the saved
   * row is updated in place, so the Library keeps its one copy and that copy
   * carries the text that was paid for. (It used to insert a second row and
   * delete the first, which also ran the reading counters twice.)
   */
  const attachInterpretationToSaved = async (interpretation: string) => {
    const savedId = savedIdRef.current;
    if (!savedId) return;
    const res = await tarotReadings.updateInterpretation(savedId, interpretation);
    if (!res.ok) console.warn('[TarotSection] could not attach the interpretation to the saved reading:', res.error);
  };

  const aiTooManyCards = drawnCards.length > MAX_AI_TAROT_CARDS;

  const handleGetAIInterpretation = async () => {
    const readingId = readingIdRef.current;
    if (!user || drawnCards.length === 0 || !readingId) return;
    // This reading's interpretation is already on its way: a second tap
    // does nothing. Checked and set before the first await (see aiInFlightRef).
    if (aiInFlightRef.current === readingId) return;

    // The interpretation for this reading is already here (the reader had
    // switched back to the card meanings): show it again. Asking the server
    // a second time charged another 50 Moonstones for the same text.
    if (aiInterpretation) {
      setShowAIInterpretation(true);
      return;
    }
    // generate-reading refuses more than ten tarot cards; never charge for
    // a request that cannot succeed (the chip says so, see the reveal).
    if (aiTooManyCards) return;

    aiInFlightRef.current = readingId;
    setLoadingAI(true);
    try {
      // 50 Moonstones per AI interpretation (the chip shows the price to a
      // free reader). Premium = no debit (soft cap server-side). The hook
      // opens the earn-Moonstones sheet on insufficient balance.
      const ok = await tryConsumeAi();
      if (!ok) return;

      const readingCards = drawnCards.map(d => tarotCardToReadingCard(d.card, d.reversed));
      const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;

      const focusForAI: 'love' | 'career' | 'general' =
        selectedFocus === 'Love' ? 'love' : selectedFocus === 'Career' ? 'career' : 'general';

      const result = await generatePremiumReading({
        cards: readingCards,
        spreadType: currentSpread,
        // The positions as the reader sees them. The server only knows the
        // six legacy spreads; every catalogue and custom spread was read
        // against "Position 1…n" without these.
        positions: drawnCards.map((_, i) => getPositionLabel(i).slice(0, 40)),
        focusArea: focusForAI,
        question: question.trim() || undefined,
        zodiacSign: zodiacSign,
        goals: profile?.goals,
        // The reading's id, not a fresh one per call: a repeat of this
        // request is the same request to the server, answered without a
        // second charge.
        requestId: readingId,
      });

      // The reader has moved on to another reading while this one was being
      // read: the text belongs to the reading it was asked for, not to the
      // one on the table now (nor to that one's saved row).
      if (readingIdRef.current !== readingId) return;

      if (result.fallback === true) {
        // Every AI provider failed and the server sent the cards' own
        // meanings instead, refunding the charge. That is not the reading
        // that was asked for: it is not shown or saved as the AI reading,
        // so asking again later makes a real attempt.
        toast(
          result.charged === true
            ? t('readings.toasts.aiFallbackCharged', {
                defaultValue: 'The AI reader is unavailable right now, and your Moonstones couldn’t be returned automatically. Contact support to have them restored.',
              })
            : t('readings.toasts.aiFallback', {
                defaultValue: 'The AI reader is unavailable right now. No Moonstones were charged.',
              }),
          'error',
        );
        return;
      }

      setAiInLibrary(result.cached !== true);
      setAiInterpretation(result.interpretation);
      setShowAIInterpretation(true);
      void attachInterpretationToSaved(result.interpretation);
      toast(
        result.usedLlm ? t('readings.toasts.aiReady') : t('readings.toasts.interpretationReady'),
        'success',
      );
    } catch (error) {
      await refundAi();
      console.error('Failed to generate AI interpretation:', error);
      if (readingIdRef.current !== readingId) return;
      // The edge function refunds the Moonstone debit itself when the reading
      // fails, so a failure never costs the user anything. Map the server's
      // error (generatePremiumReading throws the envelope's message, not its
      // code) to a message that says what happened and what to do; never
      // surface the raw text.
      const raw = error instanceof Error ? error.message : '';
      const errorMessage = /INSUFFICIENT_BALANCE|enough Moonstones/i.test(raw)
        ? t('readings.toasts.aiInsufficient', { defaultValue: 'Not enough Moonstones for an AI interpretation — top up from the home widget, or earn more from the daily check-in.' })
        : // generate-reading answers 429 DAILY_LIMIT_REACHED with the message
          // "Daily reading limit reached" — the same mapping as CartomancySection.
          /AI_SOFT_CAP|AI_DAILY_LIMIT|DAILY_LIMIT_REACHED|daily reading limit|today's AI limit/i.test(raw)
          ? t('readings.toasts.aiLimit', { defaultValue: 'You’ve reached today’s limit for AI interpretations. Come back tomorrow for more.' })
          : /TOO_MANY_CARDS|Maximum \d+ cards/i.test(raw)
          ? t('readings.toasts.aiTooManyCards', {
              n: MAX_AI_TAROT_CARDS,
              defaultValue: 'AI interpretations read spreads of up to {{n}} cards. Your Moonstones weren’t charged.',
            })
          : // 409 REQUEST_IN_FLIGHT: an earlier request for this reading (one
            // the connection dropped) is still being written. It was charged
            // once; asking again returns it without a second charge.
            /REQUEST_IN_FLIGHT|still being worked on/i.test(raw)
          ? t('readings.revealView.aiStillWriting', {
              defaultValue: 'Your AI interpretation is still being written. Try again in a few seconds — you won’t be charged twice.',
            })
          : t('readings.toasts.aiFailed', { defaultValue: 'Couldn’t generate the interpretation — your Moonstones weren’t charged. Try again in a moment.' });
      toast(errorMessage, 'error');
    } finally {
      if (aiInFlightRef.current === readingId) aiInFlightRef.current = null;
      // A newer reading has its own state (reset when it was dealt).
      if (readingIdRef.current === readingId) setLoadingAI(false);
    }
  };

  const getPositionLabel = (index: number): string => {
    // Custom spread: use the user-authored position names.
    if (customSpread && currentSpread === customSpread.id) {
      return customSpread.positions[index] || t('readings.positions.generic', { index: index + 1 });
    }
    // A legacy id or a catalogue slug: the same names a saved or shared
    // reading of this spread shows (spreadLabels).
    return tarotPositionLabel(t, currentSpread, index);
  };

  /** The home picker. The same entry as the hero and the custom-spread launch: every gate, in order. */
  const handleSpreadSelect = (spreadId: string) => {
    if (!getSpreadMeta(spreadId)) return;
    beginReading(spreadId);
  };

  /**
   * A card's detail was opened. "Explore 22 / 78 cards" counts DISTINCT
   * cards (20261003000004 keeps the seen ids when a value is sent); a bare
   * call fell to the counter path, and stepping through the deck with
   * ↑ / ↓ was not counted at all.
   */
  const exploredCard = (card: TarotCard) => {
    if (user) checkAchievementProgress(user.id, 'cards_explored', 1, String(card.id));
  };

  /** A card on the table was tapped: open it, with the drawn cards as its neighbours. */
  const openDrawnCard = (card: TarotCard, reversed: boolean) => {
    const siblings = drawnCards.map((d) => ({ card: d.card, reversed: d.reversed }));
    const index = Math.max(0, siblings.findIndex((s) => s.card.id === card.id));
    setSelectedCard({ card, reversed, siblings, index });
    exploredCard(card);
  };

  /** A card in the deck library was tapped: open it, with the deck as its neighbours. */
  const openDeckCard = (card: TarotCard) => {
    const siblings = tarotCards.map((c) => ({ card: c, reversed: false }));
    const index = Math.max(0, tarotCards.findIndex((c) => c.id === card.id));
    setSelectedCard({ card, reversed: false, siblings, index });
    setShowBrowse(false);
    exploredCard(card);
  };

  const navigateDetail = (index: number) => {
    const next = selectedCard?.siblings[index];
    if (!selectedCard || !next) return;
    setSelectedCard({ ...selectedCard, card: next.card, reversed: next.reversed, index });
    exploredCard(next.card);
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
        // The daily spread's catalogue name carries a numeral ("1-card daily"),
        // and a title is set in the display serif: name it as the hero does.
        spreadTitle={spreadTitleFor(currentSpread)}
        spreadLayout={meta?.layout}
        selectedFocus={selectedFocus}
        question={question}
        allRevealed={allRevealed}
        isSaved={isSaved}
        saving={saving}
        sharing={sharing}
        aiUnavailable={
          aiTooManyCards
            ? t('readings.revealView.aiTooManyCards', {
                n: MAX_AI_TAROT_CARDS,
                defaultValue: 'AI readings take spreads of up to {{n}} cards',
              })
            : undefined
        }
        isPremium={!!profile?.isPremium}
        cardBackUrl={profile?.card_back_url}
        showAIInterpretation={showAIInterpretation}
        aiInterpretation={aiInterpretation}
        loadingAI={loadingAI}
        focusReadingLabel={selectedFocus ? t('readings.revealView.focusReading', { focus: focusLabel(selectedFocus) }) : ''}
        getPositionLabel={getPositionLabel}
        onBack={leaveReveal}
        onSave={() => void handleSaveReading()}
        onShare={handleShareReading}
        onRevealCard={handleRevealCard}
        onRevealAll={revealAll}
        onCardClick={openDrawnCard}
        onGetAIInterpretation={handleGetAIInterpretation}
        onHideAIInterpretation={() => setShowAIInterpretation(false)}
        onNewReading={leaveReveal}
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

      <LeaveReadingSheet
        open={confirmLeave && view === 'reveal'}
        inLibrary={aiInLibrary}
        saving={saving}
        onStay={() => setConfirmLeave(false)}
        onSaveAndLeave={() => void saveAndLeave()}
        onLeave={() => {
          setConfirmLeave(false);
          goHome();
        }}
      />

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
