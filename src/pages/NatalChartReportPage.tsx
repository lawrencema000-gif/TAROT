import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Lock, Printer, Sparkles, CheckCircle2, AlertCircle, Circle, Triangle, Square, Minus } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { reportUnlocks, moonstones } from '../dal';
import { useNatalChart } from '../hooks/useAstrology';
import {
  SIGN_SYMBOLS,
  PLANET_SYMBOLS,
  HOUSE_THEMES,
  type AspectType,
  type NatalChart,
  type Planet,
  type ZodiacSign,
} from '../types/astrology';

/**
 * Natal Chart Deep Report — pay-per-report #3. $9.99 / 200 Moonstones.
 *
 * The roadmap ask was "server-rendered PDF + email." Pragmatic V1 delivers
 * the same value a cheaper way:
 *   - Rich, printable client page with @media print styles.
 *   - Users tap "Save as PDF" which triggers window.print() — any modern
 *     browser exports to PDF natively, no server round-trip or heavy JS lib.
 *   - If we later add a Stripe-paid "emailed PDF" flavor, the unlock table
 *     already supports it: same key 'natal-chart-pdf', different purchase
 *     row.
 */

const NATAL_COST = 200;
const NATAL_USD = 9.99;

const ASPECT_META: Record<AspectType, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  conjunction: { label: 'Conjunction',  color: 'text-gold',         icon: Circle },
  trine:       { label: 'Trine',        color: 'text-emerald-400',  icon: Triangle },
  sextile:     { label: 'Sextile',      color: 'text-cosmic-blue',  icon: Triangle },
  square:      { label: 'Square',       color: 'text-pink-400',     icon: Square },
  opposition:  { label: 'Opposition',   color: 'text-cosmic-violet',icon: Minus },
};

const PLANET_ONE_LINERS: Record<Planet, { sign: string; inSign: (s: ZodiacSign) => string }> = {
  Sun:     { sign: 'Ego, vitality, the thing you came here to become.',
             inSign: (s) => `You're here to express yourself through the lens of ${s}.` },
  Moon:    { sign: 'Emotional blueprint — what safety and home feel like.',
             inSign: (s) => `You regulate by way of ${s}'s instincts.` },
  Mercury: { sign: 'Mind, speech, the pattern of your thinking.',
             inSign: (s) => `Your mind runs in ${s}'s style — which shapes how you learn and persuade.` },
  Venus:   { sign: 'Love, aesthetic, how you attract and what pleases you.',
             inSign: (s) => `You love the ${s} way — it's the gravity field of your attractions.` },
  Mars:    { sign: 'Drive, anger, how you take action and pursue what you want.',
             inSign: (s) => `You fight and initiate in ${s}'s key.` },
  Jupiter: { sign: 'Expansion, faith, where life overflows if you let it.',
             inSign: (s) => `Your growth comes easily when it wears ${s}'s clothes.` },
  Saturn:  { sign: 'Structure, discipline, the long work of your life.',
             inSign: (s) => `Your discipline matures through ${s} lessons.` },
  Uranus:  { sign: 'Disruption, originality, where you break free of the given.',
             inSign: (s) => `Your revolution shows up in the ${s} theme of your generation.` },
  Neptune: { sign: 'Dissolution, dreams, where ego softens into meaning.',
             inSign: (s) => `Your imagination and spirituality take a ${s} shape.` },
  Pluto:   { sign: 'Transformation, power, what you are compelled to alchemize.',
             inSign: (s) => `You transform through ${s}'s territory.` },
};

export function NatalChartReportPage() {
  const { t } = useT('app');
  const { profile, user } = useAuth();
  const { chart, loading: chartLoading } = useNatalChart();
  const natal: NatalChart | null = chart?.natalChart ?? null;

  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const reference = profile?.birthDate ?? 'no-birth';
  const hasBirthData = !!profile?.birthDate;

  const checkUnlock = useCallback(async () => {
    if (!user || !hasBirthData) {
      setChecking(false);
      return;
    }
    setChecking(true);
    const [unlockRes, balanceRes] = await Promise.all([
      reportUnlocks.isUnlocked('natal-chart-pdf', reference),
      moonstones.getBalance(user.id),
    ]);
    if (unlockRes.ok) setUnlocked(unlockRes.data);
    if (balanceRes.ok) setBalance(balanceRes.data);
    setChecking(false);
  }, [user, hasBirthData, reference]);

  useEffect(() => { checkUnlock(); }, [checkUnlock]);

  const handleUnlock = async () => {
    setUnlocking(true);
    const res = await reportUnlocks.unlockWithMoonstones('natal-chart-pdf', reference, NATAL_COST);
    setUnlocking(false);
    if (res.ok) {
      setUnlocked(true);
      setBalance(res.data.newBalance);
      toast(t('natalReport.unlocked', { defaultValue: 'Chart unlocked' }), 'success');
    } else if (res.error === 'insufficient-balance') {
      toast(
        t('natalReport.insufficientBalance', {
          defaultValue: 'Not enough Moonstones — earn more via daily check-in or invites',
        }),
        'error',
      );
    } else {
      toast(t('natalReport.unlockFailed', { defaultValue: 'Could not unlock' }), 'error');
    }
  };

  const handlePrint = () => window.print();

  if (!hasBirthData) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('natalReport.title', { defaultValue: 'Full Natal Chart' })}
          </h1>
        </div>
        <Card padding="lg" variant="glow">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg text-mystic-100 mb-1">
                {t('natalReport.needsBirthData', { defaultValue: 'Add your birth data first' })}
              </h3>
              <p className="text-sm text-mystic-400 leading-relaxed">
                {t('natalReport.needsBirthDataBody', {
                  defaultValue:
                    'The full natal chart needs date, time, and place of birth. Add them in Profile → Edit profile.',
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (checking || chartLoading) {
    return (
      <div className="py-12 text-center text-mystic-500">
        {t('common:actions.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('natalReport.title', { defaultValue: 'Full Natal Chart' })}
          </h1>
        </div>

        <Card padding="lg" variant="glow" className="text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <h2 className="font-display text-xl text-mystic-100 mb-1">
            {t('natalReport.cardTitle', { defaultValue: 'Your complete birth chart — printable' })}
          </h2>
          <p className="text-sm text-mystic-400 italic mb-4">
            {t('natalReport.cardSub', {
              defaultValue: 'Every planet in its sign and house, every aspect, with interpretations.',
            })}
          </p>

          <ul className="text-xs text-mystic-400 text-left space-y-2 mb-5 max-w-[280px] mx-auto">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('natalReport.locked.feat1', { defaultValue: 'Big Three with deeper readings' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('natalReport.locked.feat2', { defaultValue: 'All 10 planets in signs + houses' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('natalReport.locked.feat3', { defaultValue: 'Aspect grid with exact orbs' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('natalReport.locked.feat4', { defaultValue: 'Save as PDF or print from your browser' })}
            </li>
          </ul>

          <Button
            variant="gold"
            fullWidth
            onClick={handleUnlock}
            disabled={unlocking || (balance !== null && balance < NATAL_COST)}
            className="min-h-[52px]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {unlocking
              ? t('natalReport.unlocking', { defaultValue: 'Unlocking…' })
              : t('natalReport.unlockCta', {
                  defaultValue: 'Unlock for {{n}} Moonstones',
                  n: NATAL_COST,
                })}
          </Button>

          {balance !== null && (
            <p className="text-[11px] text-mystic-500 mt-2">
              {t('natalReport.balance', { defaultValue: 'Balance: {{n}} Moonstones', n: balance })}
            </p>
          )}
          <p className="text-[10px] text-mystic-600 mt-1">
            {t('natalReport.priceNote', {
              defaultValue: 'Also available via Stripe at ${{price}} (coming soon)',
              price: NATAL_USD.toFixed(2),
            })}
          </p>
        </Card>
      </div>
    );
  }

  if (!natal) {
    return (
      <Card padding="lg">
        <p className="text-sm text-mystic-400">
          {t('natalReport.errorChartMissing', {
            defaultValue: 'We could not find your computed natal chart. Please re-enter your birth data in Profile.',
          })}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-6 natal-report">
      <style>{`
        @media print {
          nav, header, .no-print, button { display: none !important; }
          body, .natal-report { background: white !important; color: #111 !important; }
          .natal-report * { color: #111 !important; border-color: #ccc !important; background: transparent !important; }
          .natal-report h1, .natal-report h2, .natal-report h3 { color: #000 !important; }
          .natal-report .card-print { page-break-inside: avoid; border: 1px solid #ddd !important; padding: 12pt !important; margin-bottom: 8pt !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('natalReport.title', { defaultValue: 'Full Natal Chart' })}
          </h1>
        </div>
        <Button variant="outline" onClick={handlePrint} className="min-h-[40px]">
          <Printer className="w-4 h-4 mr-2" />
          {t('natalReport.printCta', { defaultValue: 'Save as PDF' })}
        </Button>
      </div>

      <Card padding="lg" variant="glow" className="card-print bg-gradient-to-br from-gold/5 via-mystic-900 to-mystic-900">
        <p className="text-[10px] uppercase tracking-widest text-gold mb-2">
          {t('natalReport.bigThreeHeading', { defaultValue: 'The Big Three' })}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-3xl mb-1">{SIGN_SYMBOLS[natal.bigThree.sun.sign]}</div>
            <p className="text-[10px] uppercase text-mystic-500">Sun</p>
            <p className="text-sm text-mystic-100 font-medium">{natal.bigThree.sun.sign}</p>
            {natal.bigThree.sun.house && (
              <p className="text-[10px] text-mystic-500 mt-0.5">House {natal.bigThree.sun.house}</p>
            )}
          </div>
          <div className="text-center">
            <div className="text-3xl mb-1">{SIGN_SYMBOLS[natal.bigThree.moon.sign]}</div>
            <p className="text-[10px] uppercase text-mystic-500">Moon</p>
            <p className="text-sm text-mystic-100 font-medium">{natal.bigThree.moon.sign}</p>
            {natal.bigThree.moon.house && (
              <p className="text-[10px] text-mystic-500 mt-0.5">House {natal.bigThree.moon.house}</p>
            )}
          </div>
          <div className="text-center">
            {natal.bigThree.rising ? (
              <>
                <div className="text-3xl mb-1">{SIGN_SYMBOLS[natal.bigThree.rising.sign]}</div>
                <p className="text-[10px] uppercase text-mystic-500">Rising</p>
                <p className="text-sm text-mystic-100 font-medium">{natal.bigThree.rising.sign}</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-1 text-mystic-600">—</div>
                <p className="text-[10px] uppercase text-mystic-500">Rising</p>
                <p className="text-[10px] text-mystic-500">needs birth time</p>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card padding="lg" className="card-print">
        <h2 className="text-sm font-medium text-gold tracking-wide mb-3">
          {t('natalReport.planetsHeading', { defaultValue: 'Planets in signs and houses' })}
        </h2>
        <div className="space-y-3">
          {natal.planets.map((p) => {
            const meta = PLANET_ONE_LINERS[p.planet];
            return (
              <div key={p.planet} className="border-b border-mystic-800/60 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{PLANET_SYMBOLS[p.planet]}</span>
                  <span className="text-sm font-medium text-mystic-100">
                    {p.planet} in {p.sign}
                  </span>
                  <span className="text-xs text-mystic-500">
                    {p.degree.toFixed(1)}°
                    {p.house ? ` · House ${p.house}` : ''}
                  </span>
                </div>
                {meta && (
                  <>
                    <p className="text-[11px] text-mystic-500 italic mb-1">{meta.sign}</p>
                    <p className="text-xs text-mystic-300 leading-relaxed">
                      {meta.inSign(p.sign)}
                    </p>
                  </>
                )}
                {p.house && HOUSE_THEMES[p.house - 1] && (
                  <p className="text-[11px] text-mystic-500 mt-1">
                    In your house of {HOUSE_THEMES[p.house - 1]}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding="lg" className="card-print">
        <h2 className="text-sm font-medium text-gold tracking-wide mb-3">
          {t('natalReport.elementsHeading', { defaultValue: 'Elemental & modal balance' })}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase text-mystic-500 mb-2">Elements</p>
            {(['Fire', 'Earth', 'Air', 'Water'] as const).map((el) => {
              const total = (Object.values(natal.dominants.elements) as number[]).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round(((natal.dominants.elements[el] ?? 0) / total) * 100);
              return (
                <div key={el} className="mb-1.5">
                  <div className="flex justify-between text-xs text-mystic-300">
                    <span>{el}</span><span>{pct}%</span>
                  </div>
                  <div className="h-1 bg-mystic-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gold/50" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <p className="text-[10px] uppercase text-mystic-500 mb-2">Modalities</p>
            {(['Cardinal', 'Fixed', 'Mutable'] as const).map((m) => {
              const total = (Object.values(natal.dominants.modalities) as number[]).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round(((natal.dominants.modalities[m] ?? 0) / total) * 100);
              return (
                <div key={m} className="mb-1.5">
                  <div className="flex justify-between text-xs text-mystic-300">
                    <span>{m}</span><span>{pct}%</span>
                  </div>
                  <div className="h-1 bg-mystic-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cosmic-violet/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {natal.dominants.dominantPlanets.length > 0 && (
          <p className="text-xs text-mystic-400 mt-4">
            <span className="text-mystic-500">Dominant planets: </span>
            {natal.dominants.dominantPlanets.join(', ')}
          </p>
        )}
        {natal.dominants.chartRuler && (
          <p className="text-xs text-mystic-400 mt-1">
            <span className="text-mystic-500">Chart ruler: </span>{natal.dominants.chartRuler}
          </p>
        )}
      </Card>

      <Card padding="lg" className="card-print">
        <h2 className="text-sm font-medium text-gold tracking-wide mb-3">
          {t('natalReport.aspectsHeading', { defaultValue: 'Aspects — the wiring between planets' })}
        </h2>
        {natal.aspects.length === 0 ? (
          <p className="text-xs text-mystic-500">No aspects computed.</p>
        ) : (
          <div className="space-y-1.5">
            {natal.aspects.map((a, i) => {
              const meta = ASPECT_META[a.type];
              const Icon = meta.icon;
              return (
                <div
                  key={`${a.planet1}-${a.planet2}-${a.type}-${i}`}
                  className="flex items-center justify-between py-1.5 border-b border-mystic-800/50 last:border-b-0"
                >
                  <div className="flex items-center gap-2 text-xs text-mystic-200">
                    <span>{PLANET_SYMBOLS[a.planet1]}</span>
                    <Icon className={`w-3 h-3 ${meta.color}`} />
                    <span>{PLANET_SYMBOLS[a.planet2]}</span>
                    <span className="text-mystic-400 ml-2">
                      {a.planet1} {meta.label.toLowerCase()} {a.planet2}
                    </span>
                  </div>
                  <div className="text-[10px] text-mystic-500">
                    orb {a.orb.toFixed(1)}°{a.applying ? ' · applying' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <p className="text-[10px] text-center text-mystic-600 italic">
        {t('natalReport.disclaimer', {
          defaultValue:
            'Astrology is a symbolic lens, not a prediction. Your chart is a map of your temperament — what you do with it is yours.',
        })}
      </p>
    </div>
  );
}

export default NatalChartReportPage;
