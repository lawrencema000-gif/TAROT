import { Sheet, Button } from '../ui';
import { useT } from '../../i18n/useT';

interface ConfirmDeleteSheetProps {
  open: boolean;
  title: string;
  body: string;
  /** The row being deleted, quoted so the member can see which one it is. */
  excerpt?: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * "Delete this post?" — the same shape as the journal's delete sheet: what
 * goes, that it cannot come back, and two buttons, the destructive one last.
 */
export function ConfirmDeleteSheet({ open, title, body, excerpt, busy, onCancel, onConfirm }: ConfirmDeleteSheetProps) {
  const { t } = useT('common');
  return (
    <Sheet open={open} onClose={busy ? () => {} : onCancel} title={title}>
      <div className="space-y-5">
        <p className="text-ui text-mystic-300 leading-relaxed">{body}</p>
        {excerpt && (
          <p className="text-meta text-mystic-400 italic whitespace-pre-wrap line-clamp-3 border-l-2 border-mystic-700 pl-3">
            {excerpt}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={busy}>
            {t('actions.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="destructive" fullWidth onClick={onConfirm} loading={busy}>
            {t('actions.delete', { defaultValue: 'Delete' })}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
