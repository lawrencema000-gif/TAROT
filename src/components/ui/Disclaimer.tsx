import { useT } from '../../i18n/useT';
import { EyebrowLabel } from './Ornament';

export type DisclaimerKind = 'tarot' | 'astrology' | 'quiz' | 'ai' | 'cartomancy' | 'general' | 'wellbeing';

/** English defaults; the locale files carry common:disclaimer.lead.<kind>. */
const LEAD: Record<DisclaimerKind, string> = {
  tarot: 'Tarot can’t answer everything.',
  astrology: 'Astrology is a lens, not a forecast.',
  quiz: 'A quiz is a mirror, not a verdict.',
  ai: 'This reading was written by a model.',
  cartomancy: 'The cards suggest; they don’t decide.',
  general: 'For reflection, not advice.',
  wellbeing: 'A screen, not a diagnosis.',
};

const BODY =
  'Arcana’s readings are for reflection and entertainment. They are not medical, legal, financial or psychological advice.';

/**
 * Kinds whose screen the standing body would undercut. A wellbeing check
 * (low mood, anxiety, burnout) closes under crisis resources and "please
 * talk to someone"; calling it "entertainment" there unsays the screen
 * (R7 #107). common:disclaimer.bodies.<kind>.
 */
const KIND_BODY: Partial<Record<DisclaimerKind, string>> = {
  wellbeing:
    'These questions reflect how you have been feeling. They cannot diagnose anything. If you are struggling, or do not feel safe, please talk to someone you trust, a doctor or a mental-health professional.',
};

export interface DisclaimerProps {
  /** Which lead sentence. Pick the one that names what the screen just did. */
  kind?: DisclaimerKind;
  /**
   * Close a `<Paper tail />`: full-bleed (`-mx-4`), square top corners, the
   * sheet's bottom radius, and no top margin, so the dark block is the foot
   * of the cream sheet. Render it directly after the Paper, as its sibling.
   * The parent is nearly always a spaced stack (Page, ResultLayout), whose
   * `space-y-*` (0,3,0) used to push a 16–32px strip of canvas between the
   * two square edges (P7 #120/#162); `!mt-0` beats it.
   */
  tail?: boolean;
  /**
   * Translated copy that replaces the kind's lead sentence and the standing
   * body, for a screen the standard body would undercut (a wellbeing check
   * must not call itself "entertainment"). Keeps the block's recipe, so no
   * screen needs a twin of it.
   */
  lead?: string;
  body?: string;
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
export function Disclaimer({ kind = 'general', tail = false, lead, body, className = '' }: DisclaimerProps) {
  const { t } = useT('common');
  const shape = tail ? '-mx-4 !mt-0 rounded-b-sheet' : 'rounded-card';
  return (
    <aside
      className={`bg-mystic-900 px-6 py-5 text-center ${shape} ${className}`.trim()}
      aria-label={t('disclaimer.label', { defaultValue: 'Disclaimer' })}
    >
      <EyebrowLabel tone="ink" className="text-mystic-400">
        {t('disclaimer.label', { defaultValue: 'Disclaimer' })}
      </EyebrowLabel>
      <p className="mt-2 text-ui font-semibold text-mystic-100">
        {lead ?? t(`disclaimer.lead.${kind}`, { defaultValue: LEAD[kind] })}
      </p>
      <p className="mt-1.5 text-meta text-mystic-400">
        {body ??
          (KIND_BODY[kind]
            ? t(`disclaimer.bodies.${kind}`, { defaultValue: KIND_BODY[kind] })
            : t('disclaimer.body', { defaultValue: BODY }))}
      </p>
    </aside>
  );
}
