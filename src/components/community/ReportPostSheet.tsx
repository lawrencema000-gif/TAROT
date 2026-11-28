import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sheet, Button } from '../ui';
import { useT } from '../../i18n/useT';
import type { ReportReason } from '../../dal/community';

const REASONS: ReportReason[] = ['spam', 'harassment', 'self-harm', 'explicit', 'misinformation', 'other'];

interface ReportPostSheetProps {
  open: boolean;
  onClose: () => void;
  /** Resolves true when the report landed. On false the sheet stays up so Report can be tried again. */
  onSubmit: (reason: ReportReason) => Promise<boolean>;
}

/**
 * Report a post or a whisper: pick a reason, then confirm (two taps, R7).
 * On the shared Sheet and portalled to <body> (social-ai-01): the old
 * ReportDialog was a fixed overlay inside <main class="relative z-10">, so the
 * bottom nav (z-40, main's sibling) covered its Cancel and Report on every phone.
 */
export function ReportPostSheet({ open, onClose, onSubmit }: ReportPostSheetProps) {
  const { t } = useT('app');
  const promptId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [sending, setSending] = useState(false);

  // The Sheet outlives `open` to play its exit, so each opening starts with no reason picked.
  useEffect(() => {
    if (open) setReason(null);
  }, [open]);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      await onSubmit(reason);
    } finally {
      setSending(false);
    }
  };

  const sheet = (
    <Sheet open={open} onClose={sending ? () => {} : onClose} title={t('community.reportPostTitle', { defaultValue: 'Report post' })}>
      <div className="mx-auto w-full max-w-md">
        <p id={promptId} className="text-meta text-mystic-400 mb-3">
          {t('community.reportPrompt', { defaultValue: 'Choose a reason, then confirm.' })}
        </p>
        <div role="radiogroup" aria-labelledby={promptId} className="space-y-1">
          {REASONS.map((r) => {
            const active = reason === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setReason(r)}
                className={`w-full text-left px-3 py-2 min-h-[44px] text-ui rounded-control flex items-center gap-3 ${
                  active ? 'bg-gold/10 text-mystic-100' : 'text-mystic-300 hover:bg-mystic-800'
                }`}
              >
                <span
                  className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-gold' : 'border-mystic-600'}`}
                  aria-hidden
                >
                  {active && <span className="w-2 h-2 rounded-full bg-gold" />}
                </span>
                {t(`community.reportReasons.${r}`, { defaultValue: r })}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" fullWidth onClick={onClose} disabled={sending}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="primary" fullWidth disabled={!reason || sending} loading={sending} onClick={() => void submit()}>
            {t('community.reportConfirm', { defaultValue: 'Report' })}
          </Button>
        </div>
      </div>
    </Sheet>
  );
  // Portalled to <body>, as LeaveReadingSheet and EarnMoonstonesSheet are: on
  // <body> its own z (50 + 2 × its order) and its place last in the document
  // put it above the shell, whatever the page under it holds.
  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body);
}
