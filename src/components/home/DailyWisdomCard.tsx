import { Card, EyebrowLabel } from '../ui';
import { useT } from '../../i18n/useT';
import { useContentOverlay, ct } from '../../i18n/contentOverlay';
import { getDailyQuote } from '../../data/dailyWisdom';

/**
 * Home-screen widget — a single daily wisdom quote that rotates by
 * day-of-year. Deterministic so the same quote shows all day.
 * No backend. Zero-cost content layer.
 *
 * The quote, its source and the reflection come from the wisdom overlay
 * (content-wisdom.json, `quotes.<id>.*`), English where it has none yet.
 * They used to be t() calls under app:wisdom.quotes, keys no locale file
 * has, so every language read the English and logged a missing key.
 */
export function DailyWisdomCard() {
  const { t } = useT('app');
  const { overlay } = useContentOverlay('wisdom');
  const quote = getDailyQuote();
  const at = `quotes.${quote.id}`;

  return (
    <Card padding="md">
      <EyebrowLabel>{t('wisdom.title', { defaultValue: 'Daily Wisdom' })}</EyebrowLabel>

      <p className="font-display text-lede text-mystic-100 leading-relaxed mt-3">
        “{ct(overlay, `${at}.text`, quote.text)}”
      </p>
      <p className="text-meta text-mystic-400 mt-2">— {ct(overlay, `${at}.source`, quote.source)}</p>

      <p className="text-meta text-mystic-300 leading-relaxed mt-4 pt-4 border-t border-mystic-700">
        {ct(overlay, `${at}.reflection`, quote.reflection)}
      </p>
    </Card>
  );
}
