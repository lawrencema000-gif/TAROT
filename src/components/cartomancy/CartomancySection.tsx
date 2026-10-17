import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings2, Lock } from 'lucide-react';
import { Badge, Button, ListRow, ListRowGroup, ListSkeleton, Sheet, toast } from '../ui';
import { SpreadGlyph, type SpreadGlyphPosition } from '../icons';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { localizeCartoSpread, localizePlayingCard, useCartomancyCorpus } from '../../i18n/localizePlayingCard';
import { useAuth } from '../../context/AuthContext';
import { useGamification } from '../../context/GamificationContext';
import { tarotReadings } from '../../dal';
import { combinationHitsToLines, generatePremiumReading, playingCardToReadingCard } from '../../services/readingInterpretation';
import { getDailyReadingCount, incrementDailyReadingCount } from '../../services/offline';
import { getZodiacSign } from '../../utils/zodiac';
import { localDateStr } from '../../utils/localDate';
import { adsService } from '../../services/ads';
import { awardXP } from '../../services/levelSystem';
import { checkAchievementProgress } from '../../services/achievements';
import { WatchAdSheet } from '../premium';
import { rewardedAdsService } from '../../services/rewardedAds';
import { FREE_TIER, type PremiumFeature } from '../../services/premium';
import { isNative } from '../../utils/platform';
import { ratePromptService } from '../../services/ratePrompt';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { TarotShuffleView } from '../readings/tarot/TarotShuffleView';
import { TarotSelectView } from '../readings/tarot/TarotSelectView';
import { FOCUS_AREA_I18N_KEY, type FocusArea } from '../readings/tarot/types';
import { newReadingId } from '../readings/tarot/readingId';
import { CARTO_SPREADS, getPlayingCard, getPlayingCardBySlug } from '../../data/cartomancy';
import type { CartoSpread, PlayingCard } from '../../types/cartomancy';
import { CartomancyFocusView } from './CartomancyFocusView';
import { CartomancyRevealView } from './CartomancyRevealView';
import { CartomancyCardDetail } from './CartomancyCardDetail';
import { CartomancySettingsSheet } from './CartomancySettingsSheet';
import {
  cartoAchievementEvents,
  cartoCombinations,
  cartoCombinationsForAI,
  cartoDeckIds,
  cartoPositionsForAI,
  cartoSpreadFeature,
  cartoSpreadOrDefault,
  cartoTableLabel,
  cartoVerdict,
  dealCards,
  loadCartoSettings,
  saveCartoSettings,
  shuffleIds,
  toSavedCards,
  verdictLine,
  type CartoFocus,
  type CartoSettings,
  type DealtCard,
} from './cartoFlow';
import { CartomancyCorpusGate } from './CartomancyCorpusGate';
import { sharePlayingReading, useShareOnce } from './shareReading';

/*
 * The playing-card reading flow: home (pick a spread) → focus and question →
 * shuffle → select → reveal.
 *
 * TarotSection's machine, run over the playing deck. The shuffle and select
 * stages are the tarot views unchanged (they take ids and a back image);
 * the focus adds the question; the reveal is the cartomancy table and the
 * ResultSheet. This component owns the state and every side effect — the
 * deck as the settings compose it, the picks, the reversals when they are
 * on, the free tier's daily allowance (shared with tarot: one counter), the
 * ad unlocks, XP and achievements, save, share and the AI reading.
 */

const SHUFFLE_MS = 2000;

type CartoView = 'home' | 'focus' | 'shuffle' | 'select' | 'reveal';

interface AdRequest {
  feature: PremiumFeature;
  spreadId: string | null;
}

export interface CartomancySectionProps {
  onShowPaywall: (feature: string) => void;
  /** Begin this spread on mount (from the hub's spread rows). */
  initialSpread?: string | null;
  /** Where the home view's back control leads. */
  onExit?: () => void;
}

/** The spread's shape for the picker rows: its cells on a grid. */
function glyphLayout(spread: CartoSpread): SpreadGlyphPosition[] {
  const { layout } = spread;
  if (layout.kind === 'arc') {
    // the arc, flattened to a 7×2 stair: ends low, centre high
    return layout.cells.map((c) => ({ x: c.index, y: c.index === 3 ? 0 : c.index === 2 || c.index === 4 ? 1 : 2 }));
  }
  if (layout.kind === 'row') return layout.cells.map((c) => ({ x: c.col, y: 0 }));
  return layout.cells.map((c) => ({ x: c.span && c.span > 1 ? 0.5 : c.col, y: c.row }));
}

function CartomancySectionBody({ onShowPaywall, initialSpread = null, onExit }: CartomancySectionProps) {
  const { t } = useT('app');
  const navigate = useNavigate();
  const locale = getLocale();
  const { user, profile, refreshProfile } = useAuth();
  const { openRatePrompt } = useGamification();
  const { tryConsume: tryConsumeAi, refund: refundAi, EarnSheet: AiEarnSheet } = useMoonstoneSpend('tarot-ai-interpret');

  const [view, setView] = useState<CartoView>('home');
  const [currentSlug, setCurrentSlug] = useState<string>(() => cartoSpreadOrDefault(initialSpread).slug);
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DealtCard[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  /** The saved row of the reading on screen, so an AI reading generated after the save is attached to it. */
  const savedIdRef = useRef<string | null>(null);
  /**
   * The table whose save is on its way, by reading id. Set before the
   * insert's await: `isSaved` renders only once the insert has answered, so
   * the second tap of a double tap (6–120 ms later) found it false and saved
   * the table again — a second Library row, and the XP, the ad check and the
   * rate prompt run twice (p9 R11; the tarot reveal's guard).
   */
  const savingRef = useRef<string | null>(null);
  /** The table on screen is being saved: the bookmark spins and waits (savingRef is the guard, this is its face). */
  const [saving, setSaving] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [deckCards, setDeckCards] = useState<number[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  /**
   * The table on screen, by id: minted when its cards are dealt and sent as
   * the requestId of every AI request for it, so generate-reading treats a
   * second request for the same table as a free replay, never a second
   * charge (readingId.ts; the tarot reveal's p8 F09, on this table too).
   */
  const readingIdRef = useRef<string | null>(null);
  /**
   * The table whose AI reading is on its way. Set before the first await
   * (the balance check), so a second tap is ignored before `loadingAI` has
   * rendered: a double tap used to send two requests, each charged.
   */
  const aiInFlightRef = useRef<string | null>(null);
  const [showAIInterpretation, setShowAIInterpretation] = useState(false);
  const { sharing, shareOnce } = useShareOnce();
  const [adRequest, setAdRequest] = useState<AdRequest | null>(null);
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState<Record<string, boolean>>({});
  const [dailyReadingCount, setDailyReadingCount] = useState(0);
  const [canWatchAd, setCanWatchAd] = useState(false);
  const [settings, setSettings] = useState<CartoSettings>(() => loadCartoSettings());
  const [showSettings, setShowSettings] = useState(false);
  /** Cards to draw when the spread offers a variant (Yes or No: 3 or 5); null is the spread's own count. */
  const [drawCount, setDrawCount] = useState<number | null>(null);
  /**
   * The gate's async inputs — today's count, whether an ad can be watched,
   * the temporary unlocks — have resolved. A spread launched from a deep
   * link waits for them: run against the initial `0` / `false` / `{}`, the
   * gates let a reader past the daily limit to the focus step and send an
   * Android reader straight to the subscription paywall instead of the
   * Moonstone or ad unlock.
   */
  const [countsReady, setCountsReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);

  const shuffleTimerRef = useRef<number | null>(null);
  const rewardedRef = useRef(false);

  // Re-read the corpus when it lands: the section stays mounted through a
  // language change (CartomancyCorpusGate holds only the first mount), so the
  // text re-localizes in place instead of the table being thrown away.
  const corpusReady = useCartomancyCorpus();
  const spread = useMemo(() => localizeCartoSpread(cartoSpreadOrDefault(currentSlug), locale), [currentSlug, locale, corpusReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const localize = useCallback((card: PlayingCard) => localizePlayingCard(card, locale), [locale, corpusReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const spreads = useMemo(() => CARTO_SPREADS.map((s) => localizeCartoSpread(s, locale)), [locale, corpusReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const significator = settings.significator ? getPlayingCardBySlug(settings.significator) ?? null : null;
  const variantCount = spread.layout.kind === 'row' ? spread.layout.variant?.cardCount ?? null : null;
  const cardCount = drawCount !== null && (drawCount === spread.cardCount || drawCount === variantCount) ? drawCount : spread.cardCount;

  // The free tier's count belongs to the account, and is the one tarot keeps
  // (services/offline, p8 F52): read again when the account changes.
  const userId = user?.id ?? null;
  useEffect(() => {
    let live = true;
    Promise.all([
      getDailyReadingCount(userId),
      isNative() ? rewardedAdsService.canWatchAd().catch(() => false) : Promise.resolve(false),
    ]).then(([count, canWatch]) => {
      if (!live) return;
      setDailyReadingCount(count);
      setCanWatchAd(canWatch);
      setCountsReady(true);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  useEffect(
    () => () => {
      if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current);
    },
    [],
  );

  const isAtDailyLimit = !profile?.isPremium && dailyReadingCount >= FREE_TIER.dailyReadings;

  useEffect(() => {
    let live = true;
    const checkTemporaryAccess = async () => {
      if (profile?.isPremium) {
        setAccessReady(true);
        return;
      }
      const accessMap: Record<string, boolean> = {};
      try {
        for (const s of CARTO_SPREADS) {
          const feature = cartoSpreadFeature(s);
          if (feature && !s.free) accessMap[s.slug] = await rewardedAdsService.hasTemporaryAccess(feature, s.slug);
        }
        accessMap['extra_reading'] = await rewardedAdsService.hasTemporaryAccess('extra_reading');
      } catch {
        // no grants known: the gates fall back to the paywall or the unlock sheet
      }
      if (!live) return;
      setHasTemporaryAccess((prev) => {
        const next = { ...prev };
        for (const [key, granted] of Object.entries(accessMap)) next[key] = prev[key] || granted;
        return next;
      });
      setAccessReady(true);
    };
    checkTemporaryAccess();
    return () => {
      live = false;
    };
  }, [profile?.isPremium, adRequest]);

  // Each stage starts at its top: the select stage of a 21-card spread is
  // scrolled to its Reveal button, and the table must not open mid-legend.
  const firstViewRef = useRef(true);
  useEffect(() => {
    if (firstViewRef.current) {
      firstViewRef.current = false;
      return;
    }
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // jsdom and old WebViews: nothing to scroll
    }
  }, [view]);

  const updateSettings = (next: CartoSettings) => {
    setSettings(next);
    saveCartoSettings(next);
  };

  const resetReadingState = () => {
    setSelectedFocus(null);
    setDrawCount(null);
    setQuestion('');
    setIsSaved(false);
    savedIdRef.current = null;
    setShowAIInterpretation(false);
    setAiInterpretation(null);
  };

  /** Every gate between the reader and the shuffle, in TarotSection's order. */
  const clearGates = (slug: string, access: Record<string, boolean> = hasTemporaryAccess): boolean => {
    const target = CARTO_SPREADS.find((s) => s.slug === slug);
    if (!target) return false;
    if (profile?.isPremium) return true;
    if (!target.free && !access[slug]) {
      const feature = cartoSpreadFeature(target);
      if (feature && isNative() && canWatchAd) setAdRequest({ feature, spreadId: slug });
      else onShowPaywall(localizeCartoSpread(target, locale).name);
      return false;
    }
    if (isAtDailyLimit && !access['extra_reading']) {
      if (isNative() && canWatchAd) setAdRequest({ feature: 'extra_reading', spreadId: null });
      else onShowPaywall(t('readings.paywall.unlimited'));
      return false;
    }
    return true;
  };

  const beginReading = (slug: string) => {
    setCurrentSlug(slug);
    resetReadingState();
    if (!clearGates(slug)) return;
    setView('focus');
  };

  // A deep link (?spread=) begins its spread once every gate input is known:
  // the daily count, the ad and unlock state, and the profile (a premium
  // reader whose profile has not loaded yet must not meet the paywall).
  const gatesReady = countsReady && accessReady && (!user || !!profile);
  const [launched, setLaunched] = useState<string | null>(null);
  const launchable = !!initialSpread && CARTO_SPREADS.some((s) => s.slug === initialSpread);
  /** The deep-linked spread is waiting on the gates: hold the picker back so it does not flash first. */
  const launchPending = launchable && launched !== initialSpread;
  useEffect(() => {
    if (!initialSpread || launched === initialSpread || !gatesReady) return;
    setLaunched(initialSpread);
    if (launchable) beginReading(initialSpread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpread, gatesReady]);

  const goHome = () => {
    setView('home');
  };

  const handleDraw = () => {
    if (!selectedFocus) return;
    if (!clearGates(currentSlug)) return;
    setView('shuffle');
  };

  const handleAdUnlocked = () => {
    if (!adRequest) return;
    const granted = adRequest.feature === 'extra_reading' ? 'extra_reading' : adRequest.spreadId;
    setAdRequest(null);
    if (!granted) return;
    const access = { ...hasTemporaryAccess, [granted]: true };
    setHasTemporaryAccess(access);
    if (!clearGates(currentSlug, access)) return;
    if (selectedFocus) setView('shuffle');
    else {
      resetReadingState();
      setView('focus');
    }
  };

  const finishShuffle = () => {
    if (shuffleTimerRef.current !== null) {
      window.clearTimeout(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    setDeckCards(shuffleIds(cartoDeckIds(settings)));
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

  const handleCardSelect = (cardId: number) => {
    setSelectedIndices((prev) => {
      const at = prev.indexOf(cardId);
      if (at >= 0) return prev.slice(0, at);
      if (prev.length >= cardCount) return prev;
      return [...prev, cardId];
    });
  };

  const handleRevealSelected = () => {
    if (selectedIndices.length !== cardCount) return;
    const cards = selectedIndices.map((id) => getPlayingCard(id)).filter((c): c is PlayingCard => !!c);
    if (cards.length !== cardCount) {
      toast(t('readings.toasts.cardsNotFound'), 'error');
      return;
    }
    rewardedRef.current = false;
    setDrawnCards(dealCards(cards, settings.reversals));

    (async () => {
      await incrementDailyReadingCount(userId);
      setDailyReadingCount(await getDailyReadingCount(userId));
      if (!profile?.isPremium) {
        const target = CARTO_SPREADS.find((s) => s.slug === currentSlug);
        if (target && !target.free && hasTemporaryAccess[currentSlug]) {
          const feature = cartoSpreadFeature(target);
          if (feature) {
            await rewardedAdsService.consumeTemporaryAccess(feature, currentSlug);
            setHasTemporaryAccess((prev) => ({ ...prev, [currentSlug]: false }));
          }
        }
        if (isAtDailyLimit && hasTemporaryAccess['extra_reading']) {
          await rewardedAdsService.consumeTemporaryAccess('extra_reading');
          setHasTemporaryAccess((prev) => ({ ...prev, extra_reading: false }));
        }
      }
    })();

    // A new table: its own id, and no AI request of its own yet (one still
    // running for the last table answers into nothing).
    readingIdRef.current = newReadingId();
    setLoadingAI(false);
    setAiInterpretation(null);
    setShowAIInterpretation(false);
    setIsSaved(false);
    setSaving(false);
    savedIdRef.current = null;
    setView('reveal');
  };

  const handleRevealCard = (index: number) => {
    setDrawnCards((prev) => prev.map((c, i) => (i === index ? { ...c, revealed: true } : c)));
  };
  const revealAll = () => setDrawnCards((prev) => prev.map((c) => ({ ...c, revealed: true })));
  const allRevealed = drawnCards.length > 0 && drawnCards.every((c) => c.revealed);

  useEffect(() => {
    if (view !== 'reveal' || drawnCards.length === 0 || !allRevealed || rewardedRef.current) return;
    rewardedRef.current = true;
    if (!user) return;
    // awardXP reports 'reading_complete' to the achievements itself
    // (levelSystem.ts); a second report here counted every reading twice.
    awardXP(user.id, 'reading_complete').then(() => refreshProfile());
    for (const event of cartoAchievementEvents(currentSlug, drawnCards.map((d) => d.card))) {
      checkAchievementProgress(user.id, event.activityType, 1, event.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, allRevealed, drawnCards.length]);

  // The five-card Yes or No numbers its cards: the spread names three positions.
  const getPositionLabel = (index: number): string =>
    cartoTableLabel(
      spread,
      cardCount,
      index,
      (n) => t('readings.selectView.cardN', { n, defaultValue: 'Card {{n}}' }),
      (n) => t('readings.positions.generic', { index: n }),
    );

  const focusForAI: CartoFocus = selectedFocus === 'Love' ? 'love' : selectedFocus === 'Career' || selectedFocus === 'Money' ? 'career' : 'general';
  const tableCards = drawnCards.map((d) => d.card);
  const verdict = useMemo(() => (drawnCards.length ? cartoVerdict(spread, tableCards) : null), [spread, drawnCards]); // eslint-disable-line react-hooks/exhaustive-deps
  const combinations = useMemo(() => (drawnCards.length ? cartoCombinations(spread, tableCards) : []), [spread, drawnCards]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Share the table: its link, with card `featured` on the image. One share
   * at a time (useShareOnce): the reveal's button and the card detail's both
   * come through here, and a second tap while the image renders does
   * nothing (p8 O#78). It used to start a second render and a second sheet.
   */
  const shareTable = (featured: number) =>
    shareOnce(async () => {
      if (drawnCards.length === 0) return;
      await sharePlayingReading(
        {
          spreadSlug: currentSlug,
          spreadName: spread.name,
          cards: drawnCards.map((d) => ({ card: d.card, reversed: d.reversed })),
          featured,
          question: question.trim() || undefined,
          date: new Date().toISOString(),
          localize,
        },
        t,
      );
    });

  const handleShareReading = () => {
    const firstUp = drawnCards.findIndex((c) => c.revealed);
    return shareTable(firstUp >= 0 ? firstUp : 0);
  };

  /**
   * Save the table on screen — once. A table already saved, or whose save is
   * on its way, is a no-op: both are checked in refs, which a second tap
   * reads before `isSaved` has rendered.
   */
  const handleSaveReading = async () => {
    const readingId = readingIdRef.current;
    if (!user || drawnCards.length === 0 || !readingId) return;
    if (isSaved || savedIdRef.current || savingRef.current === readingId) return;
    savingRef.current = readingId;
    setSaving(true);
    let res: Awaited<ReturnType<typeof tarotReadings.insertReturningId>>;
    try {
      res = await tarotReadings.insertReturningId({
        userId: user.id,
        // The reader's own calendar day, as the tarot save stamps it: the UTC
        // day filed a reading saved before 09:00 in Tokyo under the day before,
        // and an evening one in the Americas under the day after (p8 F47).
        date: localDateStr(),
        spreadType: currentSlug,
        focusArea: selectedFocus,
        cards: toSavedCards(drawnCards, getPositionLabel),
        interpretation: aiInterpretation ?? undefined,
        question: question.trim() || undefined,
        saved: true,
      });
    } finally {
      if (savingRef.current === readingId) savingRef.current = null;
      // A newer table has its own bookmark (reset when it was dealt).
      if (readingIdRef.current === readingId) setSaving(false);
    }
    if (!res.ok) {
      toast(t('readings.toasts.saveFailed'), 'error');
      return;
    }
    // The row belongs to the table it was saved from. A reader who dealt
    // another table while the insert ran has that one on screen: it is not
    // saved, and an AI reading for it must not land on this row.
    if (readingIdRef.current === readingId) {
      savedIdRef.current = res.data.id;
      setIsSaved(true);
    }
    toast(t('readings.toasts.readingSaved'), 'success');
    // awardXP reports 'reading_saved' to the achievements itself.
    awardXP(user.id, 'reading_saved').then(() => refreshProfile());
    await adsService.checkAndShowAd(profile?.isPremium || false, 'reading', profile?.isAdFree || false);
    await ratePromptService.incrementPositiveActions(user.id);
    if (await ratePromptService.shouldShowPrompt(user.id)) {
      await ratePromptService.recordPromptShown(user.id);
      openRatePrompt();
    }
  };

  const handleGetAIInterpretation = async () => {
    const readingId = readingIdRef.current;
    if (!user || drawnCards.length === 0 || !readingId) return;
    // This table's reading is already on its way: a second tap does nothing.
    // Checked and set before the first await (see aiInFlightRef).
    if (aiInFlightRef.current === readingId) return;
    // Already here (the reader went back to the card meanings): show it again, free.
    if (aiInterpretation) {
      setShowAIInterpretation(true);
      return;
    }
    aiInFlightRef.current = readingId;
    setLoadingAI(true);
    try {
      // The chip shows a free reader the price; the server debits it. The
      // hook opens the earn sheet when the balance will not cover it.
      const ok = await tryConsumeAi();
      if (!ok) return;
      const result = await generatePremiumReading({
        cards: drawnCards.map((d) => playingCardToReadingCard(d.card, d.reversed)),
        spreadType: currentSlug,
        focusArea: focusForAI,
        question: question || undefined,
        zodiacSign: profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined,
        goals: profile?.goals,
        deck: 'playing',
        positions: cartoPositionsForAI(drawnCards.map((_, i) => getPositionLabel(i))),
        // The table-wide findings first: the server reads six (p8 O#60).
        combinations: combinationHitsToLines(cartoCombinationsForAI(combinations)),
        verdict: verdictLine(verdict),
        jokers: settings.jokers,
        reversals: settings.reversals,
        // The table's id, not a fresh one per call: a repeat of this request
        // is the same request to the server, answered without a second charge.
        requestId: readingId,
      });
      // The reader dealt another table meanwhile: this text is not its reading.
      if (readingIdRef.current !== readingId) return;
      if (result.fallback === true) {
        // Every AI provider failed and the server sent the cards' own
        // meanings instead, refunding the charge: not shown or saved as
        // the AI reading, so asking again later makes a real attempt.
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
      setAiInterpretation(result.interpretation);
      setShowAIInterpretation(true);
      // Saved before the AI reading was asked for: the saved row carries
      // the text that was paid for (it used to keep none).
      const savedId = savedIdRef.current;
      if (savedId) {
        void tarotReadings.updateInterpretation(savedId, result.interpretation).then((r) => {
          if (!r.ok) console.warn('[CartomancySection] could not attach the interpretation to the saved reading:', r.error);
        });
      }
      toast(result.usedLlm ? t('readings.toasts.aiReady') : t('readings.toasts.interpretationReady'), 'success');
    } catch (error) {
      await refundAi();
      console.error('Failed to generate AI interpretation:', error);
      if (readingIdRef.current !== readingId) return;
      // The server's error, said in words (generatePremiumReading throws the
      // envelope's message, not its code); never the raw text. The mapping
      // the tarot reveal uses.
      const raw = error instanceof Error ? error.message : '';
      const message = /INSUFFICIENT_BALANCE|enough Moonstones/i.test(raw)
        ? t('readings.toasts.aiInsufficient')
        : // generate-reading answers 429 DAILY_LIMIT_REACHED with the message
          // "Daily reading limit reached" (readingInterpretation throws the message)
          /AI_SOFT_CAP|AI_DAILY_LIMIT|DAILY_LIMIT_REACHED|daily reading limit|today's AI limit/i.test(raw)
          ? t('readings.toasts.aiLimit')
          : // 409 REQUEST_IN_FLIGHT: an earlier request for this table (one the
            // connection dropped) is still being written. It was charged once;
            // asking again returns it without a second charge.
            /REQUEST_IN_FLIGHT|still being worked on/i.test(raw)
            ? t('readings.revealView.aiStillWriting', {
                defaultValue: 'Your AI interpretation is still being written. Try again in a few seconds — you won’t be charged twice.',
              })
            : t('readings.toasts.aiFailed');
      toast(message, 'error');
    } finally {
      if (aiInFlightRef.current === readingId) aiInFlightRef.current = null;
      // A newer table has its own state (reset when it was dealt).
      if (readingIdRef.current === readingId) setLoadingAI(false);
    }
  };

  // ── Stages ──────────────────────────────────────────────────────────────

  let stage: ReactElement;

  if (view === 'focus') {
    stage = (
      <CartomancyFocusView
        spread={spread}
        selectedFocus={selectedFocus}
        question={question}
        cardCount={cardCount}
        onCardCountChange={setDrawCount}
        onBack={goHome}
        onSelect={setSelectedFocus}
        onQuestionChange={setQuestion}
        onContinue={handleDraw}
      />
    );
  } else if (view === 'shuffle') {
    stage = (
      <TarotShuffleView isShuffling={isShuffling} cardBackUrl={profile?.card_back_url} onBack={handleShuffleBack} onShuffle={handleShuffleStart} onCut={handleCutDeck} />
    );
  } else if (view === 'select') {
    const needsMore = cardCount - selectedIndices.length;
    const positionLabels = Array.from({ length: cardCount }, (_, i) => getPositionLabel(i));
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
    stage = (
      <CartomancyRevealView
        spread={spread}
        drawnCards={drawnCards}
        question={question}
        focusLabel={selectedFocus ? t('readings.revealView.focusReading', { focus: t(FOCUS_AREA_I18N_KEY[selectedFocus]) }) : ''}
        focus={focusForAI}
        allRevealed={allRevealed}
        isSaved={isSaved}
        saving={saving}
        sharing={sharing}
        isPremium={!!profile?.isPremium}
        cardBackUrl={profile?.card_back_url}
        significator={significator}
        verdict={verdict}
        combinations={combinations}
        showAIInterpretation={showAIInterpretation}
        aiInterpretation={aiInterpretation}
        loadingAI={loadingAI}
        getPositionLabel={getPositionLabel}
        localize={localize}
        onBack={goHome}
        onSave={handleSaveReading}
        onShare={handleShareReading}
        onRevealCard={handleRevealCard}
        onRevealAll={revealAll}
        onCardClick={setSelectedIndex}
        onGetAIInterpretation={handleGetAIInterpretation}
        onToggleAI={setShowAIInterpretation}
        onNewReading={goHome}
      />
    );
  } else if (launchPending) {
    stage = (
      <div role="status" aria-busy="true" aria-label={t('common:labels.loading', { defaultValue: 'Loading…' })}>
        <ListSkeleton count={3} />
      </div>
    );
  } else {
    stage = (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (onExit ? onExit() : navigate('/cartomancy'))}
            className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            {t('readings.back')}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label={t('cartomancy.settings.title', { defaultValue: 'How the deck is read' })}
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-mystic-300 transition-colors duration-fast [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-100 active:text-mystic-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-2">
          {/* The page header above already says "Cartomancy"; no second eyebrow. */}
          <h2 className="heading-display-lg text-mystic-100">{t('cartomancy.reading.chooseSpread', { defaultValue: 'Choose a spread' })}</h2>
          <p className="text-ui text-mystic-400">
            {[
              settings.jokers ? t('cartomancy.settings.jokersOn', { defaultValue: '54 cards with Jokers' }) : t('cartomancy.settings.jokersOff', { defaultValue: '52 cards' }),
              settings.reversals ? t('cartomancy.settings.reversalsOn', { defaultValue: 'reversals on' }) : t('cartomancy.settings.reversalsOff', { defaultValue: 'no reversals' }),
              significator ? t('cartomancy.settings.significatorTag', { defaultValue: 'Significator: {{name}}', name: localize(significator).name }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <ListRowGroup>
          {spreads.map((s) => {
            const locked = !profile?.isPremium && !s.free && !hasTemporaryAccess[s.slug];
            return (
              <ListRow
                key={s.slug}
                size="lg"
                icon={<SpreadGlyph layout={glyphLayout(s)} />}
                tone="gold"
                label={
                  <span className="whitespace-normal">
                    {s.name}
                    {locked && (
                      <>
                        {' '}
                        <Badge tone="violet" className="align-middle">
                          <Lock className="w-3 h-3" aria-hidden />
                          {t('cartomancy.reading.premium', { defaultValue: 'Premium' })}
                        </Badge>
                      </>
                    )}
                  </span>
                }
                meta={t('cartomancy.reading.cardsAndMinutes', { defaultValue: '{{count}} cards · {{minutes}} min', defaultValue_one: '{{count}} card · {{minutes}} min', count: s.cardCount, minutes: s.durationMin })}
                onClick={() => beginReading(s.slug)}
              />
            );
          })}
        </ListRowGroup>

        <Button variant="ghost" fullWidth onClick={() => navigate('/cartomancy/cards')}>
          {t('cartomancy.home.libraryTitle', { defaultValue: 'Every card’s meaning' })}
        </Button>
      </div>
    );
  }

  const selected = selectedIndex !== null ? drawnCards[selectedIndex] : null;

  return (
    <>
      {stage}

      <Sheet open={!!selected} onClose={() => setSelectedIndex(null)} title={selected ? localize(selected.card).name : undefined}>
        {selected && (
          <CartomancyCardDetail
            card={selected.card}
            reversed={selected.reversed}
            localize={localize}
            sequence={drawnCards.length > 1 ? tableCards : undefined}
            onNavigate={drawnCards.length > 1 ? (card) => setSelectedIndex(drawnCards.findIndex((d) => d.card.id === card.id)) : undefined}
            onShare={() => {
              if (selectedIndex !== null) void shareTable(selectedIndex);
            }}
            sharing={sharing}
          />
        )}
      </Sheet>

      <CartomancySettingsSheet open={showSettings} settings={settings} onChange={updateSettings} onClose={() => setShowSettings(false)} localize={localize} />

      {adRequest && (
        <WatchAdSheet
          key={`${adRequest.feature}:${adRequest.spreadId ?? ''}`}
          open
          onClose={() => setAdRequest((prev) => (prev === adRequest ? null : prev))}
          actionKey={adRequest.feature === 'extra_reading' ? 'tarot-extra-reading' : `tarot-spread:${adRequest.spreadId ?? 'unknown'}`}
          feature={adRequest.feature}
          spreadType={adRequest.spreadId || undefined}
          itemName={adRequest.spreadId ? spreads.find((s) => s.slug === adRequest.spreadId)?.name : undefined}
          onSpent={handleAdUnlocked}
          onShowPaywall={() => {
            setAdRequest(null);
            onShowPaywall(adRequest.spreadId ? spreads.find((s) => s.slug === adRequest.spreadId)?.name ?? t('readings.paywall.unlimited') : t('readings.paywall.unlimited'));
          }}
        />
      )}
      {AiEarnSheet}
    </>
  );
}

/**
 * The playing-card reading flow, once the corpus for the active locale is
 * loaded (English: at once). The card text, spreads and the share card all
 * read it, so nothing below renders before it lands.
 */
export function CartomancySection(props: CartomancySectionProps) {
  return (
    <CartomancyCorpusGate>
      <CartomancySectionBody {...props} />
    </CartomancyCorpusGate>
  );
}
