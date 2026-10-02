import { useT } from '../../i18n/useT';
import { EyebrowLabel } from './Ornament';

export type DisclaimerKind = 'tarot' | 'astrology' | 'quiz' | 'ai' | 'cartomancy' | 'general';

/** English defaults; the locale files carry common:disclaimer.lead.<kind>. */
const LEAD: Record<DisclaimerKind, string> = {
  tarot: 'Tarot can’t answer everything.',
  astrology: 'Astrology is a lens, not a forecast.',
  quiz: 'A quiz is a mirror, not a verdict.',
  ai: 'This reading was written by a model.',
  cartomancy: 'The cards suggest; they don’t decide.',
  general: 'For reflection, not advice.',
};

const BODY =
  'Arcana’s readings are for reflection and entertainment. They are not medical, legal, financial or psychological advice.';

export interface DisclaimerProps {
  /** Which lead sentence. Pick the one that names what the screen just did. */
  kind?: DisclaimerKind;
  /**
   * Close a `<Paper tail />`: full-bleed (`-mx-4`), square top corners and
   * the sheet's bottom radius, so the dark block is the foot of the cream
   * sheet. Render it directly after the Paper, as its sibling.
   */
  tail?: boolean;
  className?: string;
}

/**
 * The designed disclaimer block — not a grey footnote.
 *
 * A dark (mystic-900) block with a tracked "Disclaimer" label, one bold
 * lead sentence in the product's voice and the standing two-sentence
 * body. It closes every reading result (ResultSheet renders it as the
 * tail), every quiz ResultLayout (`footer`), the horoscope views, the
 * report pages and the card meaning page before the email capture.
 *
 * Not for: forms, lists, Home, or anywhere nothing was read for meaning.
 * One per screen, at the end.
 */
export function Disclaimer({ kind = 'general', tail = false, className = '' }: DisclaimerProps) {
  const { t } = useT('common');
  const shape = tail ? '-mx-4 rounded-b-sheet' : 'rounded-card';
  return (
    <aside
      className={`bg-mystic-900 px-6 py-5 text-center ${shape} ${className}`.trim()}
      aria-label={t('disclaimer.label', { defaultValue: 'Disclaimer' })}
    >
      <EyebrowLabel tone="ink" className="text-mystic-400">
        {t('disclaimer.label', { defaultValue: 'Disclaimer' })}
      </EyebrowLabel>
      <p className="mt-2 text-ui font-semibold text-mystic-100">
        {t(`disclaimer.lead.${kind}`, { defaultValue: LEAD[kind] })}
      </p>
      <p className="mt-1.5 text-meta text-mystic-400">{t('disclaimer.body', { defaultValue: BODY })}</p>
    </aside>
  );
}
