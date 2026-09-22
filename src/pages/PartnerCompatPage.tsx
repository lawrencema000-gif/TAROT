import { useState, useEffect } from 'react';
import { Share2, Heart, Users } from 'lucide-react';
import { Card, Button, Input, Page, PageHeader, Progress, Tag, toast, ReadingProse } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  MBTI_TYPES,
  mbtiCompatScore,
  type MbtiType,
} from '../data/partnerCompat';
import { COMPOSITE_PAIRING_READINGS } from '../data/humanDesignCases';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';

/**
 * Partner Compatibility — real synastry under the hood.
 *
 * Rewrite 2026-04-25 — when both birth dates are given, we call the
 * new `partner-synastry-adhoc` edge function, which computes real
 * cross-aspects between the two charts (Sun ↔ Venus, Moon ↔ Mars
 * etc.) using astronomy-engine ephemeris data, scores each aspect
 * for flavour (harmonious / challenging / intense), derives an
 * overall score from the mix, and returns the 18 most meaningful
 * cross-aspects with specific per-aspect interpretations.
 *
 * MBTI is still surfaced as an additional layer (cognitive-function
 * fit) when both sides provided it, but it no longer drives the
 * score. The score is astrology-first, MBTI-supporting.
 */

type Stage = 'input' | 'loading' | 'result';

interface Position {
  planet: string;
  longitude: number;
  sign: string;
  degree: number;
}

interface CrossAspect {
  myPlanet: string;
  partnerPlanet: string;
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  flavour: 'harmonious' | 'challenging' | 'intense';
  orb: number;
  interpretation: string;
}

interface SynastryResult {
  me: Position[];
  partner: Position[];
  crossAspects: CrossAspect[];
  overallScore: number;
  harmoniousCount: number;
  challengingCount: number;
  intenseCount: number;
  elementalBlend: { fire: number; earth: number; air: number; water: number };
}

interface CompleteResult {
  synastry: SynastryResult | null;
  mbti: { score: number; myType: MbtiType; partnerType: MbtiType; note: string } | null;
  overallScore: number;
}

export function PartnerCompatPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('input');
  const [myMbti, setMyMbti] = useState<MbtiType | ''>('');
  const [partnerMbti, setPartnerMbti] = useState<MbtiType | ''>('');
  const [myBirth, setMyBirth] = useState('');
  const [myBirthTime, setMyBirthTime] = useState('');
  const [partnerBirth, setPartnerBirth] = useState('');
  const [partnerBirthTime, setPartnerBirthTime] = useState('');
  const [result, setResult] = useState<CompleteResult | null>(null);
  const { tryConsume, refund, EarnSheet } = useMoonstoneSpend('partner-compat');

  useEffect(() => {
    if (profile?.mbtiType && !myMbti) setMyMbti(profile.mbtiType as MbtiType);
    if (profile?.birthDate && !myBirth) setMyBirth(profile.birthDate);
    if (profile?.birthTime && !myBirthTime) setMyBirthTime(profile.birthTime);
  }, [profile, myMbti, myBirth, myBirthTime]);

  const run = async () => {
    const hasMine = !!myMbti || !!myBirth;
    const hasPartner = !!partnerMbti || !!partnerBirth;
    if (!hasMine || !hasPartner) {
      toast(t('compat.needBothSides', { defaultValue: 'Need at least one data point from each side (MBTI or birth date).' }), 'error');
      return;
    }

    const ok = await tryConsume();
    if (!ok) return;

    setStage('loading');

    let synastry: SynastryResult | null = null;
    let synastryFailed = false;
    if (myBirth && partnerBirth) {
      try {
        const { data, error } = await supabase.functions.invoke('partner-synastry-adhoc', {
          body: {
            myBirthDate: myBirth,
            myBirthTime: myBirthTime || undefined,
            myTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            partnerBirthDate: partnerBirth,
            partnerBirthTime: partnerBirthTime || undefined,
            partnerTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          },
        });
        if (error) throw error;
        // Unwrap { data, correlationId } envelope from shared handler.
        const payload = (data as { data?: SynastryResult })?.data ?? (data as SynastryResult);
        if (!payload?.crossAspects) throw new Error('no synastry data');
        synastry = payload;
      } catch (e) {
        synastryFailed = true;
        console.warn('[PartnerCompat] synastry failed, continuing without:', e);
      }
    }

    let mbti: CompleteResult['mbti'] = null;
    if (myMbti && partnerMbti) {
      const score = mbtiCompatScore(myMbti, partnerMbti);
      mbti = {
        score,
        myType: myMbti,
        partnerType: partnerMbti,
        note: buildMbtiNote(myMbti, partnerMbti),
      };
    }

    if (!synastry && !mbti) {
      // No usable result — refund the Moonstones we just debited so the
      // user isn't charged for a failed compatibility run.
      if (synastryFailed) await refund();
      toast(
        t('compat.failed', {
          defaultValue:
            'Compatibility needs at least both birth dates or both MBTI types. Please fill in matching fields for both sides.',
        }),
        'error',
      );
      setStage('input');
      return;
    }

    // Overall: synastry is primary (if present), MBTI adds a small tilt.
    let overallScore: number;
    if (synastry && mbti) {
      overallScore = Math.round(synastry.overallScore * 0.75 + mbti.score * 0.25);
    } else if (synastry) {
      overallScore = synastry.overallScore;
    } else {
      overallScore = mbti!.score;
    }

    setResult({ synastry, mbti, overallScore });
    setStage('result');
  };

  const reset = () => {
    setStage('input');
    setResult(null);
  };

  if (stage === 'input' || stage === 'loading') {
    return (
      <Page spacing="md">
        <PageHeader
          icon={<Users />}
          title={t('compat.title', { defaultValue: 'Partner Compatibility' })}
        />

        <Card variant="glow" padding="lg">
          <p className="text-ui text-mystic-300 mb-4">
            {t('compat.intro', {
              defaultValue:
                "For the fullest reading, enter both birth dates — we'll compute real cross-aspect synastry between your charts (Sun↔Venus, Moon↔Mars, and every other meaningful pair). MBTI is an optional supporting layer. At minimum, give us a matching data point from each side.",
            })}
          </p>

          <h3 className="font-display-eyebrow mb-3">
            {t('compat.yourSide', { defaultValue: 'You' })}
          </h3>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.yourBirth', { defaultValue: 'Your birth date' })}
              </label>
              <Input type="date" value={myBirth} onChange={(e) => setMyBirth(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.yourBirthTime', { defaultValue: 'Your birth time (sharpens the reading — includes the Moon)' })}
              </label>
              <Input type="time" value={myBirthTime} onChange={(e) => setMyBirthTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.yourMbti', { defaultValue: 'Your MBTI type (optional)' })}
              </label>
              <select
                value={myMbti}
                onChange={(e) => setMyMbti(e.target.value as MbtiType)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('compat.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                {MBTI_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 className="font-display-eyebrow mb-3">
            {t('compat.partnerSide', { defaultValue: 'Partner' })}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.partnerBirth', { defaultValue: "Partner's birth date" })}
              </label>
              <Input type="date" value={partnerBirth} onChange={(e) => setPartnerBirth(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.partnerBirthTime', { defaultValue: "Partner's birth time (optional)" })}
              </label>
              <Input type="time" value={partnerBirthTime} onChange={(e) => setPartnerBirthTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.partnerMbti', { defaultValue: "Partner's MBTI (optional)" })}
              </label>
              <select
                value={partnerMbti}
                onChange={(e) => setPartnerMbti(e.target.value as MbtiType)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('compat.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                {MBTI_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={run}
          disabled={stage === 'loading'}
          loading={stage === 'loading'}
        >
          <Heart className="w-5 h-5 mr-2" />
          {stage === 'loading'
            ? t('compat.computing', { defaultValue: 'Computing the aspects…' })
            : t('compat.runButton', { defaultValue: 'Reveal our compatibility' })}
        </Button>
        <MoonstoneCostLine />
        {EarnSheet}
      </Page>
    );
  }

  if (stage === 'result' && result) {
    const scoreColor = result.overallScore >= 80 ? 'text-emerald-400'
      : result.overallScore >= 60 ? 'text-gold'
      : 'text-pink-400';

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: `${result.overallScore}%`,
          subtitle: t('compat.compatibilityLabel', { defaultValue: 'Compatibility' }) as string,
          tagline: result.synastry
            ? `${result.synastry.harmoniousCount} harmonious · ${result.synastry.challengingCount} challenging · ${result.synastry.intenseCount} intense aspects`
            : `${myMbti || ''}${myMbti && partnerMbti ? ' × ' : ''}${partnerMbti || ''}`,
          affirmation: result.synastry?.crossAspects[0]?.interpretation ?? (result.mbti?.note || ''),
          brand: 'Arcana · Partner Compatibility',
        });
        const out = await shareOrDownload(blob, 'arcana-compatibility.png', `Our compatibility: ${result.overallScore}%`);
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <Page spacing="sm">
        <PageHeader
          icon={<Users />}
          title={t('compat.title', { defaultValue: 'Partner Compatibility' })}
          onBack={reset}
          backLabel={t('compat.back', { defaultValue: 'Check another pair' }) as string}
        />

        {/* Overall score hero */}
        <Card variant="glow" padding="lg" className="text-center">
          <p className="font-display-eyebrow mb-2">
            {t('compat.compatibilityLabel', { defaultValue: 'Compatibility' })}
          </p>
          <div className={`font-display text-7xl ${scoreColor} mb-3`}>{result.overallScore}%</div>
          <div className="flex justify-center items-center gap-3 text-meta text-mystic-400">
            {myMbti && <span>{myMbti}</span>}
            <Heart className="w-4 h-4 text-pink-400" />
            {partnerMbti && <span>{partnerMbti}</span>}
          </div>
        </Card>

        {/* Synastry summary — the real astro heart of the reading */}
        {result.synastry && (
          <Card padding="lg">
            <h3 className="heading-display-md text-mystic-100 mb-3">
              {t('compat.synastryLabel', { defaultValue: 'Astrology Synastry' })}
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center px-1 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                <p className="text-2xl font-display text-emerald-400">{result.synastry.harmoniousCount}</p>
                <p className="text-meta text-mystic-400 mt-1">
                  {t('compat.harmoniousLabel', { defaultValue: 'Harmonious' })}
                </p>
              </div>
              <div className="text-center px-1 py-2 rounded-xl bg-gold/10 border border-gold/20">
                <p className="text-2xl font-display text-gold">{result.synastry.intenseCount}</p>
                <p className="text-meta text-mystic-400 mt-1">
                  {t('compat.intenseLabel', { defaultValue: 'Intense' })}
                </p>
              </div>
              <div className="text-center px-1 py-2 rounded-xl bg-pink-500/10 border border-pink-400/20">
                <p className="text-2xl font-display text-pink-400">{result.synastry.challengingCount}</p>
                <p className="text-meta text-mystic-400 mt-1">
                  {t('compat.challengingLabel', { defaultValue: 'Challenging' })}
                </p>
              </div>
            </div>
            <p className="reading-copy">
              {t('compat.synastryExplainer', {
                defaultValue:
                  'Each aspect is a real geometric relationship between your planets and your partner\'s. Harmonious aspects flow easily; intense ones amplify; challenging ones ask for growth work.',
              })}
            </p>
          </Card>
        )}

        {/* Top cross-aspects */}
        {result.synastry?.crossAspects?.length ? (
          <div className="space-y-3">
            <h3 className="heading-display-md text-mystic-100 mt-2">
              {t('compat.topAspectsLabel', { defaultValue: 'Your most telling aspects' })}
            </h3>
            {result.synastry.crossAspects.slice(0, 8).map((a, i) => {
              const flavourTone =
                a.flavour === 'harmonious' ? 'teal'
                : a.flavour === 'challenging' ? 'rose'
                : 'gold';
              return (
                <Card key={i} padding="md">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-ui font-medium text-mystic-200">
                      {t('compat.myPlanet', { defaultValue: 'Your' })} {a.myPlanet}
                    </span>
                    <Tag tone={flavourTone} className="capitalize">
                      {a.type}
                    </Tag>
                    <span className="text-ui font-medium text-mystic-200">
                      {t('compat.partnerPlanet', { defaultValue: "Partner's" })} {a.partnerPlanet}
                    </span>
                    <span className="text-meta text-mystic-400 ml-auto">orb {a.orb.toFixed(1)}°</span>
                  </div>
                  <ReadingProse text={a.interpretation} lede={false} />
                </Card>
              );
            })}
          </div>
        ) : null}

        {/* Elemental blend */}
        {result.synastry && (
          <Card padding="lg">
            <h3 className="heading-display-md text-mystic-100 mb-3">
              {t('compat.elementalLabel', { defaultValue: 'Elemental blend' })}
            </h3>
            <div className="space-y-2">
              {(['fire', 'earth', 'air', 'water'] as const).map((el) => {
                const pct = result.synastry!.elementalBlend[el];
                const tone = el === 'fire' ? 'coral' : el === 'earth' ? 'teal' : el === 'air' ? 'blue' : 'violet';
                return (
                  <div key={el} className="flex items-center gap-3">
                    <span className="text-meta capitalize text-mystic-400 w-14">{el}</span>
                    <Progress value={pct} size="md" tone={tone} label={el} className="flex-1" />
                    <span className="text-meta text-mystic-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Composite chart insights — derived from the cross-aspects.
            Surfaces "you as a unit" readings on top of the per-aspect
            synastry. */}
        {result.synastry && result.synastry.crossAspects.length > 0 && (() => {
          const insights = computeCompositeInsights(result.synastry);
          if (insights.length === 0) return null;
          return (
            <Card padding="lg" className="border-pink-400/20">
              <h3 className="heading-display-md text-mystic-100 mb-3">
                {t('compat.compositeLabel', { defaultValue: 'Your relationship as a third entity' })}
              </h3>
              <p className="reading-copy mb-3">
                {t('compat.compositeIntro', {
                  defaultValue:
                    'A composite chart treats the relationship itself as something with its own character — separate from either of you alone. These observations describe the partnership entity.',
                })}
              </p>
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div key={i}>
                    <p className="text-ui text-pink-400 font-medium mb-0.5">{ins.pairing}</p>
                    <ReadingProse text={ins.reading} lede={false} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* MBTI layer — only when both provided */}
        {result.mbti && (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="heading-display-md text-mystic-100">
                {t('compat.mbtiLabel', { defaultValue: 'MBTI Fit' })}
              </h3>
              <span className="text-lg font-display text-gold">{result.mbti.score}%</span>
            </div>
            <ReadingProse text={result.mbti.note} lede={false} />
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset}>
            {t('compat.another', { defaultValue: 'Check another' })}
          </Button>
        </div>
      </Page>
    );
  }

  return null;
}

/**
 * Derive composite-chart-style observations from the cross-aspect data.
 * Looks for the named planet pairings in the lookup table and surfaces
 * the matched ones. Returns up to 5 most-impactful insights.
 */
function computeCompositeInsights(synastry: SynastryResult): { pairing: string; reading: string }[] {
  const insights: { pairing: string; reading: string }[] = [];
  const seen = new Set<string>();

  for (const a of synastry.crossAspects) {
    const pair = [a.myPlanet, a.partnerPlanet].sort().join('-');
    if (seen.has(pair)) continue;

    // Direct pairings
    if (COMPOSITE_PAIRING_READINGS[pair]) {
      insights.push({ pairing: pair.replace('-', ' ↔ '), reading: COMPOSITE_PAIRING_READINGS[pair] });
      seen.add(pair);
      continue;
    }

    // Saturn aspects (any conjunction with Saturn) — heavy commitment energy.
    if ((a.myPlanet === 'Saturn' || a.partnerPlanet === 'Saturn') && a.type === 'conjunction') {
      if (!seen.has('Saturn-strong')) {
        insights.push({ pairing: 'Saturn binding', reading: COMPOSITE_PAIRING_READINGS['Saturn-conjunct'] });
        seen.add('Saturn-strong');
      }
    }

    // Pluto contacts to personal planets — transformational.
    if ((a.myPlanet === 'Pluto' || a.partnerPlanet === 'Pluto') &&
        ['Sun', 'Moon', 'Venus'].includes(a.myPlanet === 'Pluto' ? a.partnerPlanet : a.myPlanet) &&
        a.type === 'conjunction') {
      if (!seen.has('Pluto-strong')) {
        insights.push({ pairing: 'Pluto contact', reading: COMPOSITE_PAIRING_READINGS['Pluto-strong'] });
        seen.add('Pluto-strong');
      }
    }

    if (insights.length >= 5) break;
  }
  return insights;
}

function buildMbtiNote(me: MbtiType, partner: MbtiType): string {
  const sameN = me[1] === partner[1];
  const sameTF = me[2] === partner[2];
  if (me === partner) {
    return `You share the same type (${me}). Deep understanding, natural resonance — watch for a shared blind spot neither of you catches.`;
  }
  if (sameN && !sameTF) {
    return `You perceive the world similarly (both ${me[1] === 'N' ? 'intuitive' : 'sensing'}) but decide differently (${me[2]} vs ${partner[2]}). One of the classic strong-pairing patterns.`;
  }
  if (!sameN) {
    return `You perceive very differently — one concrete (S), one abstract (N). High-potential pairing if you both stay curious about how the other sees the world.`;
  }
  return `You share both perception and judgment functions. Similar worldview — also similar blind spots.`;
}

export default PartnerCompatPage;
