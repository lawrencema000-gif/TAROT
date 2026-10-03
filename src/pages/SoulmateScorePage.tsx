import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Page, PageHeader, ResultLayout, Tag, toast, EyebrowLabel, EmptyState, Disclaimer } from '../components/ui';
import { PLANET_ICONS } from '../components/icons';
import type { Planet } from '../types/astrology';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { shareOrDownloadCard } from '../utils/shareCard';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { SoulmatePortrait } from '../components/soulmate/SoulmatePortrait';
import { AspectGlyph } from '../components/soulmate/AspectGlyph';

/**
 * Soulmate Score — Western-audience compatibility read.
 *
 * 1. Reads the signed-in user's natal chart (must be computed first).
 * 2. Computes partner's planet longitudes on demand via astrology-synastry.
 * 3. Weighs the cross-aspects into a 0-100 score using a classical
 *    harmony/friction formula — harmonious aspects on luminaries +
 *    Venus/Mars count most; squares/oppositions on Mars/Saturn/Pluto
 *    count against.
 * 4. Renders a big share-ready score card with the 4 strongest aspects.
 *
 * Gated like every AI-adjacent reading: one reveal costs the standard
 * Moonstone price (premium bypasses). The header must not say "Free"
 * above a cost line (R7).
 */

type AspectType = 'conjunction' | 'trine' | 'sextile' | 'square' | 'opposition';

interface CrossAspect {
  partnerPlanet: string;
  natalPlanet: string;
  type: AspectType;
  orb: number;
}

// Score weight per aspect kind. Harmonious = positive, challenging = negative.
const ASPECT_VALENCE: Record<AspectType, number> = {
  conjunction: 0.6, // context-dependent; mostly supportive
  trine: 1.0,
  sextile: 0.7,
  square: -0.8,
  opposition: -0.6,
};

// Planet weight — luminaries and personal planets dominate.
const PLANET_WEIGHT: Record<string, number> = {
  Sun: 3, Moon: 3, Venus: 2.5, Mars: 2,
  Mercury: 1.5, Jupiter: 1.2, Saturn: 1, Uranus: 0.6, Neptune: 0.6, Pluto: 0.6,
};

function scoreAspects(aspects: CrossAspect[]): {
  score: number;
  vibe: 'transcendent' | 'strong' | 'steady' | 'complex' | 'testing';
  harmonies: CrossAspect[];
  frictions: CrossAspect[];
} {
  let raw = 0;
  for (const a of aspects) {
    const v = ASPECT_VALENCE[a.type] ?? 0;
    const w = (PLANET_WEIGHT[a.partnerPlanet] ?? 1) * (PLANET_WEIGHT[a.natalPlanet] ?? 1);
    // Tighter orb = stronger contribution. 0.0 orb = full weight; 2.5 orb = half.
    const orbBonus = Math.max(0.4, 1 - a.orb / 4);
    raw += v * w * orbBonus;
  }

  // Normalize against the theoretical range of typical synastry (-25..+25).
  const normalized = Math.max(-25, Math.min(25, raw));
  const score = Math.round(50 + normalized * 2);
  const clamped = Math.max(0, Math.min(100, score));

  let vibe: 'transcendent' | 'strong' | 'steady' | 'complex' | 'testing';
  if (clamped >= 85) vibe = 'transcendent';
  else if (clamped >= 70) vibe = 'strong';
  else if (clamped >= 55) vibe = 'steady';
  else if (clamped >= 40) vibe = 'complex';
  else vibe = 'testing';

  const harmonies = aspects
    .filter((a) => ASPECT_VALENCE[a.type] > 0)
    .sort((a, b) => {
      const wa = (PLANET_WEIGHT[a.partnerPlanet] ?? 1) * (PLANET_WEIGHT[a.natalPlanet] ?? 1);
      const wb = (PLANET_WEIGHT[b.partnerPlanet] ?? 1) * (PLANET_WEIGHT[b.natalPlanet] ?? 1);
      return wb - wa || a.orb - b.orb;
    })
    .slice(0, 4);

  const frictions = aspects
    .filter((a) => ASPECT_VALENCE[a.type] < 0)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3);

  return { score: clamped, vibe, harmonies, frictions };
}

/** A planet name from the synastry payload, drawn — or nothing if unknown. */
function PlanetMark({ name }: { name: string }) {
  const Icon = PLANET_ICONS[name as Planet];
  if (!Icon) return null;
  return (
    <span className="inline-flex shrink-0 text-gold" aria-hidden>
      <Icon size={16} strokeWidth={1.6} />
    </span>
  );
}

/** One cross-aspect: partner planet — aspect — natal planet, with the glyphs drawn. */
function AspectRow({ aspect, tone, t }: { aspect: CrossAspect; tone: 'teal' | 'coral'; t: (k: string, o?: Record<string, unknown>) => string }) {
  const aspectName = t(`soulmate.aspects.${aspect.type}`, { defaultValue: aspect.type });
  return (
    <li className="flex items-center justify-between gap-3 text-ui">
      <span className="flex items-center gap-1.5 text-mystic-200 min-w-0">
        <PlanetMark name={aspect.partnerPlanet} />
        <span className="truncate">{aspect.partnerPlanet}</span>
        <AspectGlyph aspect={aspect.type} size={14} className={`shrink-0 ${tone === 'teal' ? 'text-teal' : 'text-coral'}`} />
        <span className="truncate">{aspect.natalPlanet}</span>
        <PlanetMark name={aspect.natalPlanet} />
      </span>
      <span className={`shrink-0 text-meta ${tone === 'teal' ? 'text-teal' : 'text-coral'}`}>{aspectName}</span>
    </li>
  );
}

/** The `error.code` a function answered with, read from the invoke error's
 *  Response (FunctionsHttpError keeps it on `context`). Null when unreadable. */
async function functionErrorCode(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).clone !== 'function') return null;
  try {
    const body = (await (ctx as Response).clone().json()) as { error?: { code?: unknown } | string; code?: unknown };
    const code = typeof body.error === 'object' && body.error ? body.error.code : body.code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

export function SoulmateScorePage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [partnerName, setPartnerName] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [partnerBirthTime, setPartnerBirthTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    vibe: string;
    harmonies: CrossAspect[];
    frictions: CrossAspect[];
    hasTime: boolean;
  } | null>(null);

  // Set when the synastry function says this account has no stored natal
  // chart and none could be cast from the profile (no birth place yet). The
  // page then points at the one screen that sets the chart up, instead of
  // "Check your connection" — which is what a new account saw (2026-10-03).
  const [needsChart, setNeedsChart] = useState(false);

  const hasBirthData = !!profile?.birthDate;

  const canSubmit = useMemo(() => {
    if (!partnerBirthDate) return false;
    const d = new Date(partnerBirthDate);
    return !Number.isNaN(d.getTime()) && d.getFullYear() > 1900;
  }, [partnerBirthDate]);

  const { tryConsume, refund, EarnSheet, error: gateError } = useMoonstoneSpend('soulmate-score');

  const handleCompute = async () => {
    if (!canSubmit) return;
    const ok = await tryConsume();
    if (!ok) return;
    setLoading(true);
    setNeedsChart(false);
    try {
      const synastry = () =>
        supabase.functions.invoke('astrology-synastry', {
          body: {
            partnerBirthDate,
            partnerBirthTime: partnerBirthTime || undefined,
            // Use the user's own timezone as a proxy for the partner's
            // timezone — same convention as PartnerCompatPage. Without
            // this the edge function treats the partner's birth time as
            // UTC, which drifts Moon ~5° (sometimes a sign over).
            partnerTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            partnerName: partnerName || undefined,
          },
        });
      let { data, error } = await synastry();
      // The comparison needs the user's stored natal chart, which is only
      // written once the chart has been cast. A member who has never opened
      // their chart gets it cast here from the profile, then one retry.
      if (error && (await functionErrorCode(error)) === 'NATAL_CHART_MISSING') {
        if (!profile?.birthDate || profile.birthLat == null || profile.birthLon == null) {
          setNeedsChart(true);
          return;
        }
        const timezone = profile.birthTz || profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const chartMode = profile.birthTime ? 'exact' : 'unknown';
        const cast = await supabase.functions.invoke('astrology-compute-natal', {
          body: {
            birthDate: profile.birthDate,
            birthTime: chartMode === 'unknown' ? null : profile.birthTime,
            lat: profile.birthLat,
            lon: profile.birthLon,
            timezone,
            chartMode,
          },
        });
        if (cast.error) {
          setNeedsChart(true);
          return;
        }
        ({ data, error } = await synastry());
      }
      if (error) {
        await refund();
        toast(
          t('soulmate.computeFailed', { defaultValue: "Couldn't compute. Check your connection and try again." }),
          'error',
        );
        return;
      }
      const payload = (data?.data ?? data) as {
        crossAspects?: CrossAspect[];
        hasTime?: boolean;
      } | null;
      const aspects = payload?.crossAspects ?? [];
      if (aspects.length === 0) {
        await refund();
        toast(
          t('soulmate.noAspects', { defaultValue: 'No significant aspects found. Try adding a birth time.' }),
          'error',
        );
        return;
      }
      const { score, vibe, harmonies, frictions } = scoreAspects(aspects);
      setResult({ score, vibe, harmonies, frictions, hasTime: !!payload?.hasTime });
    } catch (e) {
      await refund();
      console.error('[Soulmate] compute failed:', e);
      toast(
        t('soulmate.computeFailed', { defaultValue: "Couldn't compute. Check your connection and try again." }),
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const vibeLocalized = t(`soulmate.vibes.${result.vibe}`, { defaultValue: result.vibe }) as string;
    const vibeDescription = t(`soulmate.vibeDescriptions.${result.vibe}`, { defaultValue: '' }) as string;
    const shareText = t('soulmate.shareText', {
      defaultValue: 'Our Arcana soulmate score is {{score}}/100 ({{vibe}}). Try yours at arcana.app',
      score: result.score,
      vibe: vibeLocalized,
    }) as string;

    const outcome = await shareOrDownloadCard(
      {
        variant: 'soulmate',
        score: result.score,
        vibe: vibeLocalized,
        vibeDescription,
        partnerName: partnerName || undefined,
      },
      `arcana-soulmate-${result.score}.png`,
      shareText,
    );

    if (outcome === 'downloaded') {
      toast(t('common:actions.saved', { defaultValue: 'Saved' }), 'success');
    } else if (outcome === 'failed') {
      try {
        await navigator.clipboard?.writeText(shareText);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      } catch {
        toast(t('common:actions.shareFailed', { defaultValue: "Couldn't share. Try again." }), 'error');
      }
    }
  };

  const reset = () => setResult(null);

  // Gate: user needs a computed natal chart.
  if (!hasBirthData) {
    return (
      <Page spacing="md">
        <PageHeader
          icon={<Heart />}
          title={t('soulmate.title', { defaultValue: 'Soulmate Score' })}
        />
        <EmptyState
          as="h2"
          icon={<AlertCircle />}
          title={t('soulmate.needsBirthData', { defaultValue: 'Add your birth data first' })}
          description={t('soulmate.needsBirthDataBody', {
            defaultValue: 'We need your birth date (time is a bonus) to compare charts. Add it in Settings → Edit Profile.',
          })}
          action={
            <Button variant="gold" onClick={() => navigate('/profile')}>
              {t('soulmate.goToProfile', { defaultValue: 'Add my birth details' })}
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page spacing="md">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeader
          align="center"
          icon={<Heart />}
          title={t('soulmate.title', { defaultValue: 'Soulmate Score' })}
          subtitle={t('soulmate.subtitle', {
            defaultValue: 'A classical synastry read, distilled to one number you can share.',
          })}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card padding="lg">
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5">
                    <EyebrowLabel>{t('soulmate.partnerNameLabel', { defaultValue: "Partner's name" })}</EyebrowLabel>
                  </label>
                  <Input
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder={t('soulmate.partnerNamePlaceholder', { defaultValue: 'Optional' }) as string}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block mb-1.5">
                    <EyebrowLabel>{t('soulmate.birthDateLabel', { defaultValue: 'Birth date' })}</EyebrowLabel>
                  </label>
                  <Input
                    type="date"
                    value={partnerBirthDate}
                    onChange={(e) => setPartnerBirthDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1.5">
                    <EyebrowLabel>{t('soulmate.birthTimeLabel', { defaultValue: 'Birth time (optional — sharpens the score)' })}</EyebrowLabel>
                  </label>
                  <Input
                    type="time"
                    value={partnerBirthTime}
                    onChange={(e) => setPartnerBirthTime(e.target.value)}
                  />
                </div>
                <Button
                  variant="gold"
                  fullWidth
                  onClick={handleCompute}
                  disabled={!canSubmit || loading}
                  loading={loading}
                >
                  {!loading && <Heart className="w-4 h-4" aria-hidden />}
                  {loading
                    ? t('soulmate.computing', { defaultValue: 'Comparing your charts…' })
                    : t('soulmate.calculateCta', { defaultValue: 'Reveal the score' })}
                </Button>
                <MoonstoneCostLine className="justify-center" />
                {needsChart && (
                  <div className="rounded-control bg-mystic-800/50 p-4 space-y-3" role="alert">
                    <p className="text-ui text-mystic-200">
                      {t('soulmate.needsChart', {
                        defaultValue: 'The score compares your birth chart with theirs, and yours isn’t set up yet. Add your birth place to cast it — nothing was spent.',
                      })}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/horoscope')}>
                      {t('soulmate.setUpChart', { defaultValue: 'Set up my chart' })}
                    </Button>
                  </div>
                )}
                {gateError && (
                  <p className="text-meta text-coral text-center" role="alert">{gateError}</p>
                )}
                {EarnSheet}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <ResultLayout
              as="h2"
              eyebrow={
                partnerName
                  ? t('soulmate.scoreWithPartner', { defaultValue: '{{you}} & {{partner}}', you: profile?.displayName || 'You', partner: partnerName })
                  : t('soulmate.scoreNoName', { defaultValue: 'Your compatibility' })
              }
              verdict={
                // A number, so Inter with tabular figures — never the display serif.
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                  className="inline-block font-body font-semibold text-hero tabular-nums text-gold"
                >
                  {result.score}
                </motion.span>
              }
              subtitle={
                <>
                  <span className="block text-meta text-mystic-400">
                    {t('soulmate.outOf', { defaultValue: 'out of 100' })}
                  </span>
                  <span className="block mt-3">
                    <Tag tone="rose" size="md" icon={<Heart className="w-3.5 h-3.5" aria-hidden />}>
                      {t(`soulmate.vibes.${result.vibe}`, { defaultValue: result.vibe })}
                    </Tag>
                  </span>
                  {!result.hasTime && (
                    <span className="block text-meta text-mystic-400 mt-3 italic">
                      {t('soulmate.noTimeHint', { defaultValue: 'Add a birth time for a more precise score.' })}
                    </span>
                  )}
                </>
              }
              summary={t(`soulmate.vibeDescriptions.${result.vibe}`, {
                defaultValue: 'Your charts weave a distinct pattern together.',
              })}
              actions={
                <>
                  <Button variant="outline" onClick={reset} className="flex-1">
                    {t('soulmate.tryAnother', { defaultValue: 'Score another' })}
                  </Button>
                  <Button variant="gold" onClick={handleShare} className="flex-1">
                    <Share2 className="w-4 h-4" aria-hidden />
                    {t('soulmate.share', { defaultValue: 'Share score' })}
                  </Button>
                </>
              }
              defaultDetailOpen
              footer={<Disclaimer kind="astrology" />}
            >
              {result.harmonies.length > 0 && (
                <Card padding="lg">
                  <p className="font-display-eyebrow mb-3">
                    {t('soulmate.harmoniesHeading', { defaultValue: 'Where you flow together' })}
                  </p>
                  <ul className="space-y-2.5">
                    {result.harmonies.map((a, i) => (
                      <AspectRow key={i} aspect={a} tone="teal" t={t as (k: string, o?: Record<string, unknown>) => string} />
                    ))}
                  </ul>
                </Card>
              )}

              {result.frictions.length > 0 && (
                <Card padding="lg">
                  <p className="font-display-eyebrow mb-3">
                    {t('soulmate.frictionsHeading', { defaultValue: 'Where you stretch each other' })}
                  </p>
                  <ul className="space-y-2.5">
                    {result.frictions.map((a, i) => (
                      <AspectRow key={i} aspect={a} tone="coral" t={t as (k: string, o?: Record<string, unknown>) => string} />
                    ))}
                  </ul>
                </Card>
              )}

              <SoulmatePortrait />
            </ResultLayout>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

export default SoulmateScorePage;
