import { ChevronRight, Heart, Briefcase, Sparkles } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { ZodiacSign } from '../../types';
import { zodiacData } from '../../utils/zodiac';

interface HoroscopeCardProps {
  sign: ZodiacSign;
  onRead: () => void;
}

export function HoroscopeCard({ sign, onRead }: HoroscopeCardProps) {
  const { t } = useT('app');
  const info = zodiacData[sign];

  return (
    <button
      onClick={onRead}
      className="w-full text-left bg-gradient-to-br from-mystic-800/80 to-mystic-900/80 backdrop-blur-sm rounded-2xl border border-mystic-700/50 p-5 transition-all hover:border-gold/30 active:scale-[0.98] group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center">
            <span className="text-2xl">{info.symbol}</span>
          </div>
          <div>
            <p className="text-xs text-mystic-500 uppercase tracking-wider">{t('home.ritualCards.todaysEnergy')}</p>
            <h3 className="font-display text-lg text-mystic-100">{info.name}</h3>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-mystic-800/50 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
          <ChevronRight className="w-4 h-4 text-mystic-400 group-hover:text-gold transition-colors" />
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-cosmic-rose" />
          <span className="text-mystic-400">{t('home.ritualCards.love')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-4 h-4 text-cosmic-blue" />
          <span className="text-mystic-400">{t('home.ritualCards.work')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-mystic-400">{t('home.ritualCards.mood')}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-mystic-700/50">
        <span className="text-sm text-gold font-medium flex items-center gap-1">
          {t('home.ritualCards.read')}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}
