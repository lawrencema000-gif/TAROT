import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Calendar, Clock } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { HD_TYPES } from '../data/humanDesign';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

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
 * The page renders:
 *   - Type card (Manifestor / Generator / MG / Projector / Reflector)
 *   - Strategy + Signature + Not-self theme
 *   - Authority with the concrete decision-making guidance
 *   - Profile (personality/design lines)
 *   - Interactive 9-centre bodygraph SVG
 *   - Defined channels list
 *   - All 13 Personality + 13 Design activations in a fold-out
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

  useEffect(() => {
    if (profile?.birthDate) setBirthDate(profile.birthDate);
    if (profile?.birthTime) setBirthTime(profile.birthTime);
  }, [profile]);

  const runCalc = async () => {
    if (!birthDate) {
      toast(t('humanDesign.needBirthDate', { defaultValue: 'Birth date is required' }), 'error');
      return;
    }
    setStage('loading');
    try {
      const { data, error } = await supabase.functions.invoke<HdChart>('human-design-chart', {
        body: {
          birthDate,
          birthTime: birthTime || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
      });
      if (error) throw error;
      if (!data) throw new Error('No chart returned');
      setChart(data);
      setStage('result');
    } catch (e) {
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
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('humanDesign.title', { defaultValue: 'Human Design' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('humanDesign.intro', {
              defaultValue:
                'Human Design maps the unique way you are built to engage with the world. Your Type, Strategy, Authority, and Profile show the path of least resistance — the way you are designed to make decisions, do work, and find alignment. This reading computes your real bodygraph from your birth moment using ephemeris data, not guesswork.',
            })}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {t('humanDesign.birthDate', { defaultValue: 'Birth date' })}
              </label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {t('humanDesign.birthTime', { defaultValue: 'Birth time (sharpens the reading — without it we default to noon)' })}
              </label>
              <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-mystic-600 mt-4 italic">
            {t('humanDesign.disclaimer', {
              defaultValue:
                'Your chart is computed server-side from planetary positions at your exact birth moment + the Design moment 88° of solar arc earlier. For the full 64-gate bodygraph with colour/tone, export to a dedicated HD platform.',
            })}
          </p>
        </Card>

        <Button
          variant="primary"
          fullWidth
          onClick={runCalc}
          disabled={stage === 'loading'}
          loading={stage === 'loading'}
          className="min-h-[56px]"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {stage === 'loading'
            ? t('humanDesign.computing', { defaultValue: 'Computing your bodygraph…' })
            : t('humanDesign.calculate', { defaultValue: 'Reveal my design' })}
        </Button>
      </div>
    );
  }

  if (stage === 'result' && chart) {
    const typeInfo = HD_TYPES[typeKey(chart.type)];
    const typeContent = typeInfo ?? {
      name: chart.type,
      summary: '',
      strengths: [],
      challenges: [],
      affirmation: '',
      tarotPairing: '',
      percentOfPopulation: '',
    };

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: chart.type,
          subtitle: `${t('humanDesign.profileLabel', { defaultValue: 'Profile' })} ${chart.profile}`,
          tagline: chart.strategy,
          affirmation: typeContent.affirmation || chart.signature,
          brand: 'Arcana · Human Design',
        });
        const out = await shareOrDownload(
          blob,
          `arcana-human-design-${typeKey(chart.type)}.png`,
          `My Human Design: ${chart.type} (${chart.profile}). Strategy: ${chart.strategy}.`,
        );
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <div className="space-y-4 pb-6">
        <button
          onClick={reset}
          className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('humanDesign.backToInput', { defaultValue: 'Recalculate' })}
        </button>

        {/* Hero — Type + Profile */}
        <Card variant="glow" padding="lg" className="text-center">
          {typeContent.percentOfPopulation && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-mystic-800/50 rounded-full mb-3">
              <span className="text-xs text-mystic-500">{typeContent.percentOfPopulation}</span>
            </div>
          )}
          <h2 className="font-display text-3xl text-mystic-100">{chart.type}</h2>
          <p className="text-gold/80 text-sm mt-2 italic">"{chart.strategy}"</p>
          <p className="text-xs text-mystic-500 mt-3">
            {t('humanDesign.profileLabel', { defaultValue: 'Profile' })}{' '}
            <span className="text-gold font-medium">{chart.profile}</span>
            {' · '}
            {t('humanDesign.authorityLabel', { defaultValue: 'Authority' })}{' '}
            <span className="text-cosmic-blue font-medium">{chart.authority}</span>
          </p>
        </Card>

        {typeContent.summary && (
          <Card padding="lg">
            <p className="text-mystic-300 text-sm leading-relaxed">{typeContent.summary}</p>
          </Card>
        )}

        {/* Signature / Not-self */}
        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="border-emerald-400/20">
            <p className="text-xs text-mystic-500 mb-1">
              {t('humanDesign.signatureLabel', { defaultValue: 'Signature' })}
            </p>
            <p className="text-lg text-emerald-400 font-display">{chart.signature}</p>
          </Card>
          <Card padding="md" className="border-pink-400/20">
            <p className="text-xs text-mystic-500 mb-1">
              {t('humanDesign.notSelfLabel', { defaultValue: 'Not-self theme' })}
            </p>
            <p className="text-lg text-pink-400 font-display">{chart.notSelfTheme}</p>
          </Card>
        </div>

        {/* Authority */}
        <Card padding="lg">
          <h3 className="font-medium text-cosmic-blue mb-2">
            {t('humanDesign.authorityHeading', { defaultValue: 'Your inner authority' })}: {chart.authority}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed">{chart.authorityExplanation}</p>
        </Card>

        {/* Bodygraph SVG */}
        <Card padding="lg">
          <h3 className="font-medium text-gold mb-3">
            {t('humanDesign.bodygraphLabel', { defaultValue: 'Your bodygraph' })}
          </h3>
          <Bodygraph
            definedCenters={chart.definedCenters}
            definedGates={chart.definedGates}
            channels={chart.channels}
          />
          <p className="text-xs text-mystic-500 mt-3 text-center">
            {chart.definedCenters.length}{' / 9 '}
            {t('humanDesign.centersDefined', { defaultValue: 'centres defined' })}
            {' · '}
            {chart.channels.length}{' '}
            {t('humanDesign.channelsDefined', { defaultValue: 'channels' })}
          </p>
        </Card>

        {/* Channels */}
        {chart.channels.length > 0 && (
          <Card padding="lg">
            <h3 className="font-medium text-cosmic-violet mb-3">
              {t('humanDesign.channelsHeading', { defaultValue: 'Your defined channels' })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {chart.channels.map((c) => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-full bg-cosmic-violet/10 border border-cosmic-violet/30 text-xs text-cosmic-violet font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="text-xs text-mystic-500 mt-3 leading-relaxed">
              {t('humanDesign.channelsNote', {
                defaultValue:
                  'Each channel connects two centres and defines a consistent life-force flow between them. These are fixed parts of who you are — always available to you.',
              })}
            </p>
          </Card>
        )}

        {/* Strengths / Challenges */}
        {(typeContent.strengths?.length > 0 || typeContent.challenges?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeContent.strengths?.length > 0 && (
              <Card padding="lg">
                <h3 className="font-medium text-emerald-400 mb-3">
                  {t('humanDesign.strengthsLabel', { defaultValue: 'Strengths' })}
                </h3>
                <ul className="space-y-2 text-mystic-300 text-sm">
                  {typeContent.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </Card>
            )}
            {typeContent.challenges?.length > 0 && (
              <Card padding="lg">
                <h3 className="font-medium text-pink-400 mb-3">
                  {t('humanDesign.challengesLabel', { defaultValue: 'Challenges' })}
                </h3>
                <ul className="space-y-2 text-mystic-300 text-sm">
                  {typeContent.challenges.map((c, i) => <li key={i}>• {c}</li>)}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* All activations — foldout */}
        <Card padding="md">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowActivations((v) => !v)}
          >
            <span className="text-sm font-medium text-mystic-200">
              {t('humanDesign.activationsLabel', { defaultValue: 'All 26 activations' })}
            </span>
            <span className="text-xs text-gold">{showActivations ? '−' : '+'}</span>
          </button>
          {showActivations && (
            <div className="mt-4 space-y-4">
              <ActivationList
                title={t('humanDesign.personalityLabel', { defaultValue: 'Personality (conscious) — at birth' })}
                activations={chart.personality}
                tint="text-gold"
              />
              <ActivationList
                title={t('humanDesign.designLabel', { defaultValue: 'Design (unconscious) — 88° of solar arc before birth' })}
                activations={chart.design}
                tint="text-cosmic-blue"
              />
            </div>
          )}
        </Card>

        {typeContent.affirmation && (
          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('humanDesign.affirmationLabel', { defaultValue: 'Your affirmation' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed mb-3">"{typeContent.affirmation}"</p>
            {typeContent.tarotPairing && (
              <p className="text-xs text-mystic-500">
                {t('humanDesign.tarotPairingLabel', { defaultValue: 'Tarot pairing' })}:{' '}
                <span className="text-gold/80">{typeContent.tarotPairing}</span>
              </p>
            )}
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('humanDesign.recalculate', { defaultValue: 'Recalculate' })}
          </Button>
        </div>
      </div>
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
  title, activations, tint,
}: { title: string; activations: Activation[]; tint: string }) {
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-widest mb-2 ${tint}`}>{title}</p>
      <div className="space-y-1">
        {activations.map((a) => (
          <div
            key={`${a.body}-${a.gate}-${a.line}`}
            className="flex items-center justify-between py-1 border-b border-mystic-800/40 last:border-b-0 text-xs"
          >
            <span className="text-mystic-300">{a.body}</span>
            <span className="text-mystic-200">
              {t0('Gate')} <span className="text-gold">{a.gate}</span>
              <span className="text-mystic-500 mx-1">·</span>
              {t0('Line')} <span className="text-gold">{a.line}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function t0(s: string) { return <span className="text-mystic-500">{s}</span>; }

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
  const positions: Record<Center, { x: number; y: number; label: string; color: string; path: string }> = {
    Head:        { x: 150, y: 30,  label: 'Head',         color: '#FFD54F', path: 'triangle-up' },
    Ajna:        { x: 150, y: 90,  label: 'Ajna',         color: '#81C784', path: 'triangle-down' },
    Throat:      { x: 150, y: 150, label: 'Throat',       color: '#A1887F', path: 'square' },
    G:           { x: 150, y: 210, label: 'G / Identity', color: '#F4D668', path: 'diamond' },
    Heart:       { x: 215, y: 225, label: 'Heart',        color: '#EF5350', path: 'triangle-down' },
    SolarPlexus: { x: 230, y: 310, label: 'Solar Plexus', color: '#FF8A65', path: 'triangle-up' },
    Sacral:      { x: 150, y: 285, label: 'Sacral',       color: '#F06292', path: 'square' },
    Spleen:      { x: 70,  y: 295, label: 'Spleen',       color: '#7E57C2', path: 'triangle-up' },
    Root:        { x: 150, y: 365, label: 'Root',         color: '#FFB74D', path: 'square' },
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
        const labelColor = defined ? '#0a0a10' : '#bdbdcc';
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
