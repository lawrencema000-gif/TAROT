import { useEffect, useRef } from 'react';
import { AlertTriangle, Phone, MessageSquare, Globe, X } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { ModerationResult } from '../../services/moderation';

interface CrisisBannerProps {
  open: boolean;
  onClose: () => void;
  /**
   * What the moderation call returned alongside `crisis: true`. In English
   * these lead: the server owns the numbers, so a changed line reaches the
   * UI without a release. ja/ko/zh carry their own national lines in the
   * locale files and keep them; the server's international link fills in
   * for every locale.
   */
  resources?: ModerationResult['crisisResources'];
}

/**
 * Crisis resources card — surfaced by the moderation pipeline when a
 * self-harm or suicide ideation keyword is detected in a user's post.
 *
 * Deliberately NON-blocking. The user's post still goes through (to
 * moderation review — not hidden from them), but they also see this
 * card. The intent is harm reduction, not censorship.
 *
 * It is a dialog: it holds focus, names itself, and closes on Escape, the
 * scrim, the close button or "I'm okay for now". It is mounted once at the
 * page root by CommunityPage (not inside the composer), so publishing a
 * flagged post cannot unmount it before it is seen.
 */
export function CrisisBanner({ open, onClose, resources }: CrisisBannerProps) {
  const { t } = useT('app');
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, { initialFocus: panelRef });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // English reads the server's resources first; other locales lead with
  // their own national lines and fall back to the server where they have none.
  const serverLeads = Boolean(resources) && getLocale() === 'en';
  const pick = (key: string, serverValue: string | undefined, fallback: string) =>
    serverLeads && serverValue ? serverValue : (t(key, { defaultValue: serverValue ?? fallback }) as string);

  const phoneNumber = pick('crisis.phone.number', resources?.us.number, '988');
  const phoneTitle = pick('crisis.phone.title', resources?.us.name, '988 Suicide & Crisis Lifeline');
  const phoneBody = pick(
    'crisis.phone.body',
    resources?.us.number ? `Call or text ${resources.us.number} · 24/7 · US` : undefined,
    `Call or text ${phoneNumber} · 24/7 · US`,
  );
  const textTitle = pick('crisis.text.title', resources?.textLine.name, 'Crisis Text Line');
  const textBody = pick('crisis.text.body', resources?.textLine.instructions, 'Text HOME to 741741 · US/UK/CA/IE');
  const textScheme = t('crisis.text.scheme', { defaultValue: 'sms' }) as string;
  const textNumber = t('crisis.text.number', { defaultValue: '741741' }) as string;
  const textKeyword = t('crisis.text.keyword', { defaultValue: 'HOME' }) as string;
  const internationalUrl = resources?.international && /^https:\/\//.test(resources.international)
    ? resources.international
    : 'https://findahelpline.com';
  const internationalHost = internationalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const titleId = 'crisis-banner-title';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-mystic-950/80" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-mystic-950 border border-coral/40 rounded-card max-w-md w-full p-5 relative outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common:actions.close', { defaultValue: 'Close' }) as string}
          className="absolute top-1 right-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-mystic-400 hover:text-mystic-100 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-coral/15 flex items-center justify-center flex-shrink-0" aria-hidden>
            <AlertTriangle className="w-5 h-5 text-coral" />
          </div>
          <div className="pt-1">
            <h3 id={titleId} className="heading-display-md text-mystic-100">
              {t('crisis.title', { defaultValue: 'You are not alone' })}
            </h3>
            <p className="text-meta text-mystic-400 mt-1">
              {t('crisis.subtitle', {
                defaultValue:
                  'We noticed some of what you wrote. If you are hurting right now, please reach for one of these — they are free and confidential.',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-mystic-900/60 border border-mystic-800/80 rounded-control">
            <Phone className="w-4 h-4 text-gold flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-ui text-mystic-100 font-medium">{phoneTitle}</p>
              <p className="text-meta text-mystic-400 truncate">{phoneBody}</p>
            </div>
            <a
              href={`tel:${phoneNumber}`}
              className="min-h-[44px] inline-flex items-center px-3 py-1.5 bg-gold/15 text-gold rounded-control text-meta font-medium hover:bg-gold/25 transition-colors"
            >
              {t('crisis.phone.cta', { defaultValue: 'Call' })}
            </a>
          </div>

          <div className="flex items-center gap-3 p-3 bg-mystic-900/60 border border-mystic-800/80 rounded-control">
            {textScheme === 'sms'
              ? <MessageSquare className="w-4 h-4 text-cosmic-blue flex-shrink-0" aria-hidden />
              : <Phone className="w-4 h-4 text-cosmic-blue flex-shrink-0" aria-hidden />}
            <div className="flex-1 min-w-0">
              <p className="text-ui text-mystic-100 font-medium">{textTitle}</p>
              <p className="text-meta text-mystic-400 truncate">{textBody}</p>
            </div>
            <a
              href={`${textScheme}:${textNumber}${textKeyword ? `?body=${textKeyword}` : ''}`}
              className="min-h-[44px] inline-flex items-center px-3 py-1.5 bg-cosmic-blue/15 text-cosmic-blue-ink rounded-control text-meta font-medium hover:bg-cosmic-blue/25 transition-colors"
            >
              {t('crisis.text.cta', { defaultValue: 'Text' })}
            </a>
          </div>

          <a
            href={internationalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-mystic-900/60 border border-mystic-800/80 rounded-control hover:border-mystic-700 transition-colors"
          >
            <Globe className="w-4 h-4 text-cosmic-violet-ink flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-ui text-mystic-100 font-medium">
                {t('crisis.international.title', { defaultValue: 'International helplines' })}
              </p>
              <p className="text-meta text-mystic-400 truncate">{internationalHost}</p>
            </div>
          </a>
        </div>

        <p className="text-meta text-mystic-400 leading-relaxed mt-4">
          {t('crisis.footer', {
            defaultValue:
              'Arcana is not a medical service. If you are in immediate danger, please call your local emergency number.',
          })}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2.5 min-h-[44px] text-ui text-mystic-300 hover:text-mystic-100 border-t border-mystic-800 pt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded-control"
        >
          {t('crisis.closeButton', { defaultValue: 'I’m okay for now' })}
        </button>
      </div>
    </div>
  );
}
