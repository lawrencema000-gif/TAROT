import { Sparkles, Scroll } from 'lucide-react';
import { Card } from '../ui';
import { useT } from '../../i18n/useT';
import { getDailyQuote } from '../../data/dailyWisdom';

/**
 * Home-screen widget — a single daily wisdom quote that rotates by
 * day-of-year. Deterministic so the same quote shows all day.
 * No backend. Zero-cost content layer.
 */
export function DailyWisdomCard() {
  const { t } = useT('app');
  const quote = getDailyQuote();

  return (
    <Card padding="lg" className="bg-gradient-to-br from-cosmic-violet/5 via-mystic-900 to-mystic-900 border-cosmic-violet/20">
      <div className="flex items-center gap-2 mb-3">
        <Scroll className="w-4 h-4 text-cosmic-violet" />
        <h3 className="text-sm font-medium text-cosmic-violet tracking-wide">
          {t('wisdom.title', { defaultValue: 'Daily Wisdom' })}
        </h3>
      </div>

      <p className="text-mystic-200 leading-relaxed italic mb-3">
        "{t(`wisdom.quotes.${quote.id}.text`, { defaultValue: quote.text })}"
      </p>

      <p className="text-xs text-mystic-500 mb-4">
        — {quote.source}
      </p>

      <div className="pt-3 border-t border-mystic-800/50 flex items-start gap-2">
        <Sparkles className="w-3 h-3 text-gold mt-0.5 flex-shrink-0" />
        <p className="text-xs text-mystic-400 leading-relaxed italic">
          {t(`wisdom.quotes.${quote.id}.reflection`, { defaultValue: quote.reflection })}
        </p>
      </div>
    </Card>
  );
}
