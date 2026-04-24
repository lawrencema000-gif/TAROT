import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, RefreshCw, CheckCircle2, Clock, Flag } from 'lucide-react';
import { Button, toast } from '../ui';
import { supabase } from '../../lib/supabase';

/**
 * Moderation admin panel — surfaces the audit tables the community-moderate
 * edge function writes to:
 *   - moderation_events: every non-allow verdict (review + block)
 *   - crisis_flags: every self-harm/suicide keyword detection, with a
 *     short excerpt (≤500 chars) and a one-click acknowledge.
 *
 * Admin-only via RLS. Both tables reject reads from non-admins, so if this
 * component renders in an unauthorized context, the table simply comes back
 * empty rather than leaking.
 */

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
  block: 'bg-pink-400/10 text-pink-400 border-pink-400/30',
};

export function ModerationPanel() {
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [crisisFlags, setCrisisFlags] = useState<CrisisFlag[]>([]);
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

    const [eventsRes, crisisRes] = await Promise.all([
      eventsQuery,
      supabase
        .from('crisis_flags')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (eventsRes.error) {
      toast(`Moderation events: ${eventsRes.error.message}`, 'error');
    } else {
      setEvents((eventsRes.data ?? []) as ModerationEvent[]);
    }
    if (crisisRes.error) {
      toast(`Crisis flags: ${crisisRes.error.message}`, 'error');
    } else {
      setCrisisFlags((crisisRes.data ?? []) as CrisisFlag[]);
    }
    setLoading(false);
  }, [showReviewed]);

  useEffect(() => {
    if (expanded) load();
  }, [expanded, load]);

  const markReviewed = async (id: string) => {
    const { error } = await supabase
      .from('moderation_events')
      .update({ reviewed: true, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast(error.message, 'error');
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
      toast(error.message, 'error');
      return;
    }
    setCrisisFlags((prev) => prev.filter((c) => c.id !== id));
    toast('Acknowledged', 'success');
  };

  const pendingCount = events.length;
  const crisisCount = crisisFlags.length;

  return (
    <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-mystic-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cosmic-blue" />
          <div>
            <h3 className="font-medium text-mystic-100">Moderation Queue</h3>
            <p className="text-xs text-mystic-500">
              {crisisCount > 0 && (
                <span className="text-pink-400 font-medium">
                  {crisisCount} crisis flag{crisisCount !== 1 ? 's' : ''} · {' '}
                </span>
              )}
              {pendingCount} pending review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {crisisCount > 0 && (
            <span className="px-2 py-0.5 bg-pink-400/15 text-pink-400 text-xs rounded-full">
              {crisisCount} !
            </span>
          )}
          <div className="text-mystic-500 text-xs">{expanded ? '▲' : '▼'}</div>
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-mystic-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-mystic-400 cursor-pointer">
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
              <h4 className="text-xs uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Crisis flags — priority review
              </h4>
              {crisisFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="p-3 border border-pink-400/30 bg-pink-400/5 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase text-pink-400 tracking-wider">
                      {flag.surface}
                    </span>
                    <span className="text-[10px] text-mystic-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(flag.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-mystic-200 leading-relaxed mb-2 italic">
                    "{flag.content_excerpt}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-mystic-500 font-mono">
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

          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-wider text-mystic-400 flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              Moderation events
            </h4>
            {events.length === 0 && !loading && (
              <p className="text-xs text-mystic-500 italic">No events in queue.</p>
            )}
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-3 border rounded-lg ${VERDICT_STYLES[event.verdict]}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider">
                      {event.verdict}
                    </span>
                    {event.crisis_flagged && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-pink-400/20 text-pink-400 rounded">
                        crisis
                      </span>
                    )}
                    <span className="text-[10px] text-mystic-500">{event.surface}</span>
                  </div>
                  <span className="text-[10px] text-mystic-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {event.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] px-1.5 py-0.5 bg-mystic-800/60 text-mystic-400 rounded"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-mystic-500 font-mono">
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
