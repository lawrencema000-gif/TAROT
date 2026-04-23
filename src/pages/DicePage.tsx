import { useState } from 'react';
import { Dice6, Sparkles } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { useT } from '../i18n/useT';
import { rollDice, type DiceReading } from '../data/diceOracle';

export function DicePage() {
  const { t } = useT('app');
  const [reading, setReading] = useState<DiceReading | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = async () => {
    setRolling(true);
    setReading(null);
    await new Promise((r) => setTimeout(r, 700));
    setReading(rollDice());
    setRolling(false);
  };

  const renderDie = (value: number, idx: number) => (
    <div
      key={idx}
      className="w-16 h-16 bg-mystic-800 border-2 border-gold/40 rounded-xl flex items-center justify-center text-3xl font-display text-gold shadow-inner-glow"
    >
      {value}
    </div>
  );

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <Dice6 className="w-6 h-6 text-gold" />
        <h1 className="font-display text-2xl text-mystic-100">
          {t('dice.title', { defaultValue: 'Dice Oracle' })}
        </h1>
      </div>

      <Card variant="glow" padding="lg">
        <p className="text-mystic-300 text-sm leading-relaxed">
          {t('dice.intro', {
            defaultValue:
              'The simplest divination — three dice fall, their sum speaks. Hold a question, then roll. Sixteen possible readings from 3 to 18.',
          })}
        </p>
      </Card>

      {reading && (
        <>
          <Card variant="glow" padding="lg" className="text-center">
            <div className="flex justify-center gap-3 mb-4">
              {reading.rolls.map((v, i) => renderDie(v, i))}
            </div>
            <p className="text-xs text-mystic-500 tracking-widest uppercase">
              {t('dice.sumLabel', { defaultValue: 'Sum' })} {reading.sum}
            </p>
            <h2 className="font-display text-2xl text-mystic-100 mt-2">{reading.title}</h2>
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
          : reading
            ? t('dice.rollAgain', { defaultValue: 'Roll again' })
            : t('dice.rollButton', { defaultValue: 'Roll the dice' })}
      </Button>
    </div>
  );
}

export default DicePage;
