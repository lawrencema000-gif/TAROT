import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Bookmark, Compass, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { Button, EyebrowLabel, ReadingProse, Sheet } from '../ui';
import { MoonstoneCostLine } from '../moonstones/MoonstoneCostLine';
import { useT } from '../../i18n/useT';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { scorePlaces, type PlaceScore, type LifeIntent } from '../../utils/celestialScoring';
import { ccToFlag } from '../../utils/celestialGeo';
import { generateCelestialReading, type CelestialReadingRequest, type CelestialReadingResponse } from '../../dal/celestialReading';
import { PLANETS, type PlanetName, type Angle } from '../../utils/astrocartography';
import { localizePlanetName } from '../../i18n/localizeNames';
import { localizeCountry } from './placeNames';

/** A planet the model named, in the reader's language when it is one of the ten (p8 F27). */
const planetLabel = (p: string) => ((PLANETS as readonly string[]).includes(p) ? localizePlanetName(p as PlanetName) : p);

/**
 * "Find Your Place" — the headline flagship feature.
 *
 * One tap → algorithm scores every city in the dataset against the
 * user's birth chart + chosen life-area intent → top city is revealed
 * with a cinematic animation + AI-generated long-form reading.
 *
 * Premium readers get the reveal on tap. Everyone else pays 250
 * Moonstones per reading (the parent's trySpend is the balance gate; the
 * server debits), and the price is on the card and beside "Show me a
 * different place" before the tap (p9 R04: the card said "Premium" and
 * charged 250 without a word).
 *
 * The reveal is a Sheet, so the bottom nav is hidden while it is up: as an
 * inline `fixed` layer inside <main>'s stacking context it sat under the
 * nav, and its last row ("Save this place", "Show me a different place",
 * "Try the reading again") was a nav tab (p9 R05).
 *
 * A reading paid for is kept for as long as the map is open, by the
 * request it answered, and shown again — running Find Your Place again, or
 * coming back to a city by re-rolling — instead of being bought again for
 * the same cached text (p9 R08).
 *
 * The component is purely the button + reveal sheet. The map's flyTo()
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
  /** `priced`: "Try the reading again" is a new, charged request (no id of this request is pending), so its price goes beside it. */
  | { kind: 'error'; result: PlaceScore | null; message: string; priced?: boolean };

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
  /** What the sheet shows: the last phase that was not idle, so it does not empty while it slides away. */
  const [view, setView] = useState<Phase>(phase);
  if (phase.kind !== 'idle' && view !== phase) setView(phase);
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

  /** The paid request for `target`. */
  const requestFor = (target: PlaceScore): CelestialReadingRequest => ({
    mode: 'best-place',
    city: {
      name: target.city.name,
      country: target.city.country,
      lat: target.city.lat,
      lon: target.city.lon,
    },
    intent,
    lines: target.contributingLines.map((c) => ({ planet: c.planet, angle: c.angle, distanceKm: c.distanceKm })),
    birth: { utc: birthUtc },
    userContext: { zodiacSign, mbtiType, locale },
  });

  /**
   * Readings bought here, by the request they answered (p9 R08). The
   * function takes the 250 before its 7-day cache, so the same request
   * bought again is the same text for another 250: a place read once is
   * shown again — free — when Find Your Place runs again or a re-roll comes
   * back to it.
   */
  const [kept, setKept] = useState<Record<string, CelestialReadingResponse>>({});
  const keptFor = (target: PlaceScore | undefined) => (target ? kept[JSON.stringify(requestFor(target))] ?? null : null);
  /**
   * The requestId of each request sent without a reading back, by its body
   * — not only the last one: coming back to a place whose reply was lost is
   * the server's free replay of it, never a second charge.
   */
  const pending = useRef(new Map<string, string>());
  /** A reading is between its first line and its last (set synchronously). */
  const busy = useRef(false);
  /** The same, for the buttons: disabled from the spend gate on. */
  const [working, setWorking] = useState(false);

  /**
   * Read `target`, paid at most once (p8 F20). Start, re-roll and retry all
   * come through here. `busy` is set before the spend gate is awaited, so a
   * second tap during its round trip returns at once (it used to send a
   * second 250-Moonstone request); the buttons are disabled from the gate
   * check on. The request carries a `requestId`, kept until a reading
   * lands: the server debits once per (requestId, body), so retrying the
   * same place gets the first run's reading back instead of a second
   * charge, and skips the gate (the first attempt may have left the balance
   * under the cost). A place already read is shown from `kept`, unsent.
   */
  async function readPlace(target: PlaceScore, opts: { computing?: boolean } = {}) {
    if (busy.current) return;
    const req = requestFor(target);
    const signature = JSON.stringify(req);
    const already = kept[signature];
    if (already) {
      onReveal(target.city);
      setPhase({ kind: 'done', result: target, reading: already });
      return;
    }
    busy.current = true;
    setWorking(true);
    const failed = (message: string = t('celestial.findPlace.error.body', { defaultValue: 'Check your connection and try again.' })) => setPhase({
      kind: 'error',
      result: target,
      message,
      // With this request's id still pending the retry is the server's free
      // replay; without one it is a new reading, charged (p9 R04, RQA-2).
      priced: !isPremium && !pending.current.has(signature),
    });
    try {
      let requestId = pending.current.get(signature);
      if (!requestId) {
        requestId = crypto.randomUUID();
        pending.current.set(signature, requestId);
        if (!isPremium && !(await trySpend())) {
          pending.current.delete(signature);
          return;
        }
      }
      if (opts.computing) {
        setPhase({ kind: 'computing' });
        // Brief computing animation to give the user something to look at
        // before the AI call returns. ~1.4s is long enough to feel like
        // "the cosmos is consulting" but short enough that the AI call
        // (typically 4-8s) hides behind the reveal step that follows.
        await new Promise((r) => setTimeout(r, 1400));
      }
      setPhase({ kind: 'reading', result: target });
      onReveal(target.city);
      const res = await generateCelestialReading({ ...req, requestId });
      if (res.ok) {
        pending.current.delete(signature);
        setKept((k) => ({ ...k, [signature]: res.data }));
        setPhase({ kind: 'done', result: target, reading: res.data });
      } else {
        // Answered once and no longer replayable (REQUEST_ALREADY_USED), or
        // refused before the debit (INSUFFICIENT_BALANCE): the next press is
        // a new request behind the gate — the Earn sheet when the balance is
        // short — never this id again (p9 RQA-2).
        const spent = res.error === 'REQUEST_ALREADY_USED';
        if (spent || res.error === 'INSUFFICIENT_BALANCE') pending.current.delete(signature);
        failed(spent
          ? t('celestial.findPlace.error.spent', {
              defaultValue: 'This reading was already given once and can’t be shown again. Trying again starts a new one, charged as usual.',
            })
          : undefined);
      }
    } catch {
      failed();
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  async function handleStart() {
    if (ranked.length === 0) {
      setPhase({ kind: 'error', result: null, message: t('celestial.findPlace.error.noPlace', { defaultValue: 'No strong place found for this intent — try a different life area.' }) });
      return;
    }
    await readPlace(ranked[0], { computing: true });
  }

  function handleClose() {
    setPhase({ kind: 'idle' });
  }

  /**
   * Re-roll: the next candidate from the ranked list after the place on
   * screen. Exhausted, it wraps to #1 (rare; only after 5+ re-rolls on a
   * chart with limited line coverage).
   */
  const rerollTarget = (() => {
    const used = phase.kind === 'done' || phase.kind === 'reading' || phase.kind === 'error'
      ? phase.result?.city
      : null;
    const usedIndex = used ? ranked.findIndex((r) => r.city.name === used.name && r.city.cc === used.cc) : -1;
    return ranked.length > 0 ? ranked[(usedIndex + 1) % ranked.length] : undefined;
  })();

  async function handleReroll() {
    if (!rerollTarget) return;
    await readPlace(rerollTarget);
  }

  /** "Try the reading again": the same place, the same request — not the next city, charged anew. */
  async function handleRetry() {
    if (phase.kind === 'error' && phase.result) await readPlace(phase.result);
    else await handleStart();
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
        disabled={working}
        aria-busy={working}
        className="group w-full p-5 rounded-card bg-gradient-to-br from-gold/25 via-gold/10 to-mystic-900/60 hairline-gold border border-gold/40 hover:border-gold/60 transition-all text-left relative overflow-hidden disabled:opacity-60 disabled:cursor-wait"
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
          <div className="flex-shrink-0 w-12 h-12 rounded-card bg-mystic-900/70 hairline-gold flex items-center justify-center">
            <Compass className="w-6 h-6 text-gold" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="heading-display-md text-mystic-100 leading-tight mb-1">
              {t('celestial.findPlace.cta.title', { defaultValue: 'Find your destined place' })}
            </h3>
            <p className="text-meta text-mystic-300">
              {t('celestial.findPlace.cta.body', {
                defaultValue:
                  'One tap. We read every city against your full birth chart and reveal the single best place for you — with the long-form why.',
              })}
            </p>
            {/* The price of the tap, before it (p9 R04) — not when the tap
                only shows a reading already paid for. */}
            {!isPremium && !keptFor(ranked[0]) && <MoonstoneCostLine cost={250} className="mt-2" />}
          </div>
          <Sparkles className="w-5 h-5 text-gold flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.button>

      {/* ── The reveal — a sheet, so the bottom nav is hidden while it is
          up and its last row is never under a nav tab (p9 R05). It closes
          only once the reading has landed or failed. ─────────────────── */}
      <Sheet
        open={phase.kind !== 'idle'}
        onClose={() => {
          if (phase.kind === 'done' || phase.kind === 'error') handleClose();
        }}
        variant="glow"
        label={t('celestial.findPlace.hero.eyebrow', { defaultValue: 'Your destined place' })}
      >
        <div className="relative space-y-6 pb-[env(safe-area-inset-bottom,0px)]">
          {/* Close button — only after the reading lands */}
          {(view.kind === 'done' || view.kind === 'error') && (
            <button
              onClick={handleClose}
              aria-label={t('common:actions.close', { defaultValue: 'Close' })}
              className="absolute -top-2 right-0 z-10 w-11 h-11 rounded-full bg-mystic-800/60 hairline-gold-soft hover:bg-mystic-800 text-mystic-200 hover:text-gold flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {view.kind === 'computing' && <ComputingState />}
          {view.kind === 'reading' && (
            <RevealHero result={view.result}>
              <ReadingLoading />
            </RevealHero>
          )}
          {view.kind === 'done' && (
            <RevealHero result={view.result}>
              <ReadingBody
                reading={view.reading}
                onReroll={handleReroll}
                onSave={handleSave}
                saving={saving}
                savedFlash={savedFlash}
                working={working}
                // The next place's price, when the re-roll is a new reading.
                rerollPriced={!isPremium && !keptFor(rerollTarget)}
              />
            </RevealHero>
          )}
          {view.kind === 'error' && (
            <div className="space-y-4">
              {view.result && <RevealHero result={view.result}>{null}</RevealHero>}
              <div className="flex items-start gap-2 rounded-control bg-coral/10 border border-coral/25 p-4">
                <AlertCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm text-coral-light font-medium mb-1">
                    {t('celestial.findPlace.error.title', { defaultValue: "We couldn't finish your reading" })}
                  </p>
                  <p className="text-meta text-coral-light/80 mb-3">
                    {view.message}
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleRetry} disabled={working}>
                    <RefreshCw className="w-3 h-3 mr-1.5" aria-hidden />
                    {t('celestial.findPlace.error.retry', { defaultValue: 'Try the reading again' })}
                  </Button>
                  {/* A retry that is a new reading names its price before the tap (p9 R04). */}
                  {view.priced && <MoonstoneCostLine cost={250} className="mt-2" />}
                </div>
              </div>
            </div>
          )}
        </div>
      </Sheet>
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
        <EyebrowLabel>
          {t('celestial.findPlace.hero.eyebrow', { defaultValue: 'Your destined place' })}
        </EyebrowLabel>
        <div className="text-6xl" aria-hidden>{ccToFlag(result.city.cc)}</div>
        <h2 className="text-3xl font-display text-mystic-100 leading-tight">
          {result.city.name}
        </h2>
        <p className="text-meta text-mystic-400">{localizeCountry(result.city.cc, result.city.country)}</p>
      </motion.div>

      {/* Contributing planets row — visual constellation */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-center gap-3 py-3 px-4 rounded-card bg-mystic-900/40 hairline-gold-soft"
      >
        {result.contributingLines.slice(0, 4).map((line) => (
          <div key={`${line.planet}-${line.angle}`} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-medium"
              style={{
                backgroundColor: `${PLANET_COLOR[line.planet]}30`,
                color: PLANET_COLOR[line.planet],
              }}
            >
              {line.angle}
            </div>
            <span className="text-meta uppercase tracking-wider text-mystic-400">
              {localizePlanetName(line.planet)}
            </span>
            <span className="text-meta text-mystic-400 tabular-nums">
              {t('celestial.city.km', { defaultValue: '{{km}} km', km: Math.round(line.distanceKm) })}
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
      <p className="text-meta text-mystic-400">
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
  working,
  rerollPriced,
}: {
  reading: CelestialReadingResponse;
  onReroll: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  savedFlash: boolean;
  /** A paid re-roll is already on its way: one tap, one charge. */
  working: boolean;
  /** "Show me a different place" is a new, charged reading: its price goes beside it (p9 R04). */
  rerollPriced: boolean;
}) {
  const { t } = useT('app');
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      <p className="reading-quote">
        {reading.verdict}
      </p>

      <div className="rounded-card bg-gradient-to-br from-gold/10 to-mystic-900/60 hairline-gold-soft p-5">
        <ReadingProse text={reading.body} />
      </div>

      {reading.lineNotes.length > 0 && (
        <div className="space-y-2">
          <p className="font-display-eyebrow text-gold/80">
            {t('celestial.findPlace.reading.linesLabel', { defaultValue: 'Why this place' })}
          </p>
          {reading.lineNotes.map((note, i) => (
            <div key={`${note.planet}-${note.angle}-${i}`} className="flex items-start gap-2.5">
              <div
                className="flex-shrink-0 w-2 h-2 rounded-full mt-2.5"
                style={{ backgroundColor: PLANET_COLOR[note.planet as PlanetName] ?? '#d4af37' }}
              />
              <p className="reading-copy flex-1">
                <span className="text-mystic-100 font-medium">{planetLabel(note.planet)} {note.angle}</span>
                {' — '}{note.note}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-card bg-gold/[0.08] border border-gold/20 p-4 space-y-1">
        <p className="font-display-eyebrow text-gold/80">
          {t('celestial.findPlace.reading.practiceLabel', { defaultValue: 'Your first month' })}
        </p>
        <p className="reading-copy">{reading.practice}</p>
      </div>

      <div className="rounded-card bg-mystic-900/40 p-4 space-y-1">
        <p className="font-display-eyebrow text-mystic-500">
          {t('celestial.findPlace.reading.cautionsLabel', { defaultValue: 'Honestly' })}
        </p>
        <p className="reading-copy">{reading.cautionsNote}</p>
      </div>

      {reading.closingBlessing && (
        <p className="text-lede font-display italic text-mystic-200 px-1 pt-2">
          {reading.closingBlessing}
        </p>
      )}

      <div className="space-y-2 pt-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="md" onClick={onReroll} disabled={saving || working}>
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden />
            {t('celestial.findPlace.reading.rerollCta', { defaultValue: 'Show me a different place' })}
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
                {t('celestial.findPlace.reading.saved', { defaultValue: 'Saved' })}
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" aria-hidden />
                {t('celestial.findPlace.reading.saveCta', { defaultValue: 'Save this place' })}
              </>
            )}
          </Button>
        </div>
        {/* Under the re-roll, which it prices; saving is free. */}
        {rerollPriced && <MoonstoneCostLine cost={250} />}
      </div>
    </motion.div>
  );
}
