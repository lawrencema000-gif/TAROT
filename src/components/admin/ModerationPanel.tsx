import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, RefreshCw, CheckCircle2, Clock, Flag, EyeOff } from 'lucide-react';
import { Button, Badge, Tag, toast } from '../ui';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n/useT';

/**
 * Moderation admin panel — surfaces the audit tables the community-moderate
 * edge function writes to:
 *   - moderation_events: every non-allow verdict (review + block)
 *   - crisis_flags: every self-harm/suicide keyword detection, with a
 *     short excerpt (≤500 chars) and a one-click acknowledge.
 *   - flagged posts and comments (community_flagged_queue): a 'review'
 *     verdict publishes the row as 'flagged', visible to its author only,
 *     until a moderator publishes it or keeps it hidden here.
 *
 * Admin-only on the server. Both tables reject reads from non-admins, and
 * the two queue functions check public.is_admin() (20261003000014), so if
 * this component renders in an unauthorized context it gets nothing.
 */

interface FlaggedItem {
  kind: 'post' | 'comment';
  id: string;
  post_id: string | null;
  topic: string;
  content: string;
  is_anonymous: boolean;
  categories: string[] | null;
  crisis_flagged: boolean;
  created_at: string;
}

/** The queue functions arrive with 20261003000014; before that there is no queue. */
function isMissingFunction(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? '');
}

interface ModerationEvent {
  id: string;
  user_id: string | null;
  surface: 'post' | 'comment' | 'whispering-well';
  content_hash: string;
  verdict: 'allow' | 'review' | 'block';
  categories: string[];
  crisis_flagged: boolean;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
}

interface CrisisFlag {
  id: string;
  user_id: string | null;
  surface: string;
  content_excerpt: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}

const VERDICT_STYLES: Record<ModerationEvent['verdict'], string> = {
  allow: 'bg-mystic-800/40 text-mystic-400 border-mystic-700/40',
  review: 'bg-cosmic-blue/10 text-cosmic-blue border-cosmic-blue/30',
  block: 'bg-cosmic-rose/10 text-cosmic-rose border-cosmic-rose/25',
};

export function ModerationPanel() {
  const { t } = useT('app');
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [crisisFlags, setCrisisFlags] = useState<CrisisFlag[]>([]);
  const [flagged, setFlagged] = useState<FlaggedItem[]>([]);
  const [flaggedQueueExists, setFlaggedQueueExists] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReviewed, setShowReviewed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let eventsQuery = supabase
      .from('moderation_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!showReviewed) eventsQuery = eventsQuery.eq('reviewed', false);

    const [eventsRes, crisisRes, flaggedRes] = await Promise.all([
      eventsQuery,
      supabase
        .from('crisis_flags')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.rpc('community_flagged_queue'),
    ]);

    if (flaggedRes.error) {
      if (isMissingFunction(flaggedRes.error)) {
        setFlaggedQueueExists(false);
        setFlagged([]);
      } else {
        console.error('[Moderation] Flagged queue load failed:', flaggedRes.error.message);
        toast(t('admin.moderation.toasts.loadFlaggedFailed', { defaultValue: 'Couldn’t load flagged posts — tap Refresh to try again.' }), 'error');
      }
    } else {
      setFlaggedQueueExists(true);
      setFlagged((flaggedRes.data ?? []) as FlaggedItem[]);
    }

    if (eventsRes.error) {
      console.error('[Moderation] Events load failed:', eventsRes.error.message);
      toast(t('admin.moderation.toasts.loadEventsFailed', { defaultValue: 'Couldn’t load moderation events — tap Refresh to try again.' }), 'error');
    } else {
      setEvents((eventsRes.data ?? []) as ModerationEvent[]);
    }
    if (crisisRes.error) {
      console.error('[Moderation] Crisis flags load failed:', crisisRes.error.message);
      toast(t('admin.moderation.toasts.loadFlagsFailed', { defaultValue: 'Couldn’t load crisis flags — tap Refresh to try again.' }), 'error');
    } else {
      setCrisisFlags((crisisRes.data ?? []) as CrisisFlag[]);
    }
    setLoading(false);
  }, [showReviewed, t]);

  useEffect(() => {
    if (expanded) load();
  }, [expanded, load]);

  const markReviewed = async (id: string) => {
    const { error } = await supabase
      .from('moderation_events')
      .update({ reviewed: true, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[Moderation] Mark reviewed failed:', error.message);
      toast(t('admin.moderation.toasts.markReviewedFailed', { defaultValue: 'Couldn’t mark that event reviewed — refresh and try again.' }), 'error');
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast('Marked reviewed', 'success');
  };

  const acknowledgeCrisis = async (id: string) => {
    const { error } = await supabase
      .from('crisis_flags')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[Moderation] Acknowledge failed:', error.message);
      toast(t('admin.moderation.toasts.acknowledgeFailed', { defaultValue: 'Couldn’t acknowledge that flag — refresh and try again.' }), 'error');
      return;
    }
    setCrisisFlags((prev) => prev.filter((c) => c.id !== id));
    toast('Acknowledged', 'success');
  };

  // Publish → 'allowed' (everyone sees it); keep hidden → 'blocked' (its
  // author still does). The server checks is_admin() and only moves a row
  // that is still 'flagged', so two moderators cannot both decide.
  const decide = async (item: FlaggedItem, publish: boolean) => {
    setDeciding(item.id);
    const { data, error } = await supabase.rpc('community_review_flagged', {
      p_kind: item.kind,
      p_id: item.id,
      p_publish: publish,
    });
    setDeciding(null);
    if (error) {
      console.error('[Moderation] Decision failed:', error.message);
      toast(t('admin.moderation.toasts.decideFailed', { defaultValue: 'Couldn’t save that decision — refresh and try again.' }), 'error');
      return;
    }
    setFlagged((prev) => prev.filter((f) => f.id !== item.id));
    if (data === true) {
      toast(
        publish
          ? t('admin.moderation.flagged.published', { defaultValue: 'Published' })
          : t('admin.moderation.flagged.keptHidden', { defaultValue: 'Kept hidden' }),
        'success',
      );
    } else {
      toast(t('admin.moderation.flagged.alreadyDecided', { defaultValue: 'That one was already decided.' }), 'info');
    }
  };

  const pendingCount = events.length;
  const crisisCount = crisisFlags.length;

  return (
    <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-mystic-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cosmic-blue" />
          <div>
            <h3 className="font-medium text-mystic-100">Moderation Queue</h3>
            <p className="text-meta text-mystic-500">
              {crisisCount > 0 && (
                <span className="text-cosmic-rose font-medium">
                  {crisisCount} crisis flag{crisisCount !== 1 ? 's' : ''} · {' '}
                </span>
              )}
              {pendingCount} pending review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {crisisCount > 0 && (
            <Badge tone="rose">
              {crisisCount} !
            </Badge>
          )}
          <div className="text-mystic-500 text-meta">{expanded ? '▲' : '▼'}</div>
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-mystic-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-meta text-mystic-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showReviewed}
                onChange={(e) => setShowReviewed(e.target.checked)}
                className="accent-cosmic-blue"
              />
              Show reviewed
            </label>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {crisisFlags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-caption uppercase tracking-wider text-cosmic-rose flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Crisis flags — priority review
              </h4>
              {crisisFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="p-3 border border-cosmic-rose/25 bg-cosmic-rose/10 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-caption uppercase text-cosmic-rose tracking-wider">
                      {flag.surface}
                    </span>
                    <span className="text-meta text-mystic-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(flag.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-meta text-mystic-200 leading-relaxed mb-2 italic">
                    "{flag.content_excerpt}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-mystic-500 font-mono">
                      user: {flag.user_id ? flag.user_id.slice(0, 8) : '—'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeCrisis(flag.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {flaggedQueueExists && (
            <div className="space-y-2">
              <h4 className="text-caption uppercase tracking-wider text-mystic-400 flex items-center gap-1.5">
                <EyeOff className="w-3 h-3" aria-hidden />
                {t('admin.moderation.flagged.heading', { defaultValue: 'Flagged — waiting for a decision' })}
              </h4>
              <p className="text-meta text-mystic-500">
                {t('admin.moderation.flagged.intro', { defaultValue: 'Only their authors can see these until you publish them.' })}
              </p>
              {flagged.length === 0 && !loading && (
                <p className="text-meta text-mystic-500 italic">
                  {t('admin.moderation.flagged.empty', { defaultValue: 'Nothing flagged.' })}
                </p>
              )}
              {flagged.map((item) => (
                <div key={item.id} className="p-3 border border-mystic-700/50 bg-mystic-800/40 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center flex-wrap gap-2 min-w-0">
                      <span className="text-caption font-medium uppercase tracking-wider text-mystic-300">
                        {item.kind === 'post'
                          ? t('admin.moderation.flagged.post', { defaultValue: 'Post' })
                          : t('admin.moderation.flagged.comment', { defaultValue: 'Comment' })}
                      </span>
                      {item.crisis_flagged && (
                        <Badge tone="rose">{t('admin.moderation.flagged.crisis', { defaultValue: 'crisis' })}</Badge>
                      )}
                      <span className="text-meta text-mystic-500">
                        {item.topic}
                        {item.is_anonymous ? ` · ${t('admin.moderation.flagged.anonymous', { defaultValue: 'anonymous' })}` : ''}
                      </span>
                    </div>
                    <span className="shrink-0 text-meta text-mystic-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden />
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-meta text-mystic-200 leading-relaxed whitespace-pre-wrap my-2">{item.content}</p>
                  {(item.categories ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(item.categories ?? []).map((cat) => (
                        <Tag key={cat} tone="neutral">{cat}</Tag>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => decide(item, false)} disabled={deciding === item.id}>
                      {t('admin.moderation.flagged.keepHidden', { defaultValue: 'Keep hidden' })}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => decide(item, true)} disabled={deciding === item.id}>
                      {t('admin.moderation.flagged.publish', { defaultValue: 'Publish' })}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-caption uppercase tracking-wider text-mystic-400 flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              Moderation events
            </h4>
            {events.length === 0 && !loading && (
              <p className="text-meta text-mystic-500 italic">No events in queue.</p>
            )}
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-3 border rounded-lg ${VERDICT_STYLES[event.verdict]}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-medium uppercase tracking-wider">
                      {event.verdict}
                    </span>
                    {event.crisis_flagged && (
                      <Badge tone="rose">
                        crisis
                      </Badge>
                    )}
                    <span className="text-meta text-mystic-500">{event.surface}</span>
                  </div>
                  <span className="text-meta text-mystic-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {event.categories.map((cat) => (
                      <Tag key={cat} tone="neutral">
                        {cat}
                      </Tag>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-caption text-mystic-500 font-mono">
                    user: {event.user_id ? event.user_id.slice(0, 8) : '—'}
                  </span>
                  {!event.reviewed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReviewed(event.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark reviewed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
