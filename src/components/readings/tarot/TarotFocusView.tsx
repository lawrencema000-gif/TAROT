/**
 * TarotSection focus-area picker — extracted from the monolithic
 * TarotSection.tsx as part of the `tarot-section-split` rollout.
 *
 * Behavior-equivalent to the `view === 'focus'` branch of the legacy
 * component. All state is owned by the parent; this component is pure
 * presentation + event forwarding.
 */
import { Sparkles, ChevronRight } from 'lucide-react';
import { Chip, Button } from '../../ui';
import { useT } from '../../../i18n/useT';
import { FOCUS_AREAS, FOCUS_AREA_I18N_KEY, type FocusArea } from './types';

interface TarotFocusViewProps {
  selectedFocus: FocusArea | null;
  onBack: () => void;
  onSelect: (focus: FocusArea) => void;
  onContinue: () => void;
}

export function TarotFocusView({ selectedFocus, onBack, onSelect, onContinue }: TarotFocusViewProps) {
  const { t } = useT('app');

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
      >
        {t('readings.back')}
      </button>

      <div className="text-center space-y-3">
        <Sparkles className="w-12 h-12 text-gold mx-auto animate-pulse" />
        <h2 className="font-display text-2xl text-mystic-100">{t('readings.focusView.title')}</h2>
        <p className="text-mystic-400">{t('readings.focusView.subtitle')}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {FOCUS_AREAS.map((focus) => (
          <Chip
            key={focus}
            label={t(FOCUS_AREA_I18N_KEY[focus])}
            selected={selectedFocus === focus}
            onSelect={() => onSelect(focus)}
          />
        ))}
      </div>

      <Button
        variant="gold"
        fullWidth
        disabled={!selectedFocus}
        onClick={onContinue}
        className="min-h-[52px]"
      >
        {t('readings.focusView.continue')}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
