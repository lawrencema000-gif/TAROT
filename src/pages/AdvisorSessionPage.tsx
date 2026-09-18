import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Clock, Star, X, Play, Square as StopIcon, Users } from 'lucide-react';
import { Card, Button, PageHeader, Page, Badge, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { advisorSessions } from '../dal';
import type { AdvisorSession, SessionMessage } from '../dal/advisorSessions';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { VoiceStrip } from '../components/voice/VoiceStrip';

/**
 * In-session chat room backed by Supabase Realtime.
 *
 * States handled:
 *   - scheduled: shows countdown, "Start" button, cancel option.
 *   - active:    renders the chat transcript + composer. Either party
 *                can tap "End session".
 *   - completed: read-only transcript + rating prompt (client only).
 *   - cancelled: notice + refund message.
 *
 * Realtime: subscribes to session_messages inserts filtered by session_id.
 * Works for both participants. RLS on the table ensures outsiders never
 * get the payload.
 */

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
}

export function AdvisorSessionPage() {
  const { t } = useT('app');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const voiceEnabled = useFeatureFlag('advisor-voice');
  const [session, setSession] = useState<AdvisorSession | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [sessionRes, messagesRes] = await Promise.all([
      advisorSessions.fetchSession(id),
      advisorSessions.fetchMessages(id),
    ]);
    if (sessionRes.ok && sessionRes.data) setSession(sessionRes.data);
    if (messagesRes.ok) setMessages(messagesRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const unsubscribe = advisorSessions.subscribeToMessages(id, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsubscribe;
  }, [id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStart = async () => {
    if (!id) return;
    const res = await advisorSessions.startSession(id);
    if (res.ok) {
      toast(t('advisorSession.started', { defaultValue: 'Session started' }), 'success');
      load();
    } else {
      toast(res.error, 'error');
    }
  };

  const handleEnd = async () => {
    if (!id) return;
    const res = await advisorSessions.endSession(id);
    if (res.ok) {
      toast(t('advisorSession.ended', { defaultValue: 'Session ended' }), 'success');
      load();
    } else {
      toast(res.error, 'error');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    const res = await advisorSessions.cancelSession(id);
    if (res.ok) {
      toast(
        t('advisorSession.cancelledToast', {
          defaultValue: 'Cancelled. {{n}} Moonstones refunded.',
          n: res.data.refunded,
        }),
        'success',
      );
      navigate('/advisors');
    } else {
      toast(res.error, 'error');
    }
  };

  const handleSend = async () => {
    if (!id || !user || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');
    const res = await advisorSessions.sendMessage(id, user.id, text);
    setSending(false);
    if (!res.ok) {
      toast(t('advisorSession.sendFailed', { defaultValue: 'Could not send' }), 'error');
      setDraft(text);
      return;
    }
    // Optimistic append (realtime will also push; dedup handles it)
    setMessages((prev) =>
      prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data],
    );
  };

  const handleSubmitRating = async () => {
    if (!id || rating === 0) return;
    const res = await advisorSessions.submitRating(id, rating, review.trim() || undefined);
    if (res.ok) {
      setRatingSubmitted(true);
      toast(t('advisorSession.ratingThanks', { defaultValue: 'Thanks for the feedback' }), 'success');
    } else {
      toast(res.error, 'error');
    }
  };

  if (loading) return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;
  if (!session) {
    return (
      <Card padding="lg">
        <p className="text-sm text-mystic-400">
          {t('advisorSession.notFound', { defaultValue: 'Session not found.' })}
        </p>
      </Card>
    );
  }

  const isClient = user?.id === session.clientUserId;

  return (
    <Page spacing="sm">
      <PageHeader
        icon={<Users />}
        title={t('advisorSession.title', { defaultValue: 'Session' })}
        subtitle={
          <>
            {new Date(session.scheduledAt).toLocaleString()}
            {session.topic && (
              <span className="block text-mystic-300 italic mt-1">"{session.topic}"</span>
            )}
          </>
        }
        onBack={() => navigate('/advisors')}
        backLabel={t('advisorSession.back', { defaultValue: 'Back to advisors' }) as string}
        action={
          <div className="flex items-center gap-2">
            <Badge
              tone={
                session.state === 'active' ? 'teal'
                : session.state === 'scheduled' ? 'blue'
                : 'neutral'
              }
              pulse={session.state === 'active'}
            >
              {session.state}
            </Badge>
            <span className="text-xs text-mystic-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.durationMinutes}m
            </span>
          </div>
        }
      />

      {session.state === 'scheduled' && (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-mystic-400 mb-3">
            {minutesUntil(session.scheduledAt) > 0
              ? t('advisorSession.startsIn', {
                  defaultValue: 'Starts in {{n}} minutes. Start any time within 5 minutes of the scheduled time.',
                  n: minutesUntil(session.scheduledAt),
                })
              : t('advisorSession.readyToStart', { defaultValue: 'Ready when you are.' })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={handleCancel} >
              <X className="w-4 h-4 mr-1" />
              {t('advisorSession.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button variant="gold" fullWidth onClick={handleStart} >
              <Play className="w-4 h-4 mr-1" />
              {t('advisorSession.start', { defaultValue: 'Start session' })}
            </Button>
          </div>
        </Card>
      )}

      {session.state === 'cancelled' && (
        <Card padding="lg">
          <p className="text-sm text-mystic-400">
            {t('advisorSession.cancelled', { defaultValue: 'This session was cancelled.' })}
          </p>
        </Card>
      )}

      {session.state === 'active' && id && (
        <VoiceStrip roomName={`advisor-session:${id}`} enabled={voiceEnabled} />
      )}

      {(session.state === 'active' || session.state === 'completed') && (
        <Card padding="md">
          <div
            ref={transcriptRef}
            className="max-h-[55vh] overflow-y-auto space-y-2 mb-3 pr-1"
          >
            {messages.length === 0 && (
              <p className="text-xs text-mystic-500 italic text-center py-8">
                {t('advisorSession.noMessages', { defaultValue: 'Say hi to get started.' })}
              </p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    mine
                      ? 'bg-gold/15 text-mystic-100 border border-gold/30'
                      : 'bg-mystic-800/50 text-mystic-200 border border-mystic-700/40'
                  }`}>
                    <p className="leading-relaxed">{m.content}</p>
                    <p className="text-[10px] text-mystic-500 mt-1">{formatTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {session.state === 'active' && (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('advisorSession.composerPlaceholder', { defaultValue: 'Write a message…' })}
                  maxLength={3000}
                  className="flex-1 bg-mystic-800/50 border border-mystic-700/50 rounded-xl px-3 py-2 text-mystic-100 text-sm placeholder-mystic-600 focus:outline-none focus:border-gold/40"
                />
                <Button size="sm" variant="primary" onClick={handleSend} disabled={sending || !draft.trim()} className=" px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" onClick={handleEnd}>
                  <StopIcon className="w-3 h-3 mr-1" />
                  {t('advisorSession.end', { defaultValue: 'End session' })}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {session.state === 'completed' && isClient && !ratingSubmitted && session.rating === null && (
        <Card padding="lg">
          <h3 className="text-sm font-medium text-gold tracking-wide mb-3">
            {t('advisorSession.rateTitle', { defaultValue: 'How was it?' })}
          </h3>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`p-1 ${n <= rating ? 'text-gold' : 'text-mystic-600'}`}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
              >
                <Star className={`w-6 h-6 ${n <= rating ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t('advisorSession.reviewPlaceholder', { defaultValue: 'Anything to share? (optional)' })}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40 mb-3"
          />
          <Button variant="primary" fullWidth onClick={handleSubmitRating} disabled={rating === 0}>
            {t('advisorSession.submitRating', { defaultValue: 'Submit rating' })}
          </Button>
        </Card>
      )}
    </Page>
  );
}

export default AdvisorSessionPage;
