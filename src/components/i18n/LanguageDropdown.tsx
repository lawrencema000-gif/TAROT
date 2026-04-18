import { useState, useEffect, useRef } from 'react';
import { Globe, Check } from 'lucide-react';
import { setLocale, getLocale, SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n/config';
import { useT } from '../../i18n/useT';

const FLAGS: Record<SupportedLocale, string> = {
  en: '🇺🇸',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
};

interface LanguageDropdownProps {
  /** Optional extra className on the trigger (e.g., to match nav styling). */
  triggerClassName?: string;
}

/**
 * Compact language switcher for the landing nav.
 *
 * Trigger: a small pill with a globe icon and the current locale code.
 * Click to open a dropdown listing the four supported locales.
 * Select one → locale changes immediately (via i18next + localStorage).
 *
 * Separate from the full LanguagePicker used in onboarding/settings,
 * because nav space is scarce and we want a dropdown rather than an
 * inline list here.
 */
export function LanguageDropdown({ triggerClassName = '' }: LanguageDropdownProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const current = getLocale();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const pick = async (locale: SupportedLocale) => {
    await setLocale(locale);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="lp-lang-dropdown">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('labels.language')}
        className={`lp-lang-trigger ${triggerClassName}`}
      >
        <Globe className="w-4 h-4" />
        <span className="lp-lang-code">{current.toUpperCase()}</span>
      </button>

      {open && (
        <ul role="listbox" className="lp-lang-menu">
          {SUPPORTED_LOCALES.map(code => (
            <li key={code} role="option" aria-selected={code === current}>
              <button
                type="button"
                onClick={() => pick(code)}
                className={`lp-lang-option ${code === current ? 'is-active' : ''}`}
              >
                <span className="lp-lang-flag" aria-hidden>{FLAGS[code]}</span>
                <span className="lp-lang-name">{t(`languages.${code}`)}</span>
                {code === current && <Check className="w-4 h-4 lp-lang-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
