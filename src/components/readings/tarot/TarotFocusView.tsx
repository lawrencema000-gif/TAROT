/**
 * The focus.
 *
 * Before the deck is touched the reader names what the reading is for:
 * six areas in one row of chips, and — optionally — the question itself,
 * in one line. The question becomes the title of the result sheet and
 * goes to the AI with the cards; without it the result is titled by the
 * spread. All state is the parent's; this is presentation and event
 * forwarding.
 *
 * The compass arrives once (a 300ms scale-in, `forwards`) and then holds.
 * The chips follow in a short cascade so the row reads as a set being
 * laid out. Under reduced motion the global block in index.css pins both
 * to a single frame.
 */
import { ChevronLeft, Compass, ChevronRight } from 'lucide-react';
import { Chip, Button, Input } from '../../ui';
import { useT } from '../../../i18n/useT';
import { FOCUS_AREAS, FOCUS_AREA_I18N_KEY, type FocusArea } from './types';

/** Long enough for a real question, short enough to stay a title. */
const QUESTION_MAX = 140;

interface TarotFocusViewProps {
  selectedFocus: FocusArea | null;
  question: string;
  onBack: () => void;
  onSelect: (focus: FocusArea) => void;
  onQuestionChange: (question: string) => void;
  onContinue: () => void;
}

export function TarotFocusView({
  selectedFocus,
  question,
  onBack,
  onSelect,
  onQuestionChange,
  onContinue,
}: TarotFocusViewProps) {
  const { t } = useT('app');

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center min-h-[44px] -ml-1 pr-2"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        {t('readings.back')}
      </button>

      <div className="text-center space-y-3">
        <Compass className="w-12 h-12 text-gold mx-auto animate-scale-in" aria-hidden />
        <h2 className="heading-display-lg text-mystic-100">{t('readings.focusView.title')}</h2>
        <p className="text-body text-mystic-400">{t('readings.focusView.subtitle')}</p>
      </div>

      {/* 40ms apart: the last chip is in place well inside 400ms. */}
      <div className="flex flex-wrap justify-center gap-2">
        {FOCUS_AREAS.map((focus, i) => (
          <div
            key={focus}
            className="animate-fade-in"
            style={{
              animationDuration: '240ms',
              animationDelay: `${i * 40}ms`,
              animationFillMode: 'both',
            }}
          >
            <Chip
              label={t(FOCUS_AREA_I18N_KEY[focus])}
              selected={selectedFocus === focus}
              onSelect={() => onSelect(focus)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Input
          value={question}
          onChange={(e) => onQuestionChange(e.target.value.slice(0, QUESTION_MAX))}
          maxLength={QUESTION_MAX}
          placeholder={t('readings.focusView.questionPlaceholder', { defaultValue: 'What’s on your mind?' })}
          aria-label={t('readings.focusView.questionLabel', { defaultValue: 'Your question (optional)' })}
          autoComplete="off"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && selectedFocus) {
              e.preventDefault();
              onContinue();
            }
          }}
        />
        <p className="text-caption text-mystic-500 px-1">
          {t('readings.focusView.questionHint', { defaultValue: 'Optional. It becomes the title of your reading.' })}
        </p>
      </div>

      <Button
        variant="gold"
        fullWidth
        disabled={!selectedFocus}
        onClick={onContinue}
        size="lg"
      >
        {t('readings.focusView.continue')}
        <ChevronRight className="w-4 h-4" aria-hidden />
      </Button>
    </div>
  );
}
