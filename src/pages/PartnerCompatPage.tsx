import { useState, useEffect, useRef } from 'react';
import { Share2, Heart, Users, AlertCircle, RefreshCw } from 'lucide-react';
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
import { failedBeforeCharge } from '../components/reports/aiReading';
import { paidFailureOf, sendPaid, type PaidFailure } from '../components/oracle/paidRequest';
import { birthZoneOf } from '../components/horoscope/birthZone';

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
 *
 * Money (p8 R1): only the synastry costs Moonstones (the server charges 50
 * per request). An MBTI-only match is computed here, free, with no balance
 * gate and no price line. A press is guarded synchronously (a second tap
 * during the gate is ignored), the synastry request keeps its `requestId`
 * until it is answered — a retry of the same pair is the server's free
 * replay — and a failed synastry says what happened instead of quietly
 * showing an MBTI-only result for a reading that may have been charged.
 */

type Stage = 'input' | 'result';

/**
 * Why the last press brought no match. `spent`: the server answered this
 * request once and can no longer replay it, so pressing again is new and
 * charged. A short balance never lands here: the gate opens the Earn sheet.
 */
type CompatFailure = Exclude<PaidFailure, 'insufficient' | 'soft-cap'>;

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
  const { tryConsume, EarnSheet } = useMoonstoneSpend('partner-compat');
  /**
   * A press is being handled — from the moment it lands, through the
   * balance gate, until the request settles. Set synchronously, before
   * anything is awaited, so a second tap while the gate is answering is
   * ignored; the state disables the button for the same span (p8 R1).
   */
  const pressing = useRef(false);
  const [busy, setBusy] = useState(false);
  /** The server is still reading an earlier send of this same request. */
  const [stillReading, setStillReading] = useState(false);
  const [failure, setFailure] = useState<CompatFailure | null>(null);
  /**
   * The synastry request last sent and not answered: its id and exact body.
   * The same pair sent again is a retry of it — charged at most once,
   * answered with the same reading — so it skips the client gate; any
   * other pair is a new request.
   */
  const attempt = useRef<{ id: string; body: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Your side starts from the profile, once: a field you clear stays clear
  // (the old effect wrote the profile's value back the moment it was empty).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!profile || prefilled.current) return;
    prefilled.current = true;
    if (profile.mbtiType) setMyMbti((v) => v || (profile.mbtiType as MbtiType));
    if (profile.birthDate) setMyBirth((v) => v || profile.birthDate!);
    if (profile.birthTime) setMyBirthTime((v) => v || profile.birthTime!);
  }, [profile]);

  /** A field changed: the failure panel was about the request before it. */
  const edited = () => setFailure(null);

  /** Only the synastry is paid, and it needs both birth dates. */
  const paid = !!myBirth && !!partnerBirth;

  /** One press: the synastry (gated and charged) when both birth dates are in, the MBTI layer, the result. */
  const compute = async () => {
    let synastry: SynastryResult | null = null;
    if (paid) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      // The member's own birth is read in their birth place's zone (p8 F21);
      // a partner's birth place is not asked for, so theirs stays the device's.
      const myTimezone = profile && myBirth === profile.birthDate ? (await birthZoneOf(profile)).tz : timezone;
      const body = {
        myBirthDate: myBirth,
        myBirthTime: myBirthTime || undefined,
        myTimezone,
        partnerBirthDate: partnerBirth,
        partnerBirthTime: partnerBirthTime || undefined,
        partnerTimezone: timezone,
      };
      const signature = JSON.stringify(body);
      if (attempt.current?.body !== signature) {
        if (!(await tryConsume())) return;
        attempt.current = { id: crypto.randomUUID(), body: signature };
      }
      const requestId = attempt.current.id;
      setFailure(null);
      const res = await sendPaid(
        () => supabase.functions.invoke('partner-synastry-adhoc', { body: { ...body, requestId } }),
        { live: () => mounted.current, onStillReading: () => setStillReading(true) },
      );
      if (!res) return;
      setStillReading(false);
      // Unwrap { data, correlationId } envelope from shared handler.
      const data = res.error ? null : (res.data as { data?: SynastryResult } | SynastryResult | null);
      const payload = (data as { data?: SynastryResult } | null)?.data ?? (data as SynastryResult | null);
      if (!payload?.crossAspects) {
        const why = res.error ? await paidFailureOf(res.error) : 'generic';
        console.warn('[PartnerCompat] synastry failed:', why, res.error);
        if (why === 'insufficient' || why === 'soft-cap') {
          // Rejected before the debit: the gate opens the Earn sheet.
          attempt.current = null;
          if (await tryConsume()) setFailure('generic');
          return;
        }
        // Spent: this id can no longer be replayed, the next press is new.
        // Anything else keeps the request, so Try again is its free replay.
        if (why === 'spent') attempt.current = null;
        setFailure(why);
        return;
      }
      attempt.current = null;
      synastry = payload;
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

    if (!synastry && !mbti) return;

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

  const run = async () => {
    // Re-entrancy is decided synchronously, before the gate is awaited.
    if (pressing.current) return;
    // A matching pair: both birth dates (the synastry) or both MBTI types.
    // A birth date on one side and a type on the other used to pass, run
    // the gate, send nothing and say "check your connection".
    if (!paid && !(myMbti && partnerMbti)) {
      toast(
        t('compat.needBothSides', { defaultValue: 'Fill in the same for both of you: both birth dates, or both MBTI types.' }),
        'error',
      );
      return;
    }
    pressing.current = true;
    setBusy(true);
    try {
      await compute();
    } finally {
      pressing.current = false;
      if (mounted.current) {
        setBusy(false);
        setStillReading(false);
      }
    }
  };

  const reset = () => {
    setStage('input');
    setResult(null);
    setFailure(null);
  };

  if (stage === 'input') {
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
              <label className="text-caption text-mystic-500 mb-1 block">
                {t('compat.yourBirth', { defaultValue: 'Your birth date' })}
              </label>
              <Input type="date" value={myBirth} onChange={(e) => { setMyBirth(e.target.value); edited(); }} />
            </div>
            <div>
              <label className="text-caption text-mystic-500 mb-1 block">
                {t('compat.yourBirthTime', { defaultValue: 'Your birth time (sharpens the reading — includes the Moon)' })}
              </label>
              <Input type="time" value={myBirthTime} onChange={(e) => { setMyBirthTime(e.target.value); edited(); }} />
            </div>
            <div>
              <label className="text-caption text-mystic-500 mb-1 block">
                {t('compat.yourMbti', { defaultValue: 'Your MBTI type (optional)' })}
              </label>
              <select
                value={myMbti}
                onChange={(e) => { setMyMbti(e.target.value as MbtiType); edited(); }}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
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
              <label className="text-caption text-mystic-500 mb-1 block">
                {t('compat.partnerBirth', { defaultValue: "Partner's birth date" })}
              </label>
              <Input type="date" value={partnerBirth} onChange={(e) => { setPartnerBirth(e.target.value); edited(); }} />
            </div>
            <div>
              <label className="text-caption text-mystic-500 mb-1 block">
                {t('compat.partnerBirthTime', { defaultValue: "Partner's birth time (optional)" })}
              </label>
              <Input type="time" value={partnerBirthTime} onChange={(e) => { setPartnerBirthTime(e.target.value); edited(); }} />
            </div>
            <div>
              <label className="text-caption text-mystic-500 mb-1 block">
                {t('compat.partnerMbti', { defaultValue: "Partner's MBTI (optional)" })}
              </label>
              <select
                value={partnerMbti}
                onChange={(e) => { setPartnerMbti(e.target.value as MbtiType); edited(); }}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('compat.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                {MBTI_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {failure && (
          <div role="alert" className="flex items-start gap-3 rounded-card bg-mystic-850 border border-coral/30 p-4">
            <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-ui text-mystic-100">
                {failure === 'spent'
                  ? t('compat.errorSpent', { defaultValue: 'This match was already read once, and that reading can’t be shown again.' })
                  : failure === 'rate-limit'
                    ? t('compat.errorRateLimit', { defaultValue: 'Too many checks in a row — wait a moment and try again.' })
                    : t('compat.failed', { defaultValue: 'Couldn’t compute the match — check your connection and try again.' })}
              </p>
              {/* Only what is true for this failure: refused before the
                  debit cost nothing; a spent id cannot be replayed, so the
                  next press is new; any other may have been charged, and
                  then the retry (the same request) is free. */}
              <p className="text-meta text-mystic-400 mt-1">
                {failure === 'spent'
                  ? t('compat.errorSpentNew', { defaultValue: 'Reveal our compatibility starts a new reading, charged as usual.' })
                  : failedBeforeCharge(failure)
                    ? t('compat.errorNoCharge', { defaultValue: 'Nothing was charged for a match you did not receive.' })
                    : t('compat.errorRetryFree', {
                        defaultValue: 'If you were charged, Try again returns the same reading at no extra cost.',
                      })}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={run}
          disabled={busy}
          loading={busy}
        >
          {!busy && (failure && failure !== 'spent' ? (
            <RefreshCw className="w-5 h-5 mr-2" aria-hidden />
          ) : (
            <Heart className="w-5 h-5 mr-2" aria-hidden />
          ))}
          {busy
            ? stillReading
              ? t('compat.stillComputing', { defaultValue: 'Still computing the aspects…' })
              : t('compat.computing', { defaultValue: 'Computing the aspects…' })
            : failure && failure !== 'spent'
              ? t('compat.tryAgain', { defaultValue: 'Try again' })
              : t('compat.runButton', { defaultValue: 'Reveal our compatibility' })}
        </Button>
        {/* The price only where there is one: an MBTI-only match is free. */}
        {paid && <MoonstoneCostLine />}
        {EarnSheet}
      </Page>
    );
  }

  if (stage === 'result' && result) {
    const scoreColor = result.overallScore >= 80 ? 'text-teal'
      : result.overallScore >= 60 ? 'text-gold'
      : 'text-coral';

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: `${result.overallScore}%`,
          subtitle: t('compat.compatibilityLabel', { defaultValue: 'Compatibility' }) as string,
          tagline: result.synastry
            ? `${result.synastry.harmoniousCount} harmonious · ${result.synastry.challengingCount} challenging · ${result.synastry.intenseCount} intense aspects`
            : `${myMbti || ''}${myMbti && partnerMbti ? ' × ' : ''}${partnerMbti || ''}`,
          affirmation: result.synastry?.crossAspects[0]?.interpretation ?? (result.mbti?.note || ''),
          brand: t('share.brand.partnerCompat', { defaultValue: 'Partner compatibility' }) as string,
        });
        const out = await shareOrDownload(blob, 'arcana-compatibility.png', `Our compatibility: ${result.overallScore}%`);
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        else if (out === 'failed') toast(t('common:actions.shareFailed'), 'error');
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
            <Heart className="w-4 h-4 text-cosmic-rose" />
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
              <div className="text-center px-1 py-2 rounded-control bg-teal/10 border border-teal/25">
                <p className="text-2xl font-display text-teal">{result.synastry.harmoniousCount}</p>
                <p className="text-meta text-mystic-400 mt-1">
                  {t('compat.harmoniousLabel', { defaultValue: 'Harmonious' })}
                </p>
              </div>
              <div className="text-center px-1 py-2 rounded-control bg-gold/10 border border-gold/20">
                <p className="text-2xl font-display text-gold">{result.synastry.intenseCount}</p>
                <p className="text-meta text-mystic-400 mt-1">
                  {t('compat.intenseLabel', { defaultValue: 'Intense' })}
                </p>
              </div>
              <div className="text-center px-1 py-2 rounded-control bg-coral/10 border border-coral/25">
                <p className="text-2xl font-display text-coral">{result.synastry.challengingCount}</p>
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
            <Card padding="lg" className="border-cosmic-rose/25">
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
                    <p className="text-ui text-cosmic-rose font-medium mb-0.5">{ins.pairing}</p>
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
            {t('compat.share', { defaultValue: 'Share this match' })}
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
