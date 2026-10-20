import { useCallback } from 'react';
import { Check } from 'lucide-react';
import { setLocale, getLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n/config';
import { useT } from '../../i18n/useT';

/**
 * The language's own code, set as a small tracked label. Flag emoji were
 * a nation standing in for a language, rendered by the platform font — and
 * on Windows they fall back to "US" / "JP" text anyway (R6 A18).
 */
export const LOCALE_CODES: Record<SupportedLocale, string> = {
  en: 'EN',
  ja: 'JA',
  ko: 'KO',
  zh: 'ZH',
};

interface LanguagePickerProps {
  /** Called after the locale is changed. */
  onSelect?: (locale: SupportedLocale) => void;
  /** Compact layout for settings sheet vs. full-width for onboarding. */
  variant?: 'full' | 'compact';
}

function CodeTile({ code, active }: { code: string; active: boolean }) {
  return (
    <span
      className={`inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-inset text-caption font-semibold tracking-[0.12em] ${
        active ? 'bg-gold/15 text-gold' : 'bg-mystic-800 text-mystic-300'
      }`}
      aria-hidden
    >
      {code}
    </span>
  );
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
            aria-label={`${t(`languages.${code}`)} (${LOCALE_CODES[code]})`}
            onClick={() => pick(code)}
            className={`lang-picker-chip ${current === code ? 'is-active' : ''}`}
          >
            <span className="text-caption font-semibold tracking-[0.12em]" aria-hidden>{LOCALE_CODES[code]}</span>
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
          aria-label={`${t(`languages.${code}`)} (${LOCALE_CODES[code]})`}
          onClick={() => pick(code)}
          className={`lang-picker-row ${current === code ? 'is-active' : ''}`}
        >
          <CodeTile code={LOCALE_CODES[code]} active={current === code} />
          <span className="lang-picker-name">{t(`languages.${code}`)}</span>
          {current === code && <Check className="w-5 h-5 text-gold shrink-0" aria-hidden />}
        </button>
      ))}
    </div>
  );
}
