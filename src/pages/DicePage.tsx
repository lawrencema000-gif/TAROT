import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dice6, Feather, Zap } from 'lucide-react';
import { Card, Button, Chip, Page, ReadingProse, Section, PageHeader } from '../components/ui';
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
    <div key={idx} className="w-16 h-16 bg-mystic-800 border-2 border-gold/40 rounded-xl flex items-center justify-center text-3xl font-display text-gold">
      {value}
    </div>
  );

  const astroDie = (glyph: string, label: string) => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-16 h-16 bg-mystic-800 border-2 border-gold/40 rounded-xl flex items-center justify-center text-3xl text-gold" style={{ fontFamily: 'serif' }}>
        {glyph}
      </div>
      <span className="text-meta uppercase tracking-wider text-mystic-400">{label}</span>
    </div>
  );

  return (
    <Page spacing="md">
      <PageHeader title={t('dice.title', { defaultValue: 'Dice Oracle' })} icon={<Dice6 className="w-6 h-6 text-gold" />} />
      <Section
        spacing="lg"
        contentClassName="space-y-6"
      >
        {/* mode toggle */}
        <div className="flex gap-1.5">
          <Chip size="sm" selected={mode === 'astro'} onSelect={() => { setMode('astro'); setReading(null); }}>
            Astro dice
          </Chip>
          <Chip size="sm" selected={mode === 'classic'} onSelect={() => { setMode('classic'); setAstro(null); }}>
            Classic
          </Chip>
        </div>

        <Card variant="glow" padding="lg">
          <p className="reading-copy">
            {mode === 'astro'
              ? t('dice.astroIntro', { defaultValue: "The astrologer's dice — three fall at once: a planet for WHAT, a sign for HOW, a house for WHERE in your life. Hold a question, then roll." })
              : t('dice.intro', { defaultValue: 'The simplest divination — three dice fall, their sum speaks. Hold a question, then roll. Sixteen possible readings from 3 to 18.' })}
          </p>
        </Card>
      </Section>

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
          <Section contentClassName="space-y-3">
            {interp && (
              <>
                <div className="reading-copy">
                  <p className="reading-lede drop-cap">{interp.planetInSignText(astro.planet, astro.sign)}</p>
                  <p>{interp.planetInHouseText(astro.planet, astro.house)}</p>
                </div>
                {interp.houseMeaning(astro.house) && (
                  <p className="text-meta text-mystic-400">
                    House {astro.house} — {interp.houseMeaning(astro.house)!.title}: {interp.houseMeaning(astro.house)!.keywords.join(', ')}.
                  </p>
                )}
              </>
            )}
          </Section>
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
            <p className="text-meta text-mystic-400 tracking-widest uppercase">
              {t('dice.sumLabel', { defaultValue: 'Sum' })} {reading.sum}
            </p>
            <h2 className="heading-display-lg text-mystic-100 mt-2">{reading.title}</h2>
          </Card>
          <Section>
            <ReadingProse text={reading.reading} />
          </Section>
          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="heading-display-md text-mystic-100 mb-3 flex items-center gap-2">
              <Feather className="w-4 h-4 text-gold" />
              {t('dice.promptLabel', { defaultValue: 'Hold this question' })}
            </h3>
            <p className="reading-quote my-0">{reading.prompt}</p>
          </Card>
        </>
      )}

      <Button variant="primary" size="lg" fullWidth onClick={roll} disabled={rolling}>
        <Dice6 className="w-5 h-5 mr-2" />
        {rolling
          ? t('dice.rolling', { defaultValue: 'Rolling...' })
          : (reading || astro)
            ? t('dice.rollAgain', { defaultValue: 'Roll again' })
            : t('dice.rollButton', { defaultValue: 'Roll the dice' })}
      </Button>
    </Page>
  );
}

export default DicePage;
