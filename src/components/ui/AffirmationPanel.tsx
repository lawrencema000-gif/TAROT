import { useT } from '../../i18n/useT';
import { EyebrowLabel, SparkleFourPoint } from './Ornament';

export interface AffirmationPanelProps {
  /** The card's affirmation — `affirmation` in tarotEnrichment.ts: first person, present tense, one line. */
  text: string;
  /**
   * `paper` (default) — an inset panel on a Paper: paper-2 fill, paper
   * hairline, ink text. It carries its own `.paper-prose` scope, so it
   * also reads correctly when it is the only cream thing on a navy screen.
   * `canvas` — surface-2 (mystic-800) with mystic-100 text, for a card
   * detail that has not moved onto paper yet.
   */
  surface?: 'paper' | 'canvas';
  className?: string;
}

/**
 * The affirmation panel under a card: ✦ AFFIRMATION ✦ then the sentence
 * in the bold display serif.
 *
 * Use once per card — after the keyword row on TarotCardDetail and
 * TarotCardMeaningPage, and once per reading at the end of the result
 * (the first position's card). Not a quote block and not a prompt: the
 * text is the card's own voice in the first person, so do not wrap it in
 * quotation marks or add an attribution.
 */
export function AffirmationPanel({ text, surface = 'paper', className = '' }: AffirmationPanelProps) {
  const { t } = useT('common');
  const shell =
    surface === 'paper'
      ? 'paper-prose bg-paper-2 border border-paper-hairline text-ink'
      : 'bg-mystic-800 text-mystic-100';
  return (
    <aside className={`rounded-control p-5 text-center ${shell} ${className}`.trim()}>
      <div className="flex items-center justify-center gap-2.5 text-gold">
        <SparkleFourPoint size={10} />
        <EyebrowLabel tone="ink" className="tracking-[0.18em]">
          {t('affirmation.label', { defaultValue: 'Affirmation' })}
        </EyebrowLabel>
        <SparkleFourPoint size={10} />
      </div>
      <p className="mt-3 font-display font-semibold text-title text-balance">{text}</p>
    </aside>
  );
}
