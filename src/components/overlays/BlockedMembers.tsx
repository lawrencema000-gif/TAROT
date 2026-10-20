import { useCallback, useEffect, useState } from 'react';
import { UserX } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { ListRow, ListRowGroup } from '../ui/ListRow';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton } from '../ui/Skeleton';
import { toast } from '../ui/Toast';
import { community } from '../../dal';
import type { CommunityBlock } from '../../dal/community';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';

const BCP47: Record<string, string> = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

/** "Oct 17" this year, "Oct 17, 2025" before. */
function blockDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(BCP47[getLocale()] ?? 'en-US', sameYear
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Settings → Blocked members: every block the member made, and the way to
 * undo one. There was no screen for it: a block made from a post's menu
 * could never be taken back.
 *
 * A block made from a named post shows that member's name (or "A member"
 * when they have none the viewer can see); one made from an anonymous post
 * says only "Anonymous member" and the date — the server never tells the
 * blocker who wrote it, and nothing here shows an id. Before migration
 * 20261003000014 the list is read from community_blocks directly and every
 * row is a named one without a name (dal/community.listMyBlocks).
 */
export function BlockedMembers({ userId }: { userId: string | undefined }) {
  const { t } = useT('app');
  const { t: tc } = useT('common');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [blocks, setBlocks] = useState<CommunityBlock[]>([]);
  const [pending, setPending] = useState<CommunityBlock | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus('loading');
    const res = await community.listMyBlocks(userId);
    if (!res.ok) {
      setStatus('error');
      return;
    }
    setBlocks(res.data);
    setStatus('ready');
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const label = (b: CommunityBlock) =>
    b.kind === 'anonymous'
      ? t('settings.blocked.anonymous', { defaultValue: 'Anonymous member' })
      : b.blockedDisplayName?.trim() || t('community.unnamedMember', { defaultValue: 'A member' });

  const confirmUnblock = async () => {
    if (!pending) return;
    setBusy(true);
    const res = await community.unblock(pending.blockId);
    setBusy(false);
    if (!res.ok) {
      toast(t('settings.blocked.unblockFailed', { defaultValue: 'Couldn’t unblock — check your connection and try again.' }), 'error');
      return;
    }
    // false = the block was already gone (undone on another device): the row goes either way.
    const id = pending.blockId;
    setBlocks((bs) => bs.filter((b) => b.blockId !== id));
    setPending(null);
    toast(t('settings.blocked.unblocked', { defaultValue: 'Unblocked' }), 'success');
  };

  return (
    <div className="space-y-4">
      <p className="text-meta text-mystic-400 keep-phrases">
        {t('settings.blocked.intro', { defaultValue: 'You don’t see posts or comments from members you’ve blocked.' })}
      </p>

      {status === 'loading' ? (
        <div role="status" aria-busy="true" aria-label={tc('labels.loading', { defaultValue: 'Loading…' })}>
          <ListSkeleton count={2} />
        </div>
      ) : status === 'error' ? (
        <EmptyState
          variant="inline"
          icon={<UserX />}
          title={t('settings.blocked.loadFailed', { defaultValue: 'Couldn’t load your blocked members — check your connection and try again.' })}
          action={
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              {tc('actions.retry', { defaultValue: 'Try again' })}
            </Button>
          }
        />
      ) : blocks.length === 0 ? (
        <EmptyState
          variant="inline"
          icon={<UserX />}
          title={t('settings.blocked.empty', { defaultValue: 'You haven’t blocked anyone.' })}
        />
      ) : (
        <ListRowGroup>
          {blocks.map((b) => (
            <ListRow
              key={b.blockId}
              icon={<UserX />}
              label={label(b)}
              meta={<span className="tabular-nums">{t('settings.blocked.blockedOn', { defaultValue: 'Blocked {{date}}', date: blockDate(b.createdAt) })}</span>}
              trailing={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPending(b)}
                  aria-label={t('settings.blocked.unblockAria', { defaultValue: 'Unblock {{name}}', name: label(b) })}
                >
                  {t('settings.blocked.unblock', { defaultValue: 'Unblock' })}
                </Button>
              }
            />
          ))}
        </ListRowGroup>
      )}

      {/* Unblocking asks first, as blocking's opposite should: the member's
          posts come straight back into the feed. */}
      <Sheet
        open={!!pending}
        onClose={() => { if (!busy) setPending(null); }}
        title={t('settings.blocked.confirmTitle', { defaultValue: 'Unblock this member?' })}
      >
        {pending && (
          <div className="space-y-5">
            <div>
              <p className="text-ui font-medium text-mystic-100">{label(pending)}</p>
              <p className="mt-1 text-meta text-mystic-400 keep-phrases">
                {t('settings.blocked.confirmBody', { defaultValue: 'You’ll see their posts and comments in Community again.' })}
              </p>
            </div>
            <div className="space-y-3">
              <Button variant="gold" fullWidth onClick={() => void confirmUnblock()} loading={busy} disabled={busy}>
                {t('settings.blocked.confirmAction', { defaultValue: 'Unblock' })}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setPending(null)} disabled={busy}>
                {tc('actions.cancel', { defaultValue: 'Cancel' })}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
