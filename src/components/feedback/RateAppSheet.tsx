import { useEffect, useState } from 'react';
import { MessageCircle, Star } from 'lucide-react';
import { Button, Sheet } from '../ui';
import { useT } from '../../i18n/useT';
import { ratePromptService } from '../../services/ratePrompt';

interface RateAppSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

/** Anything already on top of the page: a Sheet, a modal, a celebration. */
const OVERLAY_SELECTOR = '[role="dialog"], [aria-modal="true"], .fixed.inset-0.z-50, .fixed.inset-0.z-\\[60\\]';

/**
 * Hold the request until nothing else is open (R6 A6: the ask used to
 * stack under the achievement modal). Polls the document every half
 * second while `open` is true and no other overlay is present; once it
 * shows, the check stops so its own dialog does not block it.
 */
function useDeferredOpen(open: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    let cancelled = false;
    let timer = 0;
    const check = () => {
      if (cancelled) return;
      if (document.querySelector(OVERLAY_SELECTOR)) {
        timer = window.setTimeout(check, 500);
      } else {
        setReady(true);
      }
    };
    check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);
  return ready;
}

/**
 * The store-rating ask, worded as a product and built on the Sheet
 * primitive (so Escape and the backdrop close it, focus is trapped, and
 * it stacks correctly over the page). The service decides WHEN: native
 * Android only, after a seven-day streak or ten positive actions.
 */
export function RateAppSheet({ open, onClose, userId }: RateAppSheetProps) {
  const { t } = useT('app');
  const ready = useDeferredOpen(open);

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
    <Sheet open={ready} onClose={handleLater} title={t('rateApp.prompt.title', { defaultValue: 'Enjoying Arcana?' })}>
      <div className="space-y-6 pb-2">
        <p className="reading-copy">
          {t('rateApp.prompt.body', {
            defaultValue: 'A rating helps other seekers find it. If something feels off, tell us instead — every report is read.',
          })}
        </p>
        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={handleRate}>
            <Star className="h-4 w-4" aria-hidden />
            {t('rateApp.prompt.rate', { defaultValue: 'Rate Arcana on Google Play' })}
          </Button>
          <Button variant="outline" fullWidth onClick={handleFeedback}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t('rateApp.prompt.feedback', { defaultValue: 'Report a problem' })}
          </Button>
          <Button variant="ghost" fullWidth onClick={handleLater}>
            {t('rateApp.prompt.later', { defaultValue: 'Not now' })}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
