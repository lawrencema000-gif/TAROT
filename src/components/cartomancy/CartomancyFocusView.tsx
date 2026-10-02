import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Chip, Input } from '../ui';
import { useT } from '../../i18n/useT';
import { FOCUS_AREAS, FOCUS_AREA_I18N_KEY, type FocusArea } from '../readings/tarot/types';
import type { CartoSpread } from '../../types/cartomancy';
import { SuitGlyph } from './SuitGlyph';

/**
 * The focus, with the question.
 *
 * TarotFocusView's shape (six chips, one button) plus the one thing a
 * playing-card table needs that a tarot focus does not: the question as
 * typed. The Wish is read against the wish stated, Yes or No against the
 * question asked, and the result sheet's title is that sentence. Optional
 * for every spread; the placeholder changes with the spread so a Wish
 * invites "I wish to…" and Yes or No a question.
 */

export interface CartomancyFocusViewProps {
  spread: CartoSpread;
  selectedFocus: FocusArea | null;
  question: string;
  onBack: () => void;
  onSelect: (focus: FocusArea) => void;
  onQuestionChange: (question: string) => void;
  onContinue: () => void;
}

const QUESTION_MAX = 140;

export function CartomancyFocusView({ spread, selectedFocus, question, onBack, onSelect, onQuestionChange, onContinue }: CartomancyFocusViewProps) {
  const { t } = useT('app');
  const kind = spread.verdict?.kind;
  const placeholder =
    kind === 'wish'
      ? t('cartomancy.focus.wishPlaceholder', { defaultValue: 'I wish to…' })
      : kind === 'yes-no'
        ? t('cartomancy.focus.yesNoPlaceholder', { defaultValue: 'Ask a question the cards can answer yes or no' })
        : t('cartomancy.focus.questionPlaceholder', { defaultValue: 'What is on your mind? (optional)' });

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center min-h-[44px]">
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t('readings.back')}
      </button>

      <div className="text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-mystic-800 text-gold animate-scale-in" aria-hidden>
          <SuitGlyph suit="hearts" size={24} />
        </div>
        <p className="font-display-eyebrow text-mystic-400">{spread.name}</p>
        <h2 className="heading-display-lg text-mystic-100">{t('readings.focusView.title')}</h2>
        <p className="text-body text-mystic-400">{t('readings.focusView.subtitle')}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {FOCUS_AREAS.map((focus, i) => (
          <div key={focus} className="animate-fade-in" style={{ animationDuration: '240ms', animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
            <Chip label={t(FOCUS_AREA_I18N_KEY[focus])} selected={selectedFocus === focus} onSelect={() => onSelect(focus)} />
          </div>
        ))}
      </div>

      <Input
        label={kind === 'wish' ? t('cartomancy.focus.wishLabel', { defaultValue: 'Your wish' }) : t('cartomancy.focus.questionLabel', { defaultValue: 'Your question' })}
        value={question}
        maxLength={QUESTION_MAX}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => onQuestionChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && selectedFocus) onContinue();
        }}
      />

      <Button variant="gold" fullWidth disabled={!selectedFocus} onClick={onContinue} size="lg">
        {t('readings.focusView.continue')}
        <ChevronRight className="w-4 h-4" aria-hidden />
      </Button>
    </div>
  );
}
