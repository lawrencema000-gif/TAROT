import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Clock, Users, Heart, Play, Lock, Sparkles } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { supabase } from '../lib/supabase';
import { VoiceStrip } from '../components/voice/VoiceStrip';

/**
 * Single live room view. Shows the room meta, a voice join strip (behind
 * the live-rooms-voice flag), listener count from RSVPs, and an inline
 * tip button when a user wants to support the host.
 */

interface LiveRoom {
  id: string;
  host_user_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  state: 'scheduled' | 'live' | 'completed' | 'cancelled';
  recording_url: string | null;
  replay_price_moonstones: number | null;
  replay_duration_seconds: number | null;
}

const TIP_AMOUNTS = [5, 10, 25, 50, 100];

export function LiveRoomPage() {
  const { t } = useT('app');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const voiceEnabled = useFeatureFlag('live-rooms-voice');

  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpd, setRsvpd] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [tipping, setTipping] = useState<number | null>(null);
  const [replayUnlocked, setReplayUnlocked] = useState(false);
  const [unlockingReplay, setUnlockingReplay] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: r } = await supabase.from('live_rooms').select('*').eq('id', id).maybeSingle();
    if (r) setRoom(r as LiveRoom);

    if (user) {
      const { data: rsvp } = await supabase
        .from('live_room_rsvps')
        .select('user_id')
        .eq('room_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      setRsvpd(!!rsvp);
    }

    const { count } = await supabase
      .from('live_room_rsvps')
      .select('user_id', { count: 'exact', head: true })
      .eq('room_id', id);
    setListenerCount(count ?? 0);

    if (user) {
      const { data: unlock } = await supabase
        .from('live_room_replay_unlocks')
        .select('source')
        .eq('room_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      setReplayUnlocked(!!unlock);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const toggleRsvp = async () => {
    if (!id || !user) return;
    if (rsvpd) {
      const { error } = await supabase.from('live_room_rsvps').delete().eq('room_id', id).eq('user_id', user.id);
      if (error) {
        toast(error.message, 'error');
        return;
      }
      setRsvpd(false);
      setListenerCount((n) => Math.max(0, n - 1));
    } else {
      const { error } = await supabase.from('live_room_rsvps').insert({ room_id: id, user_id: user.id });
      if (error) {
        toast(error.message, 'error');
        return;
      }
      setRsvpd(true);
      setListenerCount((n) => n + 1);
    }
  };

  const unlockReplay = async () => {
    if (!id) return;
    setUnlockingReplay(true);
    const { error } = await supabase.rpc('live_room_replay_unlock_moonstones', { p_room_id: id });
    setUnlockingReplay(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('insufficient')) {
        toast(t('liveRoom.replayInsufficient', { defaultValue: 'Not enough Moonstones to unlock.' }), 'error');
      } else {
        toast(error.message, 'error');
      }
      return;
    }
    setReplayUnlocked(true);
    toast(t('liveRoom.replayUnlocked', { defaultValue: 'Replay unlocked' }), 'success');
  };

  const sendTip = async (amount: number) => {
    if (!id) return;
    setTipping(amount);
    const { error } = await supabase.rpc('live_room_tip', { p_room_id: id, p_moonstones: amount, p_note: null });
    setTipping(null);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(
      t('liveRoom.tipSent', {
        defaultValue: 'Sent {{n}} Moonstones to the host.',
        n: amount,
      }),
      'success',
    );
  };

  if (loading) return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;
  if (!room) {
    return (
      <Card padding="lg">
        <p className="text-sm text-mystic-400">
          {t('liveRoom.notFound', { defaultValue: 'Room not found.' })}
        </p>
      </Card>
    );
  }

  const isLive = room.state === 'live';
  const canJoinVoice = isLive && rsvpd;
  const isHost = user?.id === room.host_user_id;

  return (
    <div className="space-y-4 pb-6">
      <button onClick={() => navigate('/live-rooms')} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" />
        {t('liveRoom.back', { defaultValue: 'All rooms' })}
      </button>

      <Card padding="lg" variant="glow">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-4 h-4 text-gold" />
              <h1 className="font-display text-xl text-mystic-100">{room.title}</h1>
            </div>
            <p className="text-xs text-mystic-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(room.scheduled_at).toLocaleString()} · {room.duration_minutes}m
            </p>
          </div>
          {isLive && (
            <span className="text-[10px] px-2 py-0.5 bg-gold/20 text-gold rounded-full uppercase tracking-wider animate-pulse">
              Live
            </span>
          )}
        </div>
        {room.description && (
          <p className="text-sm text-mystic-300 leading-relaxed mt-3">{room.description}</p>
        )}
      </Card>

      <Card padding="md">
        <div className="flex items-center justify-between">
          <p className="text-xs text-mystic-400 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {t('liveRoom.listeners', { defaultValue: '{{n}} RSVPd / cap {{cap}}', n: listenerCount, cap: room.capacity })}
          </p>
          {user && !isHost && (
            <Button variant={rsvpd ? 'outline' : 'primary'} size="sm" onClick={toggleRsvp}>
              {rsvpd
                ? t('liveRoom.rsvpd', { defaultValue: 'You\'re in' })
                : t('liveRoom.rsvp', { defaultValue: 'RSVP' })}
            </Button>
          )}
        </div>
      </Card>

      {canJoinVoice ? (
        <VoiceStrip roomName={`live-room:${id}`} enabled={voiceEnabled} />
      ) : !isLive ? (
        <Card padding="md" className="bg-mystic-800/30">
          <p className="text-xs text-mystic-500 text-center italic">
            {t('liveRoom.notLiveYet', { defaultValue: 'Voice opens when the host starts the room.' })}
          </p>
        </Card>
      ) : !rsvpd ? (
        <Card padding="md" className="bg-mystic-800/30">
          <p className="text-xs text-mystic-500 text-center italic">
            {t('liveRoom.rsvpToJoin', { defaultValue: 'RSVP first to join voice.' })}
          </p>
        </Card>
      ) : null}

      {/* Replay (for completed rooms with a recording) */}
      {room.state === 'completed' && room.recording_url && (
        <Card padding="md" className={replayUnlocked ? 'border-emerald-400/30' : ''}>
          <div className="flex items-center gap-2 mb-3">
            {replayUnlocked ? <Play className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-mystic-400" />}
            <p className="text-xs font-medium tracking-wide uppercase text-mystic-300">
              {t('liveRoom.replayHeading', { defaultValue: 'Replay' })}
            </p>
          </div>
          {replayUnlocked ? (
            <audio controls src={room.recording_url} className="w-full" />
          ) : room.replay_price_moonstones != null ? (
            <div>
              <p className="text-sm text-mystic-300 mb-3">
                {t('liveRoom.replayLocked', {
                  defaultValue: 'Listen anytime for {{n}} Moonstones.',
                  n: room.replay_price_moonstones,
                })}
              </p>
              {user ? (
                <Button variant="gold" onClick={unlockReplay} disabled={unlockingReplay} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {unlockingReplay
                    ? t('liveRoom.unlocking', { defaultValue: 'Unlocking…' })
                    : t('liveRoom.unlockReplay', {
                        defaultValue: 'Unlock replay — {{n}} Moonstones',
                        n: room.replay_price_moonstones,
                      })}
                </Button>
              ) : (
                <p className="text-xs text-mystic-500 italic">{t('liveRoom.signInToUnlock', { defaultValue: 'Sign in to unlock the replay' })}</p>
              )}
            </div>
          ) : (
            <Button variant="primary" onClick={unlockReplay} disabled={unlockingReplay || !user} className="w-full">
              <Play className="w-4 h-4 mr-2" />
              {t('liveRoom.listenFree', { defaultValue: 'Listen — free' })}
            </Button>
          )}
        </Card>
      )}

      {isLive && !isHost && user && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-pink-400" />
            <p className="text-xs font-medium text-pink-400 tracking-wide uppercase">
              {t('liveRoom.tipHost', { defaultValue: 'Tip the host' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIP_AMOUNTS.map((n) => (
              <Button
                key={n}
                variant="outline"
                size="sm"
                onClick={() => sendTip(n)}
                disabled={tipping !== null}
              >
                {tipping === n ? '…' : `✨ ${n}`}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default LiveRoomPage;
