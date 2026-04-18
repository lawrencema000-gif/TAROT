import { useCallback } from 'react';
import { setLocale, getLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n/config';
import { useT } from '../../i18n/useT';

const FLAGS: Record<SupportedLocale, string> = {
  en: '🇺🇸',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
};

interface LanguagePickerProps {
  /** Called after the locale is changed. */
  onSelect?: (locale: SupportedLocale) => void;
  /** Compact layout for settings sheet vs. full-width for onboarding. */
  variant?: 'full' | 'compact';
}

/**
 * Language picker used in two places:
 *   1. Onboarding Step 0 (full variant) — first thing new visitors see.
 *   2. Settings sheet (compact variant) — lets existing users switch.
 *
 * On select: switches i18next language immediately, persists to
 * localStorage, and calls onSelect() so callers can additionally sync
 * to the authenticated user's profile row.
 */
export function LanguagePicker({ onSelect, variant = 'full' }: LanguagePickerProps) {
  const { t } = useT();
  const current = getLocale();

  const pick = useCallback(
    async (locale: SupportedLocale) => {
      await setLocale(locale);
      onSelect?.(locale);
    },
    [onSelect],
  );

  if (variant === 'compact') {
    return (
      <div className="lang-picker-compact" role="radiogroup" aria-label={t('labels.language')}>
        {SUPPORTED_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={current === code}
            onClick={() => pick(code)}
            className={`lang-picker-chip ${current === code ? 'is-active' : ''}`}
          >
            <span className="lang-picker-flag" aria-hidden>{FLAGS[code]}</span>
            <span>{t(`languages.${code}`)}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="lang-picker-full" role="radiogroup" aria-label={t('labels.language')}>
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={current === code}
          onClick={() => pick(code)}
          className={`lang-picker-row ${current === code ? 'is-active' : ''}`}
        >
          <span className="lang-picker-flag" aria-hidden>{FLAGS[code]}</span>
          <span className="lang-picker-name">{t(`languages.${code}`)}</span>
          {current === code && <span className="lang-picker-check" aria-hidden>✓</span>}
        </button>
      ))}
    </div>
  );
}
