import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings2, Lock } from 'lucide-react';
import { Badge, Button, ListRow, ListRowGroup, Sheet, toast } from '../ui';
import { SpreadGlyph, type SpreadGlyphPosition } from '../icons';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { localizeCartoSpread, localizePlayingCard } from '../../i18n/localizePlayingCard';
import { useAuth } from '../../context/AuthContext';
import { useGamification } from '../../context/GamificationContext';
import { tarotReadings } from '../../dal';
import { shareOrDownloadCard } from '../../utils/shareCard';
import { encodeReading, buildShareUrl } from '../../services/shareableReadings';
import { combinationHitsToLines, generatePremiumReading, playingCardToReadingCard } from '../../services/readingInterpretation';
import { getZodiacSign } from '../../utils/zodiac';
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
import { CARTO_SPREADS, getPlayingCard, getPlayingCardBySlug } from '../../data/cartomancy';
import type { CartoSpread, PlayingCard } from '../../types/cartomancy';
import { CartomancyFocusView } from './CartomancyFocusView';
import { CartomancyRevealView } from './CartomancyRevealView';
import { CartomancyCardDetail } from './CartomancyCardDetail';
import { CartomancySettingsSheet } from './CartomancySettingsSheet';
import {
  cartoAchievementEvents,
  cartoCombinations,
  cartoDeckIds,
  cartoPositionLabel,
  cartoPositionsForAI,
  cartoSpreadFeature,
  cartoSpreadOrDefault,
  cartoVerdict,
  dealCards,
  getDailyReadingCount,
  incrementDailyReadingCount,
  loadCartoSettings,
  saveCartoSettings,
  shuffleIds,
  toSavedCards,
  verdictLine,
  type CartoFocus,
  type CartoSettings,
  type DealtCard,
} from './cartoFlow';

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

export function CartomancySection({ onShowPaywall, initialSpread = null, onExit }: CartomancySectionProps) {
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
  const [settings, setSettings] = useState<CartoSettings>(() => loadCartoSettings());
  const [showSettings, setShowSettings] = useState(false);

  const shuffleTimerRef = useRef<number | null>(null);
  const rewardedRef = useRef(false);

  const spread = useMemo(() => localizeCartoSpread(cartoSpreadOrDefault(currentSlug), locale), [currentSlug, locale]);
  const localize = useCallback((card: PlayingCard) => localizePlayingCard(card, locale), [locale]);
  const spreads = useMemo(() => CARTO_SPREADS.map((s) => localizeCartoSpread(s, locale)), [locale]);
  const significator = settings.significator ? getPlayingCardBySlug(settings.significator) ?? null : null;

  useEffect(() => {
    getDailyReadingCount().then(setDailyReadingCount);
    if (isNative()) rewardedAdsService.canWatchAd().then(setCanWatchAd);
  }, []);

  useEffect(
    () => () => {
      if (shuffleTimerRef.current !== null) window.clearTimeout(shuffleTimerRef.current);
    },
    [],
  );

  const isAtDailyLimit = !profile?.isPremium && dailyReadingCount >= FREE_TIER.dailyReadings;

  useEffect(() => {
    const checkTemporaryAccess = async () => {
      if (profile?.isPremium) return;
      const accessMap: Record<string, boolean> = {};
      for (const s of CARTO_SPREADS) {
        const feature = cartoSpreadFeature(s);
        if (feature && !s.free) accessMap[s.slug] = await rewardedAdsService.hasTemporaryAccess(feature, s.slug);
      }
      accessMap['extra_reading'] = await rewardedAdsService.hasTemporaryAccess('extra_reading');
      setHasTemporaryAccess((prev) => {
        const next = { ...prev };
        for (const [key, granted] of Object.entries(accessMap)) next[key] = prev[key] || granted;
        return next;
      });
    };
    checkTemporaryAccess();
  }, [profile?.isPremium, adRequest]);

  const updateSettings = (next: CartoSettings) => {
    setSettings(next);
    saveCartoSettings(next);
  };

  const resetReadingState = () => {
    setSelectedFocus(null);
    setQuestion('');
    setIsSaved(false);
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

  const launchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialSpread || launchedRef.current === initialSpread) return;
    launchedRef.current = initialSpread;
    if (CARTO_SPREADS.some((s) => s.slug === initialSpread)) beginReading(initialSpread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpread]);

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
      if (prev.length >= spread.cardCount) return prev;
      return [...prev, cardId];
    });
  };

  const handleRevealSelected = () => {
    if (selectedIndices.length !== spread.cardCount) return;
    const cards = selectedIndices.map((id) => getPlayingCard(id)).filter((c): c is PlayingCard => !!c);
    if (cards.length !== spread.cardCount) {
      toast(t('readings.toasts.cardsNotFound'), 'error');
      return;
    }
    rewardedRef.current = false;
    setDrawnCards(dealCards(cards, settings.reversals));

    (async () => {
      await incrementDailyReadingCount();
      setDailyReadingCount(await getDailyReadingCount());
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

    setAiInterpretation(null);
    setShowAIInterpretation(false);
    setIsSaved(false);
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
    awardXP(user.id, 'reading_complete').then(() => refreshProfile());
    checkAchievementProgress(user.id, 'reading_complete');
    for (const event of cartoAchievementEvents(currentSlug, drawnCards.map((d) => d.card))) {
      checkAchievementProgress(user.id, event.activityType, 1, event.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, allRevealed, drawnCards.length]);

  const getPositionLabel = (index: number): string =>
    cartoPositionLabel(spread, index, (n) => t('readings.positions.generic', { index: n }));

  const focusForAI: CartoFocus = selectedFocus === 'Love' ? 'love' : selectedFocus === 'Career' || selectedFocus === 'Money' ? 'career' : 'general';
  const tableCards = drawnCards.map((d) => d.card);
  const verdict = useMemo(() => (drawnCards.length ? cartoVerdict(spread, tableCards) : null), [spread, drawnCards]); // eslint-disable-line react-hooks/exhaustive-deps
  const combinations = useMemo(() => (drawnCards.length ? cartoCombinations(spread, tableCards) : []), [spread, drawnCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareCard = async (featured: DealtCard) => {
    const card = localize(featured.card);
    const shareUrl = buildShareUrl(
      encodeReading({
        spreadSlug: currentSlug,
        cards: drawnCards.map((d) => ({ id: d.card.id, reversed: d.reversed })),
        question: question || undefined,
        date: new Date().toISOString(),
        kind: 'playing',
      }),
    );
    const shareText = `${t('cartomancy.shareText', { defaultValue: 'My {{spread}} playing-card reading on Arcana', spread: spread.name })}\n${shareUrl}`;
    const outcome = await shareOrDownloadCard(
      {
        variant: 'cartomancy',
        cardSlug: featured.card.slug,
        cardName: card.name,
        suit: featured.card.suit,
        rank: featured.card.rank,
        color: featured.card.color,
        orientation: featured.reversed ? 'reversed' : 'upright',
        keyword: card.keywords[0] ?? '',
        spreadName: spread.name,
        eyebrow: t('cartomancy.title', { defaultValue: 'Playing cards' }),
      },
      `arcana-reading-${currentSlug}.png`,
      shareText,
    );
    if (outcome === 'downloaded') toast(t('common:actions.saved', { defaultValue: 'Saved' }), 'success');
    else if (outcome === 'failed') {
      try {
        await navigator.clipboard?.writeText(shareText);
        toast(t('common:actions.copied', { defaultValue: 'Copied.' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: 'Couldn’t share. Try again.' }), 'error');
      }
    }
  };

  const handleShareReading = async () => {
    if (drawnCards.length === 0) return;
    await shareCard(drawnCards.find((c) => c.revealed) ?? drawnCards[0]);
  };

  const handleSaveReading = async () => {
    if (!user || drawnCards.length === 0) return;
    if (isSaved) return;
    const res = await tarotReadings.insert({
      userId: user.id,
      date: new Date().toISOString().split('T')[0],
      spreadType: currentSlug,
      focusArea: selectedFocus,
      cards: toSavedCards(drawnCards, getPositionLabel),
      interpretation: aiInterpretation ?? undefined,
      saved: true,
    });
    if (!res.ok) {
      toast(t('readings.toasts.saveFailed'), 'error');
      return;
    }
    setIsSaved(true);
    toast(t('readings.toasts.readingSaved'), 'success');
    awardXP(user.id, 'reading_saved').then(() => refreshProfile());
    checkAchievementProgress(user.id, 'reading_saved');
    await adsService.checkAndShowAd(profile?.isPremium || false, 'reading', profile?.isAdFree || false);
    await ratePromptService.incrementPositiveActions(user.id);
    if (await ratePromptService.shouldShowPrompt(user.id)) {
      await ratePromptService.recordPromptShown(user.id);
      openRatePrompt();
    }
  };

  const handleGetAIInterpretation = async () => {
    if (!user || drawnCards.length === 0) return;
    const ok = await tryConsumeAi();
    if (!ok) return;
    setLoadingAI(true);
    try {
      const result = await generatePremiumReading({
        cards: drawnCards.map((d) => playingCardToReadingCard(d.card, d.reversed)),
        spreadType: currentSlug,
        focusArea: focusForAI,
        question: question || undefined,
        zodiacSign: profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined,
        goals: profile?.goals,
        deck: 'playing',
        positions: cartoPositionsForAI(drawnCards.map((_, i) => getPositionLabel(i))),
        combinations: combinationHitsToLines(combinations),
        verdict: verdictLine(verdict),
        jokers: settings.jokers,
        reversals: settings.reversals,
      });
      setAiInterpretation(result.interpretation);
      setShowAIInterpretation(true);
      toast(result.usedLlm ? t('readings.toasts.aiReady') : t('readings.toasts.interpretationReady'), 'success');
    } catch (error) {
      await refundAi();
      console.error('Failed to generate AI interpretation:', error);
      const raw = error instanceof Error ? error.message : '';
      const message = raw.includes('INSUFFICIENT_BALANCE')
        ? t('readings.toasts.aiInsufficient')
        : raw.includes('AI_SOFT_CAP') || raw.includes('AI_DAILY_LIMIT')
          ? t('readings.toasts.aiLimit')
          : t('readings.toasts.aiFailed');
      toast(message, 'error');
    } finally {
      setLoadingAI(false);
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
    const needsMore = spread.cardCount - selectedIndices.length;
    const positionLabels = Array.from({ length: spread.cardCount }, (_, i) => getPositionLabel(i));
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
        onNewReading={goHome}
      />
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
          <p className="font-display-eyebrow">{t('cartomancy.eyebrow', { defaultValue: 'Cartomancy' })}</p>
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
                label={s.name}
                meta={
                  <>
                    {locked && (
                      <Badge tone="violet" className="mr-2 align-middle">
                        <Lock className="w-3 h-3" aria-hidden />
                        {t('cartomancy.reading.premium', { defaultValue: 'Premium' })}
                      </Badge>
                    )}
                    {t('cartomancy.reading.cardsAndMinutes', { defaultValue: '{{count}} cards · {{minutes}} min', count: s.cardCount, minutes: s.durationMin })}
                  </>
                }
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
            onShare={() => shareCard(selected)}
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
