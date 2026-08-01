import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dice6, Sparkles, Zap } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { useT } from '../i18n/useT';
import { rollDice, type DiceReading } from '../data/diceOracle';
import { PLANET_GLYPH, SIGN_GLYPH } from '../lib/chart';

type Interp = typeof import('../data/interpretations');

const DICE_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const DICE_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

interface AstroRoll {
  planet: string;
  sign: string;
  house: number;
}

function rollAstro(): AstroRoll {
  const pick = (n: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  return {
    planet: DICE_PLANETS[pick(DICE_PLANETS.length)],
    sign: DICE_SIGNS[pick(DICE_SIGNS.length)],
    house: pick(12) + 1,
  };
}

/**
 * Dice Oracle — two modes:
 *   Classic: three d6, sum-based reading (the original).
 *   Astro:   the astrologer's dice — WHAT (planet), HOW (sign), WHERE
 *            (house). Interpretation composed live from the 240-entry
 *            planet-in-sign / planet-in-house libraries. Free, offline.
 */
export function DicePage() {
  const { t } = useT('app');
  const navigate = useNavigate();
  const [mode, setMode] = useState<'classic' | 'astro'>('astro');
  const [reading, setReading] = useState<DiceReading | null>(null);
  const [astro, setAstro] = useState<AstroRoll | null>(null);
  const [interp, setInterp] = useState<Interp | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = async () => {
    setRolling(true);
    setReading(null);
    setAstro(null);
    const [lib] = await Promise.all([
      mode === 'astro' && !interp ? import('../data/interpretations') : Promise.resolve(interp),
      new Promise((r) => setTimeout(r, 700)),
    ]);
    if (mode === 'astro') {
      if (lib) setInterp(lib as Interp);
      setAstro(rollAstro());
    } else {
      setReading(rollDice());
    }
    setRolling(false);
  };

  const renderDie = (value: number, idx: number) => (
    <div key={idx} className="w-16 h-16 bg-mystic-800 border-2 border-gold/40 rounded-xl flex items-center justify-center text-3xl font-display text-gold shadow-inner-glow">
      {value}
    </div>
  );

  const astroDie = (glyph: string, label: string) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-16 h-16 bg-mystic-800 border-2 border-gold/40 rounded-xl flex items-center justify-center text-3xl text-gold shadow-inner-glow" style={{ fontFamily: 'serif' }}>
        {glyph}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-mystic-500">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <Dice6 className="w-6 h-6 text-gold" />
        <h1 className="heading-display-lg text-mystic-100">
          {t('dice.title', { defaultValue: 'Dice Oracle' })}
        </h1>
      </div>

      {/* mode toggle */}
      <div className="flex gap-1.5">
        <button onClick={() => { setMode('astro'); setReading(null); }}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${mode === 'astro' ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-400'}`}>
          Astro dice
        </button>
        <button onClick={() => { setMode('classic'); setAstro(null); }}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${mode === 'classic' ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-400'}`}>
          Classic
        </button>
      </div>

      <Card variant="glow" padding="lg">
        <p className="text-mystic-300 text-sm leading-relaxed">
          {mode === 'astro'
            ? t('dice.astroIntro', { defaultValue: "The astrologer's dice — three fall at once: a planet for WHAT, a sign for HOW, a house for WHERE in your life. Hold a question, then roll." })
            : t('dice.intro', { defaultValue: 'The simplest divination — three dice fall, their sum speaks. Hold a question, then roll. Sixteen possible readings from 3 to 18.' })}
        </p>
      </Card>

      {/* astro result */}
      {mode === 'astro' && astro && (
        <>
          <Card variant="glow" padding="lg" className="text-center">
            <div className="flex justify-center gap-4 mb-3">
              {astroDie(PLANET_GLYPH[astro.planet] ?? '?', astro.planet)}
              {astroDie(SIGN_GLYPH[astro.sign] ?? '?', astro.sign)}
              {astroDie(String(astro.house), `House ${astro.house}`)}
            </div>
            <h2 className="heading-display-md text-mystic-100">{astro.planet} in {astro.sign}, House {astro.house}</h2>
          </Card>
          <Card padding="lg" className="space-y-3">
            {interp && (
              <>
                <p className="text-mystic-300 text-sm leading-relaxed">{interp.planetInSignText(astro.planet, astro.sign)}</p>
                <p className="text-mystic-400 text-sm leading-relaxed">{interp.planetInHouseText(astro.planet, astro.house)}</p>
                {interp.houseMeaning(astro.house) && (
                  <p className="text-[13px] text-mystic-500 leading-relaxed">
                    House {astro.house} — {interp.houseMeaning(astro.house)!.title}: {interp.houseMeaning(astro.house)!.keywords.join(', ')}.
                  </p>
                )}
              </>
            )}
          </Card>
          <Button variant="outline" fullWidth onClick={() => navigate('/quick-reading')}>
            <Zap className="w-4 h-4 mr-2" />
            {t('dice.askOracle', { defaultValue: 'Ask the Oracle about this' })}
          </Button>
        </>
      )}

      {/* classic result */}
      {mode === 'classic' && reading && (
        <>
          <Card variant="glow" padding="lg" className="text-center">
            <div className="flex justify-center gap-3 mb-4">
              {reading.rolls.map((v, i) => renderDie(v, i))}
            </div>
            <p className="text-xs text-mystic-500 tracking-widest uppercase">
              {t('dice.sumLabel', { defaultValue: 'Sum' })} {reading.sum}
            </p>
            <h2 className="heading-display-lg text-mystic-100 mt-2">{reading.title}</h2>
          </Card>
          <Card padding="lg">
            <p className="text-mystic-300 text-sm leading-relaxed">{reading.reading}</p>
          </Card>
          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('dice.promptLabel', { defaultValue: 'Hold this question' })}
            </h3>
            <p className="text-mystic-200 italic leading-relaxed">"{reading.prompt}"</p>
          </Card>
        </>
      )}

      <Button variant="primary" fullWidth onClick={roll} disabled={rolling} className="min-h-[56px]">
        <Dice6 className="w-5 h-5 mr-2" />
        {rolling
          ? t('dice.rolling', { defaultValue: 'Rolling...' })
          : (reading || astro)
            ? t('dice.rollAgain', { defaultValue: 'Roll again' })
            : t('dice.rollButton', { defaultValue: 'Roll the dice' })}
      </Button>
    </div>
  );
}

export default DicePage;
