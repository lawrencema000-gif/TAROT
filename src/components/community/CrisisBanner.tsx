import { AlertTriangle, Phone, MessageSquare, Globe, X } from 'lucide-react';
import { useT } from '../../i18n/useT';

interface CrisisBannerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Crisis resources card — surfaced by the moderation pipeline when a
 * self-harm or suicide ideation keyword is detected in a user's post.
 *
 * Deliberately NON-blocking. The user's post still goes through (to
 * moderation review — not hidden from them), but they also see this
 * card. The intent is harm reduction, not censorship.
 *
 * The 988 number and Crisis Text Line shortcodes are for US/UK/CA/IE.
 * findahelpline.com covers the rest of the world.
 */
export function CrisisBanner({ open, onClose }: CrisisBannerProps) {
  const { t } = useT('app');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-mystic-950 border border-pink-400/40 rounded-2xl max-w-md w-full p-5 relative shadow-2xl">
        <button
          onClick={onClose}
          aria-label={t('common:actions.close', { defaultValue: 'Close' })}
          className="absolute top-3 right-3 text-mystic-400 hover:text-mystic-100 p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-pink-400/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-pink-400" />
          </div>
          <div className="pt-1">
            <h3 className="font-display text-lg text-mystic-100">
              {t('crisis.title', { defaultValue: 'You are not alone' })}
            </h3>
            <p className="text-xs text-mystic-400 mt-1 leading-relaxed">
              {t('crisis.subtitle', {
                defaultValue:
                  'We noticed some of what you wrote. If you are hurting right now, please reach for one of these — they are free and confidential.',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-mystic-900/60 border border-mystic-800/80 rounded-xl">
            <Phone className="w-4 h-4 text-gold flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-mystic-100 font-medium">
                {t('crisis.phone.title', { defaultValue: '988 Suicide & Crisis Lifeline' })}
              </p>
              <p className="text-xs text-mystic-400 truncate">
                {t('crisis.phone.body', { defaultValue: 'Call or text 988 · 24/7 · US' })}
              </p>
            </div>
            <a
              href="tel:988"
              className="px-3 py-1.5 bg-gold/15 text-gold rounded-lg text-xs font-medium hover:bg-gold/25 transition-colors"
            >
              {t('crisis.phone.cta', { defaultValue: 'Call' })}
            </a>
          </div>

          <div className="flex items-center gap-3 p-3 bg-mystic-900/60 border border-mystic-800/80 rounded-xl">
            <MessageSquare className="w-4 h-4 text-cosmic-blue flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-mystic-100 font-medium">
                {t('crisis.text.title', { defaultValue: 'Crisis Text Line' })}
              </p>
              <p className="text-xs text-mystic-400 truncate">
                {t('crisis.text.body', { defaultValue: 'Text HOME to 741741 · US/UK/CA/IE' })}
              </p>
            </div>
            <a
              href="sms:741741?body=HOME"
              className="px-3 py-1.5 bg-cosmic-blue/15 text-cosmic-blue rounded-lg text-xs font-medium hover:bg-cosmic-blue/25 transition-colors"
            >
              {t('crisis.text.cta', { defaultValue: 'Text' })}
            </a>
          </div>

          <a
            href="https://findahelpline.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-mystic-900/60 border border-mystic-800/80 rounded-xl hover:border-mystic-700 transition-colors"
          >
            <Globe className="w-4 h-4 text-cosmic-violet flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-mystic-100 font-medium">
                {t('crisis.international.title', { defaultValue: 'International helplines' })}
              </p>
              <p className="text-xs text-mystic-400 truncate">
                findahelpline.com
              </p>
            </div>
          </a>
        </div>

        <p className="text-[11px] text-mystic-500 leading-relaxed mt-4 italic">
          {t('crisis.footer', {
            defaultValue:
              'Arcana is not a medical service. If you are in immediate danger, please call your local emergency number.',
          })}
        </p>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 text-sm text-mystic-300 hover:text-mystic-100 border-t border-mystic-800 pt-3"
        >
          {t('crisis.closeButton', { defaultValue: 'I\'m okay for now' })}
        </button>
      </div>
    </div>
  );
}
