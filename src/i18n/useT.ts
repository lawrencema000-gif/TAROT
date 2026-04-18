import { useTranslation } from 'react-i18next';

/**
 * Thin wrapper around react-i18next's useTranslation so every component
 * imports from one place. Pass a namespace to scope lookups:
 *
 *   const { t } = useT('onboarding');
 *   <h1>{t('welcome.title')}</h1>
 *
 * Namespace can also be an array to read from several at once:
 *   const { t } = useT(['common', 'premium']);
 */
export function useT(namespace?: string | string[]) {
  return useTranslation(namespace);
}
