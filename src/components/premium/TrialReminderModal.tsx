import { useEffect, useState } from 'react';
import { Sparkles, X, Crown, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { PaywallSheet } from './PaywallSheet';

const SESSION_KEY = 'trialReminder.shownThisSession.v1';
const SHOW_AFTER_MS = 30_000;

export function TrialReminderModal() {
  const { user, profile } = useAuth();
  const { t } = useT('app');
  const [open, setOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.isPremium) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      // sessionStorage unavailable — fall through, treat as not yet shown
    }

    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // ignore quota / privacy-mode failures
      }
      setOpen(true);
    }, SHOW_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [user, profile]);

  if (showPaywall) {
    return <PaywallSheet open onClose={() => { setShowPaywall(false); setOpen(false); }} />;
  }

  if (!open) return null;

  const benefits = [
    t('premium.trialReminder.benefits.allFeatures', { defaultValue: 'All premium features unlocked' }),
    t('premium.trialReminder.benefits.adFree', { defaultValue: 'Completely ad-free' }),
    t('premium.trialReminder.benefits.cancelAnytime', { defaultValue: 'Cancel anytime, no charge' }),
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-mystic-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-reminder-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-mystic-900 via-mystic-900 to-mystic-950 border border-gold/30 rounded-3xl shadow-2xl shadow-gold/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/15 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={() => setOpen(false)}
          aria-label={t('common.close', { defaultValue: 'Close' })}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-mystic-800/60 hover:bg-mystic-800 transition-colors"
        >
          <X className="w-4 h-4 text-mystic-300" />
        </button>

        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold via-gold-dark to-gold flex items-center justify-center shadow-lg shadow-gold/20">
              <Crown className="w-8 h-8 text-mystic-950" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-cosmic-blue rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-semibold text-gold uppercase tracking-wider">
              {t('premium.trialReminder.badge', { defaultValue: '3 days free' })}
            </span>
          </div>

          <h2
            id="trial-reminder-title"
            className="font-display text-2xl text-center text-mystic-100 mb-2"
          >
            {t('premium.trialReminder.title', { defaultValue: 'Try Premium free for 3 days' })}
          </h2>
          <p className="text-sm text-mystic-400 text-center max-w-xs mb-5">
            {t('premium.trialReminder.subtitle', {
              defaultValue: 'Unlock everything for 3 days, then $19.99/year. Cancel anytime.',
            })}
          </p>

          <ul className="w-full space-y-2 mb-6">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-sm text-mystic-200">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                  <Check className="w-3 h-3 text-gold" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setShowPaywall(true)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold via-gold-dark to-gold text-mystic-950 font-semibold text-base shadow-lg shadow-gold/20 hover:shadow-gold/30 transition-shadow"
          >
            {t('premium.trialReminder.cta', { defaultValue: 'Start free trial' })}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 py-2 text-sm text-mystic-500 hover:text-mystic-300 transition-colors"
          >
            {t('premium.trialReminder.dismiss', { defaultValue: 'Maybe later' })}
          </button>
        </div>
      </div>
    </div>
  );
}
