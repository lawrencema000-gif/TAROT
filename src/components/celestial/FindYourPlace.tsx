import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Loader2, AlertCircle, X, RefreshCw, Bookmark, Crown } from 'lucide-react';
import { Button } from '../ui';
import { useT } from '../../i18n/useT';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { scorePlaces, type PlaceScore, type LifeIntent } from '../../utils/celestialScoring';
import { ccToFlag } from '../../utils/celestialGeo';
import { generateCelestialReading, type CelestialReadingResponse } from '../../dal/celestialReading';
import type { PlanetName, Angle } from '../../utils/astrocartography';

/**
 * "Find Your Place" — the headline flagship feature.
 *
 * One tap → algorithm scores every city in the dataset against the
 * user's birth chart + chosen life-area intent → top city is revealed
 * with a cinematic animation + AI-generated long-form reading.
 *
 * Free users see the button as a premium teaser; tapping opens the
 * paywall. Premium users get the full reveal on tap. Moonstones users
 * spend 250 stones per run (handled by the parent's trySpend).
 *
 * The component is purely the button + reveal modal. The map's flyTo()
 * + beacon-pin are driven from the parent via callbacks.
 */

const PLANET_COLOR: Record<PlanetName, string> = {
  Sun: '#f4d668',
  Moon: '#e6e0ff',
  Mercury: '#a8e8e0',
  Venus: '#f0b8a0',
  Mars: '#e07a5f',
  Jupiter: '#d4af37',
  Saturn: '#c2b280',
  Uranus: '#80c8e8',
  Neptune: '#8e6eb5',
  Pluto: '#a83253',
};

interface Props {
  /** All computed lines (unfiltered — full chart). */
  allLines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  /** Current life-area intent — drives the scoring weights. */
  intent: LifeIntent;
  /** User's birth UTC + light personalisation passed to the AI. */
  birthUtc: string;
  zodiacSign?: string;
  mbtiType?: string;
  locale?: string;
  isPremium: boolean;
  /** Premium-gate hook — opens the paywall. */
  onUpgrade: () => void;
  /** Moonstones spend hook — returns true on success. Free user variant. */
  trySpend: () => Promise<boolean>;
  /** When the reveal opens, the parent flies the map to this city. */
  onReveal: (city: PlaceScore['city']) => void;
  /** Persist the user's chosen destined place via profile update. */
  onSave: (place: { city: PlaceScore['city']; intent: LifeIntent }) => Promise<void>;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'computing' }
  | { kind: 'reading'; result: PlaceScore }
  | { kind: 'done'; result: PlaceScore; reading: CelestialReadingResponse }
  | { kind: 'error'; result: PlaceScore | null; message: string };

export function FindYourPlace({
  allLines,
  intent,
  birthUtc,
  zodiacSign,
  mbtiType,
  locale,
  isPremium,
  onUpgrade,
  trySpend,
  onReveal,
  onSave,
}: Props) {
  const { t } = useT('app');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  async function handleSave() {
    if (phase.kind !== 'done') return;
    setSaving(true);
    try {
      await onSave({ city: phase.result.city, intent });
      setSavedFlash(true);
      // Auto-fade the "Saved!" state back to normal after 2.5s.
      setTimeout(() => setSavedFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  // Score every city against the current intent. Memoised so the
  // expensive Σ over (cities × lines) only runs when inputs change.
  const ranked = useMemo(() => scorePlaces(GLOBAL_CITIES, allLines, intent, 5), [allLines, intent]);

  // Lock body scroll while the reveal modal is open.
  useEffect(() => {
    if (phase.kind === 'idle') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase.kind]);

  async function handleStart() {
    if (ranked.length === 0) {
      setPhase({ kind: 'error', result: null, message: 'No strong place found for this intent — try a different life area.' });
      return;
    }
    if (!isPremium) {
      const spent = await trySpend();
      if (!spent) return;
    }
    const top = ranked[0];
    setPhase({ kind: 'computing' });
    // Brief computing animation to give the user something to look at
    // before the AI call returns. ~1.4s is long enough to feel like
    // "the cosmos is consulting" but short enough that the AI call
    // (typically 4-8s) hides behind the reveal step that follows.
    await new Promise((r) => setTimeout(r, 1400));
    setPhase({ kind: 'reading', result: top });
    onReveal(top.city);
    try {
      const res = await generateCelestialReading({
        mode: 'best-place',
        city: {
          name: top.city.name,
          country: top.city.country,
          lat: top.city.lat,
          lon: top.city.lon,
        },
        intent,
        lines: top.contributingLines.map((c) => ({ planet: c.planet, angle: c.angle, distanceKm: c.distanceKm })),
        birth: { utc: birthUtc },
        userContext: { zodiacSign, mbtiType, locale },
      });
      if (res.ok) {
        setPhase({ kind: 'done', result: top, reading: res.data });
      } else {
        setPhase({ kind: 'error', result: top, message: res.error });
      }
    } catch (err) {
      setPhase({ kind: 'error', result: top, message: err instanceof Error ? err.message : 'unknown error' });
    }
  }

  function handleClose() {
    setPhase({ kind: 'idle' });
  }

  async function handleReroll() {
    // Re-roll: take the next candidate from the ranked list. If we've
    // exhausted candidates, wrap to #1 (rare; only happens after 5+
    // re-rolls on a chart with limited line coverage).
    const used = phase.kind === 'done' || phase.kind === 'reading' || phase.kind === 'error'
      ? phase.result?.city
      : null;
    const usedIndex = used ? ranked.findIndex((r) => r.city.name === used.name && r.city.cc === used.cc) : -1;
    const next = ranked[(usedIndex + 1) % ranked.length];
    if (!next) return;
    if (!isPremium) {
      const spent = await trySpend();
      if (!spent) return;
    }
    setPhase({ kind: 'reading', result: next });
    onReveal(next.city);
    try {
      const res = await generateCelestialReading({
        mode: 'best-place',
        city: {
          name: next.city.name,
          country: next.city.country,
          lat: next.city.lat,
          lon: next.city.lon,
        },
        intent,
        lines: next.contributingLines.map((c) => ({ planet: c.planet, angle: c.angle, distanceKm: c.distanceKm })),
        birth: { utc: birthUtc },
        userContext: { zodiacSign, mbtiType, locale },
      });
      if (res.ok) {
        setPhase({ kind: 'done', result: next, reading: res.data });
      } else {
        setPhase({ kind: 'error', result: next, message: res.error });
      }
    } catch (err) {
      setPhase({ kind: 'error', result: next, message: err instanceof Error ? err.message : 'unknown error' });
    }
  }

  return (
    <>
      {/* ── The CTA button ──────────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => (isPremium ? handleStart() : ranked.length === 0 ? onUpgrade() : handleStart())}
        className="group w-full p-5 rounded-2xl bg-gradient-to-br from-gold/25 via-gold/10 to-mystic-900/60 hairline-gold border border-gold/40 hover:border-gold/60 transition-all text-left relative overflow-hidden"
      >
        {/* Subtle animated shimmer across the card */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(244,214,104,0.18), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-mystic-900/70 hairline-gold flex items-center justify-center">
            <Compass className="w-6 h-6 text-gold" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="heading-display-md text-mystic-100 leading-tight">
                {t('celestial.findPlace.cta.title', { defaultValue: 'Find your destined place' })}
              </h3>
              {!isPremium && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold/90 bg-gold/15 border border-gold/30 rounded-full px-2 py-0.5">
                  <Crown className="w-3 h-3" aria-hidden />
                  {t('celestial.findPlace.cta.premiumBadge', { defaultValue: 'Premium' })}
                </span>
              )}
            </div>
            <p className="text-xs text-mystic-300 leading-relaxed">
              {t('celestial.findPlace.cta.body', {
                defaultValue:
                  'One tap. We read every city against your full birth chart and reveal the single best place for you — with the long-form why.',
              })}
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-gold flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden />
        </div>
      </motion.button>

      {/* ── Reveal modal — full-page takeover with the result ──── */}
      <AnimatePresence>
        {phase.kind !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-mystic-950/85 backdrop-blur-md p-0 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget && (phase.kind === 'done' || phase.kind === 'error')) handleClose();
            }}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative w-full sm:max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-mystic-900 to-mystic-950 hairline-gold shadow-[0_-12px_60px_-12px_rgba(212,175,55,0.25)]"
            >
              {/* Close button — only after the reading lands */}
              {(phase.kind === 'done' || phase.kind === 'error') && (
                <button
                  onClick={handleClose}
                  aria-label="Close"
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-mystic-800/60 hairline-gold-soft hover:bg-mystic-800 text-mystic-200 hover:text-gold flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="p-6 sm:p-8 space-y-6">
                {phase.kind === 'computing' && <ComputingState />}
                {phase.kind === 'reading' && (
                  <RevealHero result={phase.result}>
                    <ReadingLoading />
                  </RevealHero>
                )}
                {phase.kind === 'done' && (
                  <RevealHero result={phase.result}>
                    <ReadingBody
                      reading={phase.reading}
                      onReroll={handleReroll}
                      onSave={handleSave}
                      saving={saving}
                      savedFlash={savedFlash}
                    />
                  </RevealHero>
                )}
                {phase.kind === 'error' && (
                  <div className="space-y-4">
                    {phase.result && <RevealHero result={phase.result}>{null}</RevealHero>}
                    <div className="flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/40 p-4">
                      <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" aria-hidden />
                      <div className="flex-1">
                        <p className="text-sm text-red-200 font-medium mb-1">
                          {t('celestial.findPlace.error.title', { defaultValue: "We couldn't finish your reading" })}
                        </p>
                        <p className="text-xs text-red-300/80 leading-relaxed mb-3">
                          {phase.message}
                        </p>
                        <Button variant="ghost" size="sm" onClick={() => (phase.result ? handleReroll() : handleStart())}>
                          <RefreshCw className="w-3 h-3 mr-1.5" aria-hidden />
                          {t('celestial.findPlace.error.retry', { defaultValue: 'Try again' })}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Subcomponents ────────────────────────────────────────────────

function ComputingState() {
  const { t } = useT('app');
  const stages = [
    'Reading your natal chart',
    'Crossing every city with your planet lines',
    'Weighing the strongest signals',
    'Naming your place…',
  ];
  return (
    <div className="text-center py-12 space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 mx-auto rounded-full border border-gold/40 flex items-center justify-center"
        style={{ background: 'radial-gradient(circle, rgba(244,214,104,0.15), transparent 70%)' }}
      >
        <Compass className="w-7 h-7 text-gold" aria-hidden />
      </motion.div>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <motion.p
            key={s}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.32, duration: 0.4 }}
            className="text-sm text-mystic-300"
          >
            {t(`celestial.findPlace.computing.stage${i}`, { defaultValue: s })}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

function RevealHero({ result, children }: { result: PlaceScore; children: React.ReactNode }) {
  const { t } = useT('app');
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center gap-2"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-gold/80 font-medium">
          {t('celestial.findPlace.hero.eyebrow', { defaultValue: 'Your destined place' })}
        </div>
        <div className="text-6xl" aria-hidden>{ccToFlag(result.city.cc)}</div>
        <h2 className="text-3xl font-display text-mystic-100 leading-tight">
          {result.city.name}
        </h2>
        <p className="text-xs text-mystic-400">{result.city.country}</p>
      </motion.div>

      {/* Contributing planets row — visual constellation */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-mystic-900/40 hairline-gold-soft"
      >
        {result.contributingLines.slice(0, 4).map((line) => (
          <div key={`${line.planet}-${line.angle}`} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: `${PLANET_COLOR[line.planet]}30`,
                color: PLANET_COLOR[line.planet],
                boxShadow: `0 0 12px ${PLANET_COLOR[line.planet]}55`,
              }}
            >
              {line.angle}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-mystic-400">
              {line.planet}
            </span>
            <span className="text-[10px] text-mystic-500">
              {Math.round(line.distanceKm)} km
            </span>
          </div>
        ))}
      </motion.div>

      {children}
    </div>
  );
}

function ReadingLoading() {
  const { t } = useT('app');
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Loader2 className="w-5 h-5 text-gold animate-spin" />
      <p className="text-xs text-mystic-400">
        {t('celestial.findPlace.reading.loading', { defaultValue: 'Composing your reading…' })}
      </p>
    </div>
  );
}

function ReadingBody({
  reading,
  onReroll,
  onSave,
  saving,
  savedFlash,
}: {
  reading: CelestialReadingResponse;
  onReroll: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  savedFlash: boolean;
}) {
  const { t } = useT('app');
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      <p className="text-lg sm:text-xl font-medium text-mystic-100 italic leading-snug text-center px-2">
        "{reading.verdict}"
      </p>

      <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-mystic-900/60 hairline-gold-soft p-5">
        <p className="text-sm text-mystic-200 leading-relaxed whitespace-pre-line">
          {reading.body}
        </p>
      </div>

      {reading.lineNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gold/80 font-medium">
            {t('celestial.findPlace.reading.linesLabel', { defaultValue: 'Why this place' })}
          </p>
          {reading.lineNotes.map((note, i) => (
            <div key={`${note.planet}-${note.angle}-${i}`} className="flex items-start gap-2.5">
              <div
                className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                style={{ backgroundColor: PLANET_COLOR[note.planet as PlanetName] ?? '#d4af37' }}
              />
              <p className="text-xs text-mystic-300 leading-relaxed flex-1">
                <span className="text-mystic-100 font-medium">{note.planet} {note.angle}</span>
                {' — '}{note.note}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-gold/8 border border-gold/20 p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-gold/80 font-medium">
          {t('celestial.findPlace.reading.practiceLabel', { defaultValue: 'Your first month' })}
        </p>
        <p className="text-xs text-mystic-200 leading-relaxed">{reading.practice}</p>
      </div>

      <div className="rounded-2xl bg-mystic-900/40 p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-mystic-500 font-medium">
          {t('celestial.findPlace.reading.cautionsLabel', { defaultValue: 'Honestly' })}
        </p>
        <p className="text-xs text-mystic-300 leading-relaxed">{reading.cautionsNote}</p>
      </div>

      {reading.closingBlessing && (
        <p className="text-center text-base font-display italic text-gold/90 px-4 py-2 leading-relaxed">
          {reading.closingBlessing}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" size="md" onClick={onReroll} disabled={saving}>
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden />
          {t('celestial.findPlace.reading.rerollCta', { defaultValue: 'Try another' })}
        </Button>
        <Button
          variant={savedFlash ? 'secondary' : 'primary'}
          size="md"
          fullWidth
          disabled={saving || savedFlash}
          onClick={onSave}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              {t('celestial.findPlace.reading.saving', { defaultValue: 'Saving…' })}
            </>
          ) : savedFlash ? (
            <>
              <Bookmark className="w-4 h-4 mr-2 fill-current" aria-hidden />
              {t('celestial.findPlace.reading.saved', { defaultValue: 'Saved ✨' })}
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4 mr-2" aria-hidden />
              {t('celestial.findPlace.reading.saveCta', { defaultValue: 'Save this place' })}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
