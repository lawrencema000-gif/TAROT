// Slim non-blocking banner shown to native users when their installed
// AAB ships an older bundle than what's live. Surfaces only once the
// bundled version is at least 14 days behind live (so we don't nag every
// user immediately after every web deploy).
//
// Behaviour:
//   - Web: never renders.
//   - Native + bundle stale + age >= 14d: renders a sticky bottom banner
//     above the bottom nav with a "Update now" CTA that links to Play Store.
//   - User can dismiss; we remember dismissal for 48h via appStorage so
//     they're not nagged hourly.

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useVersionCheck } from '../../hooks/useVersionCheck';
import { appStorage } from '../../lib/appStorage';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.arcana.app';
const DISMISS_KEY = 'arcana_update_banner_dismissed_until';
const DISMISS_HOURS = 48;

export function UpdateAvailableBanner() {
  const { shouldPrompt } = useVersionCheck();
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    appStorage.get(DISMISS_KEY).then((val) => {
      if (typeof val === 'string') {
        const until = new Date(val).getTime();
        if (Number.isFinite(until) && until > Date.now()) setDismissed(true);
      }
    }).catch(() => undefined);
  }, []);

  if (!shouldPrompt || dismissed) return null;

  const handleUpdate = () => {
    if (typeof window !== 'undefined') {
      window.location.href = PLAY_STORE_URL;
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    const until = new Date(Date.now() + DISMISS_HOURS * 60 * 60 * 1000).toISOString();
    appStorage.set(DISMISS_KEY, until).catch(() => undefined);
  };

  return (
    <div className="fixed bottom-20 left-2 right-2 z-40 mx-auto max-w-md rounded-2xl border border-gold/40 bg-gradient-to-r from-mystic-900/95 to-mystic-800/95 p-3 shadow-glow-sm backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold/20">
          <Sparkles className="h-4 w-4 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-mystic-100">A new version is available</p>
          <p className="mt-0.5 text-xs leading-relaxed text-mystic-300">
            Includes recent fixes and improvements. Update from Play Store to get them.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleUpdate}
              className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-mystic-950 hover:bg-gold/90 transition-colors"
            >
              Update now
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-full px-3 py-1 text-xs text-mystic-400 hover:text-mystic-200 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-mystic-500 hover:bg-mystic-800 hover:text-mystic-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
