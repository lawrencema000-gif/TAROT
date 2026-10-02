import { useState, useEffect } from 'react';
import { Calendar, Clock, Compass, Target, Share2, ArrowLeft } from 'lucide-react';
import {
  Card, Button, Input, toast, Page, PageHeader, Section, Disclosure, Tag,
  ResultSheet, AffirmationPanel, EyebrowLabel, SparkleFourPoint,
} from '../components/ui';
import { HoroscopeWheelIcon } from '../components/ui/NavIcons';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { HD_TYPES } from '../data/humanDesign';
import { TYPE_CASES, AUTHORITY_SCRIPTS, type Authority } from '../data/humanDesignCases';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';

/**
 * Human Design reading page.
 *
 * Rewritten 2026-04-25 — the client no longer hashes the birth date
 * into a fake result. It now calls the `human-design-chart` edge
 * function, which computes real Personality + Design activations via
 * ecliptic longitudes (astronomy-engine), maps them to the 64 I-Ching
 * gates on the HD Rave wheel, and derives the bodygraph: defined
 * centres, channels, Type, Authority, and Profile.
 *
 * The page renders the reading on paper (ResultSheet: type, strategy,
 * signature / not-self, authority, strengths, challenges, affirmation) and
 * the instrument on the canvas beneath it (bodygraph, channels, activations,
 * strategy-in-practice cases, the decision script). Type names come from
 * humanDesign.types.<type>.name, which every locale carries.
 */

type Stage = 'input' | 'loading' | 'result';

interface Activation {
  body: string;
  longitude: number;
  gate: number;
  line: number;
}

type Center =
  | 'Head' | 'Ajna' | 'Throat' | 'G' | 'Heart'
  | 'Sacral' | 'SolarPlexus' | 'Spleen' | 'Root';

interface HdChart {
  type: 'Manifestor' | 'Generator' | 'Manifesting Generator' | 'Projector' | 'Reflector';
  strategy: string;
  notSelfTheme: string;
  signature: string;
  authority: string;
  authorityExplanation: string;
  profile: string;
  profileLines: [number, number];
  definedCenters: Center[];
  openCenters: Center[];
  channels: string[];
  definedGates: number[];
  personality: Activation[];
  design: Activation[];
}

export function HumanDesignPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('input');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [chart, setChart] = useState<HdChart | null>(null);
  const [showActivations, setShowActivations] = useState(false);
  const { tryConsume, refund, EarnSheet, error: gateError } = useMoonstoneSpend('human-design');

  useEffect(() => {
    if (profile?.birthDate) setBirthDate(profile.birthDate);
    if (profile?.birthTime) setBirthTime(profile.birthTime);
  }, [profile]);

  const runCalc = async () => {
    if (!birthDate) {
      toast(t('humanDesign.needBirthDate', { defaultValue: 'Birth date is required' }), 'error');
      return;
    }
    const ok = await tryConsume();
    if (!ok) return;
    setStage('loading');
    try {
      const { data, error } = await supabase.functions.invoke('human-design-chart', {
        body: {
          birthDate,
          birthTime: birthTime || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
      });
      if (error) throw error;
      // Shared edge handler wraps responses as { data: result, correlationId } —
      // unwrap before consuming. Falls back to bare data for any function that
      // doesn't go through the wrapper.
      const payload = (data as { data?: HdChart })?.data ?? (data as HdChart);
      if (!payload?.type) throw new Error('No chart returned');
      setChart(payload);
      setStage('result');
    } catch (e) {
      await refund();
      console.error('[HumanDesign] chart calc failed:', e);
      toast(t('humanDesign.calcFailed', { defaultValue: 'Could not calculate chart. Check your connection and try again.' }), 'error');
      setStage('input');
    }
  };

  const reset = () => {
    setStage('input');
    setChart(null);
    setShowActivations(false);
  };

  if (stage === 'input' || stage === 'loading') {
    return (
      <Page spacing="md">
        <PageHeader
          icon={<HoroscopeWheelIcon />}
          title={t('humanDesign.title', { defaultValue: 'Human Design' })}
        />

        <Card variant="glow" padding="lg">
          <p className="reading-copy mb-4">
            {t('humanDesign.intro', {
              defaultValue:
                'Human Design maps the unique way you are built to engage with the world. Your Type, Strategy, Authority, and Profile show the path of least resistance — the way you are designed to make decisions, do work, and find alignment. This reading computes your real bodygraph from your birth moment using ephemeris data, not guesswork.',
            })}
          </p>

          <div className="space-y-3">
            <div>
              <label htmlFor="hd-birth-date" className="text-ui font-medium text-mystic-300 mb-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" aria-hidden />
                {t('humanDesign.birthDate', { defaultValue: 'Birth date' })}
              </label>
              <Input id="hd-birth-date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="hd-birth-time" className="text-ui font-medium text-mystic-300 mb-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" aria-hidden />
                {t('humanDesign.birthTime', { defaultValue: 'Birth time (sharpens the reading — without it we default to noon)' })}
              </label>
              <Input id="hd-birth-time" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </div>
          </div>

          <p className="text-caption text-mystic-500 mt-4 italic">
            {t('humanDesign.disclaimer', {
              defaultValue:
                'Your chart is computed server-side from planetary positions at your exact birth moment + the Design moment 88° of solar arc earlier. For the full 64-gate bodygraph with colour/tone, export to a dedicated HD platform.',
            })}
          </p>
        </Card>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={runCalc}
          disabled={stage === 'loading'}
          loading={stage === 'loading'}
        >
          {stage === 'loading'
            ? t('humanDesign.computing', { defaultValue: 'Computing your bodygraph…' })
            : t('humanDesign.calculate', { defaultValue: 'Reveal my design' })}
        </Button>
        <MoonstoneCostLine />
        {gateError && <p className="text-meta text-coral" role="alert">{gateError}</p>}
        {EarnSheet}
      </Page>
    );
  }

  if (stage === 'result' && chart) {
    const key = typeKey(chart.type);
    const typeInfo = HD_TYPES[key];
    const typeContent = typeInfo ?? {
      name: chart.type,
      summary: '',
      strengths: [],
      challenges: [],
      affirmation: '',
      tarotPairing: '',
      percentOfPopulation: '',
    };
    // The locale's name for the type (humanDesign.types.<key>.name exists in
    // en/ja/ko/zh); the edge function's English display string is the fallback.
    const typeName = t(`humanDesign.types.${key}.name`, { defaultValue: chart.type }) as string;
    const cases = TYPE_CASES[key] ?? [];
    const script = AUTHORITY_SCRIPTS[chart.authority as Authority];

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: typeName,
          subtitle: `${t('humanDesign.profileLabel', { defaultValue: 'Profile' })} ${chart.profile}`,
          tagline: chart.strategy,
          affirmation: typeContent.affirmation || chart.signature,
          brand: t('share.brand.humanDesign', { defaultValue: 'Human Design' }) as string,
        });
        const out = await shareOrDownload(
          blob,
          `arcana-human-design-${key}.png`,
          `My Human Design: ${typeName} (${chart.profile}). Strategy: ${chart.strategy}.`,
        );
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        else if (out === 'failed') toast(t('common:actions.shareFailed'), 'error');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <Page spacing="sm">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 min-h-[44px] text-ui text-mystic-400 hover:text-mystic-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t('humanDesign.backToInput', { defaultValue: 'Recalculate' })}
        </button>

        {/* The reading, on paper. */}
        <ResultSheet
          glyph={<HoroscopeWheelIcon />}
          eyebrow={
            typeContent.percentOfPopulation
              ? t('humanDesign.eyebrowWithShare', { defaultValue: 'Human Design · {{share}} of people', share: typeContent.percentOfPopulation }) as string
              : (t('humanDesign.title', { defaultValue: 'Human Design' }) as string)
          }
          title={typeName}
          summaryHeading={t('humanDesign.strategyLabel', { defaultValue: 'Your strategy' })}
          summary={chart.strategy}
          disclaimer="general"
        >
          <div className="space-y-7">
            <p className="reading-meta text-center">
              {t('humanDesign.profileLabel', { defaultValue: 'Profile' })}{' '}
              <span className="text-ink font-medium tabular-nums">{chart.profile}</span>
              {' · '}
              {t('humanDesign.authorityLabel', { defaultValue: 'Authority' })}{' '}
              <span className="text-ink font-medium">{chart.authority}</span>
            </p>

            {typeContent.summary && <p className="reading-copy">{typeContent.summary}</p>}

            {/* Signature / Not-self */}
            <div className="grid grid-cols-2 gap-4 border-t border-paper-hairline pt-6">
              <div>
                <EyebrowLabel tone="ink" align="left" className="block">
                  {t('humanDesign.signatureLabel', { defaultValue: 'Signature' })}
                </EyebrowLabel>
                <p className="font-display font-semibold text-title text-ink-teal mt-1">{chart.signature}</p>
              </div>
              <div>
                <EyebrowLabel tone="ink" align="left" className="block">
                  {t('humanDesign.notSelfLabel', { defaultValue: 'Not-self theme' })}
                </EyebrowLabel>
                <p className="font-display font-semibold text-title text-ink-coral mt-1">{chart.notSelfTheme}</p>
              </div>
            </div>

            {/* Authority */}
            <section>
              <h3 className="heading-display-md heading-strong text-ink mb-2">
                {t('humanDesign.authorityHeading', { defaultValue: 'Your inner authority' })}: {chart.authority}
              </h3>
              <p className="reading-copy">{chart.authorityExplanation}</p>
            </section>

            {/* Strengths / Challenges */}
            {(typeContent.strengths?.length > 0 || typeContent.challenges?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {typeContent.strengths?.length > 0 && (
                  <section>
                    <h3 className="heading-display-md heading-strong text-ink mb-2">
                      {t('humanDesign.strengthsLabel', { defaultValue: 'Strengths' })}
                    </h3>
                    <ul className="reading-copy list-disc pl-5 space-y-1.5">
                      {typeContent.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </section>
                )}
                {typeContent.challenges?.length > 0 && (
                  <section>
                    <h3 className="heading-display-md heading-strong text-ink mb-2">
                      {t('humanDesign.challengesLabel', { defaultValue: 'Challenges' })}
                    </h3>
                    <ul className="reading-copy list-disc pl-5 space-y-1.5">
                      {typeContent.challenges.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {typeContent.affirmation && (
              <div className="space-y-2">
                <AffirmationPanel text={typeContent.affirmation} />
                {typeContent.tarotPairing && (
                  <p className="reading-meta text-center">
                    {t('humanDesign.tarotPairingLabel', { defaultValue: 'Tarot pairing' })}:{' '}
                    <span className="text-ink">{typeContent.tarotPairing}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </ResultSheet>

        {/* The instrument: bodygraph, channels, activations. */}
        <Card padding="lg">
          <h3 className="heading-display-md text-mystic-100 mb-3">
            {t('humanDesign.bodygraphLabel', { defaultValue: 'Your bodygraph' })}
          </h3>
          <Bodygraph
            definedCenters={chart.definedCenters}
            definedGates={chart.definedGates}
            channels={chart.channels}
          />
          <p className="text-meta text-mystic-400 mt-3 text-center tabular-nums">
            {chart.definedCenters.length}{' / 9 '}
            {t('humanDesign.centersDefined', { defaultValue: 'centres defined' })}
            {' · '}
            {chart.channels.length}{' '}
            {t('humanDesign.channelsDefined', { defaultValue: 'channels' })}
          </p>
        </Card>

        {chart.channels.length > 0 && (
          <Section
            title={t('humanDesign.channelsHeading', { defaultValue: 'Your defined channels' })}
            headingLevel="h3"
          >
            <div className="flex flex-wrap gap-2">
              {chart.channels.map((c) => (
                <Tag key={c} tone="violet" size="md" className="tabular-nums">{c}</Tag>
              ))}
            </div>
            <p className="reading-copy mt-3">
              {t('humanDesign.channelsNote', {
                defaultValue:
                  'Each channel connects two centres and defines a consistent life-force flow between them. These are fixed parts of who you are — always available to you.',
              })}
            </p>
          </Section>
        )}

        <Disclosure
          label={t('humanDesign.activationsLabel', { defaultValue: 'All 26 activations' })}
          open={showActivations}
          onOpenChange={setShowActivations}
          lazy
          contentClassName="space-y-4"
        >
          <ActivationList
            title={t('humanDesign.personalityLabel', { defaultValue: 'Personality (conscious) — at birth' }) as string}
            activations={chart.personality}
            tint="text-gold"
            gateLabel={t('humanDesign.gateLabel', { defaultValue: 'Gate' }) as string}
            lineLabel={t('humanDesign.lineLabel', { defaultValue: 'Line' }) as string}
          />
          <ActivationList
            title={t('humanDesign.designLabel', { defaultValue: 'Design (unconscious) — 88° of solar arc before birth' }) as string}
            activations={chart.design}
            tint="text-cosmic-blue-ink"
            gateLabel={t('humanDesign.gateLabel', { defaultValue: 'Gate' }) as string}
            lineLabel={t('humanDesign.lineLabel', { defaultValue: 'Line' }) as string}
          />
        </Disclosure>

        {/* Strategy in practice — concrete scenarios per Type. */}
        {cases.length > 0 && (
          <Card padding="lg" className="border-teal/25">
            <h3 className="heading-display-md text-mystic-100 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-teal" aria-hidden />
              {t('humanDesign.casesHeading', { defaultValue: 'Strategy in practice' })}
            </h3>
            <p className="text-ui text-mystic-400 mb-4 italic">
              {t('humanDesign.casesIntro', {
                defaultValue:
                  'Concrete scenarios showing what your strategy looks like in real Tuesday-afternoon situations.',
              })}
            </p>
            <div className="space-y-4">
              {cases.map((c, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-ui font-medium text-mystic-100">
                    {t('humanDesign.scenarioLabel', { defaultValue: 'Scenario' })}
                  </p>
                  <p className="reading-copy">{c.scenario}</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-2.5 rounded-control bg-coral/10 border border-coral/15">
                      <p className="font-display-eyebrow text-coral mb-1">
                        {t('humanDesign.wrongMoveLabel', { defaultValue: 'The reactive move' })}
                      </p>
                      <p className="reading-copy">{c.wrongMove}</p>
                    </div>
                    <div className="p-2.5 rounded-control bg-teal/10 border border-teal/15">
                      <p className="font-display-eyebrow text-teal mb-1">
                        {t('humanDesign.alignedMoveLabel', { defaultValue: 'The aligned move' })}
                      </p>
                      <p className="reading-copy">{c.alignedMove}</p>
                    </div>
                  </div>
                  <p className="text-meta text-gold italic flex items-start gap-1.5">
                    <SparkleFourPoint size={10} className="mt-1 shrink-0" />
                    <span>{t('humanDesign.signatureFelt', { defaultValue: 'Signature felt' })}: {c.signature}</span>
                  </p>
                  {i < cases.length - 1 && (
                    <div className="h-px bg-mystic-800/50 mt-3" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Authority decision-making script. */}
        {script && (
          <Card padding="lg" className="border-cosmic-blue/30">
            <h3 className="heading-display-md text-mystic-100 mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-cosmic-blue-ink" aria-hidden />
              {t('humanDesign.decisionScriptHeading', {
                defaultValue: 'How to make decisions: {{authority}}',
                authority: script.authorityName,
              })}
            </h3>
            <ol className="reading-copy list-decimal list-inside space-y-2 mb-4">
              {script.decisionMakingScript.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <div className="p-3 rounded-control bg-coral/10 border border-coral/15 mb-2">
              <p className="font-display-eyebrow text-coral mb-1">
                {t('humanDesign.commonMistakeLabel', { defaultValue: 'Common mistake' })}
              </p>
              <p className="reading-copy">{script.commonMistake}</p>
            </div>
            <div className="p-3 rounded-control bg-teal/10 border border-teal/15">
              <p className="font-display-eyebrow text-teal mb-1">
                {t('humanDesign.realityCheckLabel', { defaultValue: 'Reality check' })}
              </p>
              <p className="reading-copy">{script.realityCheck}</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Share2 className="w-4 h-4" aria-hidden />
            {t('humanDesign.share', { defaultValue: 'Share my design' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset}>
            {t('humanDesign.recalculate', { defaultValue: 'Calculate another chart' })}
          </Button>
        </div>
      </Page>
    );
  }

  return null;
}

// Map the edge fn's display-cased type string back to the type-info
// lookup key used by the localised HD_TYPES dictionary.
function typeKey(display: string): keyof typeof HD_TYPES {
  switch (display) {
    case 'Manifestor': return 'manifestor';
    case 'Generator': return 'generator';
    case 'Manifesting Generator': return 'manifesting-generator';
    case 'Projector': return 'projector';
    case 'Reflector': return 'reflector';
    default: return 'generator';
  }
}

// ─── Activation list ─────────────────────────────────────────────
function ActivationList({
  title, activations, tint, gateLabel, lineLabel,
}: { title: string; activations: Activation[]; tint: string; gateLabel: string; lineLabel: string }) {
  return (
    <div>
      <p className={`font-display-eyebrow mb-2 ${tint}`}>{title}</p>
      <div className="space-y-1">
        {activations.map((a) => (
          <div
            key={`${a.body}-${a.gate}-${a.line}`}
            className="flex items-center justify-between py-1 border-b border-mystic-800/40 last:border-b-0 text-meta"
          >
            <span className="text-mystic-300">{a.body}</span>
            <span className="text-mystic-200 tabular-nums">
              <span className="text-mystic-500">{gateLabel}</span> <span className="text-gold">{a.gate}</span>
              <span className="text-mystic-500 mx-1">·</span>
              <span className="text-mystic-500">{lineLabel}</span> <span className="text-gold">{a.line}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bodygraph SVG ────────────────────────────────────────────────
// Simplified but recognisable 9-centre bodygraph. Defined centres
// fill with colour; open centres are outlined. Channels show as
// connecting lines between their centres.
function Bodygraph({
  definedCenters, channels,
}: { definedCenters: Center[]; definedGates: number[]; channels: string[] }) {
  // Centre positions — rough but correct geometry (Head top, Root bottom,
  // Throat-G-Sacral on the midline, Ajna sits between Head and Throat,
  // Heart sits right of G, Spleen sits left of Sacral, Solar Plexus
  // sits right of Sacral).
  // Fills are token values (tailwind.config.js): gold-light, teal, mystic-300,
  // gold, coral, coral-light, cosmic-rose, cosmic-violet, gold-dark.
  const positions: Record<Center, { x: number; y: number; label: string; color: string; path: string }> = {
    Head:        { x: 150, y: 30,  label: 'Head',         color: '#f4d668', path: 'triangle-up' },
    Ajna:        { x: 150, y: 90,  label: 'Ajna',         color: '#4ecdc4', path: 'triangle-down' },
    Throat:      { x: 150, y: 150, label: 'Throat',       color: '#c6c6d8', path: 'square' },
    G:           { x: 150, y: 210, label: 'G / Identity', color: '#d4af37', path: 'diamond' },
    Heart:       { x: 215, y: 225, label: 'Heart',        color: '#e07a5f', path: 'triangle-down' },
    SolarPlexus: { x: 230, y: 310, label: 'Solar Plexus', color: '#f4a390', path: 'triangle-up' },
    Sacral:      { x: 150, y: 285, label: 'Sacral',       color: '#d4848c', path: 'square' },
    Spleen:      { x: 70,  y: 295, label: 'Spleen',       color: '#8e6eb5', path: 'triangle-up' },
    Root:        { x: 150, y: 365, label: 'Root',         color: '#b8960f', path: 'square' },
  };

  const isDefined = (c: Center) => definedCenters.includes(c);

  // Channel endpoints — each channel connects two gates in two
  // different centres. We render a straight line between the two
  // centres. (The sophisticated view would route through the correct
  // gate anchor points; keeping it centre-to-centre for clarity.)
  const gateCenterMap: Record<number, Center> = {
    64: 'Head', 61: 'Head', 63: 'Head',
    47: 'Ajna', 24: 'Ajna', 4: 'Ajna', 17: 'Ajna', 43: 'Ajna', 11: 'Ajna',
    62: 'Throat', 23: 'Throat', 56: 'Throat', 16: 'Throat', 20: 'Throat',
    31: 'Throat', 8: 'Throat', 33: 'Throat', 35: 'Throat', 12: 'Throat',
    45: 'Throat',
    7: 'G', 1: 'G', 13: 'G', 25: 'G', 46: 'G', 2: 'G', 15: 'G', 10: 'G',
    21: 'Heart', 40: 'Heart', 26: 'Heart', 51: 'Heart',
    34: 'Sacral', 5: 'Sacral', 14: 'Sacral', 29: 'Sacral',
    59: 'Sacral', 9: 'Sacral', 3: 'Sacral', 42: 'Sacral', 27: 'Sacral',
    6: 'SolarPlexus', 37: 'SolarPlexus', 22: 'SolarPlexus',
    36: 'SolarPlexus', 30: 'SolarPlexus', 55: 'SolarPlexus', 49: 'SolarPlexus',
    50: 'Spleen', 32: 'Spleen', 28: 'Spleen', 18: 'Spleen',
    48: 'Spleen', 57: 'Spleen', 44: 'Spleen',
    53: 'Root', 60: 'Root', 52: 'Root', 19: 'Root',
    39: 'Root', 41: 'Root', 58: 'Root', 38: 'Root', 54: 'Root',
  };

  return (
    <svg viewBox="0 0 300 410" className="w-full max-w-xs mx-auto" aria-label="Human Design bodygraph">
      {/* Channel lines behind centres */}
      {channels.map((ch) => {
        const [a, b] = ch.split('-').map((n) => parseInt(n, 10));
        const ca = gateCenterMap[a];
        const cb = gateCenterMap[b];
        if (!ca || !cb || ca === cb) return null;
        const pa = positions[ca];
        const pb = positions[cb];
        return (
          <line
            key={ch}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke="#d4af37" strokeWidth={3} strokeOpacity={0.7}
            strokeLinecap="round"
          />
        );
      })}

      {/* Centres */}
      {(Object.entries(positions) as [Center, typeof positions[Center]][]).map(([center, pos]) => {
        const defined = isDefined(center);
        const fill = defined ? pos.color : 'transparent';
        const stroke = defined ? pos.color : 'rgba(255,255,255,0.25)';
        const labelColor = defined ? '#07070f' : '#c6c6d8';
        return (
          <g key={center}>
            <CenterShape
              path={pos.path}
              x={pos.x} y={pos.y}
              fill={fill}
              stroke={stroke}
              strokeWidth={defined ? 0 : 1.2}
            />
            <text
              x={pos.x} y={pos.y + 3}
              textAnchor="middle"
              fontSize={8}
              fontWeight={600}
              fill={labelColor}
              fontFamily="Inter, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {pos.label.split(' ')[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CenterShape({
  path, x, y, fill, stroke, strokeWidth,
}: { path: string; x: number; y: number; fill: string; stroke: string; strokeWidth: number }) {
  const size = 28;
  if (path === 'square') {
    return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx={4}
      fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (path === 'diamond') {
    const points = `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`;
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (path === 'triangle-up') {
    const points = `${x},${y - size} ${x + size},${y + size} ${x - size},${y + size}`;
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (path === 'triangle-down') {
    const points = `${x},${y + size} ${x + size},${y - size} ${x - size},${y - size}`;
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  return null;
}

export default HumanDesignPage;
