import { Card, EyebrowLabel } from '../ui';
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
    <Card padding="md">
      <EyebrowLabel>{t('wisdom.title', { defaultValue: 'Daily Wisdom' })}</EyebrowLabel>

      <p className="font-display text-lede text-mystic-100 leading-relaxed mt-3">
        “{t(`wisdom.quotes.${quote.id}.text`, { defaultValue: quote.text })}”
      </p>
      <p className="text-meta text-mystic-400 mt-2">— {quote.source}</p>

      <p className="text-meta text-mystic-300 leading-relaxed mt-4 pt-4 border-t border-mystic-700">
        {t(`wisdom.quotes.${quote.id}.reflection`, { defaultValue: quote.reflection })}
      </p>
    </Card>
  );
}
