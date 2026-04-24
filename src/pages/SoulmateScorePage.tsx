import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Share2, AlertCircle } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
 * Free feature, no paywall. Shareable result is the viral hook.
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

const PLANET_SYMBOL: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const ASPECT_SYMBOL: Record<AspectType, string> = {
  conjunction: '☌',
  trine: '△',
  sextile: '⚹',
  square: '□',
  opposition: '☍',
};

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

  const hasBirthData = !!profile?.birthDate;

  const canSubmit = useMemo(() => {
    if (!partnerBirthDate) return false;
    const d = new Date(partnerBirthDate);
    return !Number.isNaN(d.getTime()) && d.getFullYear() > 1900;
  }, [partnerBirthDate]);

  const handleCompute = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('astrology-synastry', {
        body: {
          partnerBirthDate,
          partnerBirthTime: partnerBirthTime || undefined,
          partnerName: partnerName || undefined,
        },
      });
      if (error) {
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
        toast(
          t('soulmate.noAspects', { defaultValue: 'No significant aspects found. Try adding a birth time.' }),
          'error',
        );
        return;
      }
      const { score, vibe, harmonies, frictions } = scoreAspects(aspects);
      setResult({ score, vibe, harmonies, frictions, hasTime: !!payload?.hasTime });
    } catch (e) {
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
    const shareText = t('soulmate.shareText', {
      defaultValue: 'Our Arcana soulmate score is {{score}}/100 ({{vibe}}). Try yours at arcana.app',
      score: result.score,
      vibe: t(`soulmate.vibes.${result.vibe}`, { defaultValue: result.vibe }),
    });
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Arcana Soulmate Score',
          text: shareText as string,
          url: `${window.location.origin}/soulmate-score`,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard?.writeText(shareText as string);
    toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
  };

  const reset = () => setResult(null);

  // Gate: user needs a computed natal chart.
  if (!hasBirthData) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-pink-400" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('soulmate.title', { defaultValue: 'Soulmate Score' })}
          </h1>
        </div>
        <Card padding="lg">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-mystic-800/60 border border-gold/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-gold" />
            </div>
            <h2 className="font-display text-lg text-mystic-100">
              {t('soulmate.needsBirthData', { defaultValue: 'Add your birth data first' })}
            </h2>
            <p className="text-sm text-mystic-400 max-w-md">
              {t('soulmate.needsBirthDataBody', {
                defaultValue: "We need your birth date (time is a bonus) to compare charts. Add it in Settings → Edit Profile.",
              })}
            </p>
            <Button variant="gold" onClick={() => navigate('/profile')} className="mt-2">
              {t('soulmate.goToProfile', { defaultValue: 'Go to Profile' })}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <header className="text-center space-y-1 pt-1">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Heart className="w-8 h-8 text-pink-400 mx-auto mb-2" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('soulmate.title', { defaultValue: 'Soulmate Score' })}
          </h1>
          <p className="text-sm text-mystic-400 max-w-md mx-auto mt-1">
            {t('soulmate.subtitle', {
              defaultValue: "A classical synastry read, distilled to one number. Free, shareable, fast.",
            })}
          </p>
        </motion.div>
      </header>

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
                  <label className="block text-[11px] uppercase tracking-widest text-mystic-400 mb-1.5">
                    {t('soulmate.partnerNameLabel', { defaultValue: "Partner's name" })}
                  </label>
                  <Input
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder={t('soulmate.partnerNamePlaceholder', { defaultValue: 'Optional' }) as string}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-mystic-400 mb-1.5">
                    {t('soulmate.birthDateLabel', { defaultValue: 'Birth date' })}
                  </label>
                  <Input
                    type="date"
                    value={partnerBirthDate}
                    onChange={(e) => setPartnerBirthDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-mystic-400 mb-1.5">
                    {t('soulmate.birthTimeLabel', { defaultValue: 'Birth time (optional — sharpens the score)' })}
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
                  className="min-h-[52px]"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('soulmate.calculateCta', { defaultValue: 'Reveal the score' })}
                </Button>
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
            className="space-y-5"
          >
            <Card variant="glow" padding="lg" className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-1">
                {partnerName
                  ? t('soulmate.scoreWithPartner', { defaultValue: '{{you}} & {{partner}}', you: profile?.displayName || 'You', partner: partnerName })
                  : t('soulmate.scoreNoName', { defaultValue: 'Your compatibility' })}
              </p>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="my-3"
              >
                <div className="font-display text-6xl text-gold drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                  {result.score}
                </div>
                <div className="text-xs text-mystic-500 mt-1">
                  {t('soulmate.outOf', { defaultValue: 'out of 100' })}
                </div>
              </motion.div>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-400/30">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-xs font-medium text-pink-300">
                  {t(`soulmate.vibes.${result.vibe}`, { defaultValue: result.vibe })}
                </span>
              </div>
              <p className="text-sm text-mystic-300 mt-4 leading-relaxed">
                {t(`soulmate.vibeDescriptions.${result.vibe}`, {
                  defaultValue: 'Your charts weave a distinct pattern together.',
                })}
              </p>
              {!result.hasTime && (
                <p className="text-[11px] text-mystic-500 mt-3 italic">
                  {t('soulmate.noTimeHint', { defaultValue: 'Add a birth time for a more precise score.' })}
                </p>
              )}
            </Card>

            {result.harmonies.length > 0 && (
              <Card padding="lg">
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-2">
                  {t('soulmate.harmoniesHeading', { defaultValue: 'Where you flow together' })}
                </p>
                <div className="space-y-2">
                  {result.harmonies.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-mystic-200">
                        {PLANET_SYMBOL[a.partnerPlanet] ?? ''} {a.partnerPlanet} {ASPECT_SYMBOL[a.type]} {a.natalPlanet} {PLANET_SYMBOL[a.natalPlanet] ?? ''}
                      </span>
                      <span className="text-[10px] text-emerald-400/70">{a.type}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {result.frictions.length > 0 && (
              <Card padding="lg">
                <p className="text-[10px] uppercase tracking-widest text-pink-400 mb-2">
                  {t('soulmate.frictionsHeading', { defaultValue: 'Where you stretch each other' })}
                </p>
                <div className="space-y-2">
                  {result.frictions.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-mystic-200">
                        {PLANET_SYMBOL[a.partnerPlanet] ?? ''} {a.partnerPlanet} {ASPECT_SYMBOL[a.type]} {a.natalPlanet} {PLANET_SYMBOL[a.natalPlanet] ?? ''}
                      </span>
                      <span className="text-[10px] text-pink-400/70">{a.type}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                {t('soulmate.tryAnother', { defaultValue: 'Try another' })}
              </Button>
              <Button variant="gold" onClick={handleShare} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                {t('soulmate.share', { defaultValue: 'Share score' })}
              </Button>
            </div>

            <p className="text-[11px] text-mystic-500 text-center italic">
              {t('soulmate.disclaimer', {
                defaultValue: "A score isn't a verdict — it's a mirror for conversation. Charts describe patterns, not fate.",
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SoulmateScorePage;
