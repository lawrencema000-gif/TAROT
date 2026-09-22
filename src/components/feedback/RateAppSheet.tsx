import { Heart, Star, MessageCircle, X } from 'lucide-react';
import { Button } from '../ui';
import { useT } from '../../i18n/useT';
import { ratePromptService } from '../../services/ratePrompt';

interface RateAppSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function RateAppSheet({ open, onClose, userId }: RateAppSheetProps) {
  const { t } = useT('app');
  if (!open) return null;

  const handleRate = async () => {
    await ratePromptService.recordResponse(userId, 'rated');
    window.open(ratePromptService.getPlayStoreUrl(), '_blank');
    onClose();
  };

  const handleFeedback = async () => {
    await ratePromptService.recordResponse(userId, 'feedback');
    window.open(ratePromptService.getFeedbackEmail(), '_blank');
    onClose();
  };

  const handleLater = async () => {
    await ratePromptService.recordResponse(userId, 'later');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-mystic-950/90 backdrop-blur-sm animate-fade-in"
        onClick={handleLater}
      />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-gradient-to-b from-mystic-850 to-mystic-900 rounded-sheet border border-gold/20 w-full max-w-sm p-8 text-center animate-scale-in relative">
          <button
            onClick={handleLater}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-mystic-800 transition-colors"
          >
            <X className="w-5 h-5 text-mystic-400" />
          </button>

          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cosmic-rose/20 to-mystic-800 flex items-center justify-center">
              <Heart className="w-10 h-10 text-cosmic-rose fill-cosmic-rose/30" />
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="font-display text-2xl text-mystic-100">
              {t('rateApp.title', { defaultValue: 'Thank you for trying my first app' })}
            </h2>
            <p className="text-mystic-300 text-sm leading-relaxed">
              {t('rateApp.body1', { defaultValue: "I built this while studying, so I'm working with limited time and resources. I know it isn't perfect yet, but I'm actively improving it." })}
            </p>
            <p className="text-mystic-300 text-sm leading-relaxed">
              {t('rateApp.body2', { defaultValue: "If anything feels off or you spot a bug, please let me know. And if you're enjoying it, a 5-star review helps a lot." })}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="gold"
              size="lg"
              fullWidth
              onClick={handleRate}
            >
              <Star className="w-5 h-5" />
              {t('rateApp.rate', { defaultValue: 'Rate Arcana on Google Play' })}
            </Button>

            <Button
              variant="outline"
              fullWidth
              onClick={handleFeedback}
            >
              <MessageCircle className="w-5 h-5" />
              {t('rateApp.feedback', { defaultValue: 'Report a problem by email' })}
            </Button>

            <button
              onClick={handleLater}
              className="w-full py-3 text-mystic-400 hover:text-mystic-300 transition-colors text-sm"
            >
              {t('rateApp.later', { defaultValue: 'Ask me another time' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
