import { PenLine } from 'lucide-react';
import { Button, Card, EyebrowLabel } from '../ui';
import { useT } from '../../i18n/useT';

interface PromptCardProps {
  prompt: string;
  onWrite: () => void;
}

/**
 * The third part of the ritual: one question, one honest sentence.
 *
 * The prompt is the content, so it gets the display face at reading size
 * and nothing competes with it: no icon tile, no second heading, no
 * invented "2 min" beside the button. One card surface, like every other
 * card on Home.
 */
export function PromptCard({ prompt, onWrite }: PromptCardProps) {
  const { t } = useT('app');
  return (
    <Card padding="md">
      <EyebrowLabel>{t('home.ritualCards.yourPrompt')}</EyebrowLabel>
      <p className="font-display text-lede text-mystic-100 leading-relaxed mt-3 mb-5">“{prompt}”</p>
      <Button variant="gold" onClick={onWrite}>
        <PenLine className="w-4 h-4" aria-hidden />
        {t('home.ritualCards.write')}
      </Button>
    </Card>
  );
}
