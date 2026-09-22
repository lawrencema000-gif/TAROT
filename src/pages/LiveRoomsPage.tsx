import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Clock, Users, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge, Page, PageHeader, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Live rooms — scheduled audio events (MVP listing + RSVP).
 *
 * Actual voice (LiveKit) is gated behind a separate flag + token service
 * not yet wired. This page surfaces the upcoming roster and lets users
 * reserve a seat so we know who to notify when voice goes live. Hosts are
 * hand-scheduled in the admin dashboard in the interim.
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
}

export function LiveRoomsPage() {
  const { t } = useT('app');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpSet, setRsvpSet] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('live_rooms')
      .select('*')
      .in('state', ['scheduled', 'live'])
      .order('scheduled_at', { ascending: true });
    if (!error && data) setRooms(data as LiveRoom[]);

    if (user) {
      const { data: rsvps } = await supabase
        .from('live_room_rsvps')
        .select('room_id')
        .eq('user_id', user.id);
      if (rsvps) setRsvpSet(new Set(rsvps.map((r) => r.room_id as string)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleRsvp = async (roomId: string) => {
    if (!user) return;
    const room = rooms.find((r) => r.id === roomId);
    const attending = rsvpSet.has(roomId);
    if (attending) {
      const { error } = await supabase
        .from('live_room_rsvps')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
      if (error) {
        console.error('[LiveRooms] RSVP cancel failed:', error.message);
        toast(t('liveRooms.toasts.cancelFailed', { defaultValue: 'Couldn’t release your seat — check your connection and try again.' }), 'error');
        return;
      }
      setRsvpSet((prev) => {
        const n = new Set(prev); n.delete(roomId); return n;
      });
      toast(t('liveRooms.rsvpCancelled', { defaultValue: 'Seat released — you can RSVP again any time.' }), 'info');
    } else {
      const { error } = await supabase
        .from('live_room_rsvps')
        .insert({ room_id: roomId, user_id: user.id });
      if (error) {
        console.error('[LiveRooms] RSVP failed:', error.message);
        toast(t('liveRooms.toasts.rsvpFailed', { defaultValue: 'Couldn’t save your seat — check your connection and try again.' }), 'error');
        return;
      }
      setRsvpSet((prev) => new Set(prev).add(roomId));
      toast(
        t('liveRooms.rsvpConfirmed', {
          defaultValue: 'You’re on the list. Check back here — the room opens at {{time}}.',
          time: room ? new Date(room.scheduled_at).toLocaleString() : '',
        }),
        'success',
      );
    }
  };

  if (loading) return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;

  return (
    <Page spacing="md">
      <PageHeader
        icon={<Mic />}
        title={t('liveRooms.title', { defaultValue: 'Live rooms' })}
      />

      <Card padding="lg" variant="glow">
        <p className="text-sm text-mystic-300 leading-relaxed">
          {t('liveRooms.intro', {
            defaultValue:
              'Scheduled live gatherings — full moon circles, Mercury retrograde debriefs, live tarot pulls. Audio-first, soon. RSVP to reserve your seat.',
          })}
        </p>
      </Card>

      {rooms.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-mystic-400 italic">
            {t('liveRooms.empty', { defaultValue: 'No live rooms on the calendar yet — check back soon.' })}
          </p>
        </Card>
      ) : (
        rooms.map((room) => {
          const attending = rsvpSet.has(room.id);
          const when = new Date(room.scheduled_at);
          const isLive = room.state === 'live';
          return (
            <Card key={room.id} padding="lg" className={isLive ? 'border-gold/40 cursor-pointer' : 'cursor-pointer'}>
              <div onClick={() => navigate(`/live-rooms/${room.id}`)} className="cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-display text-lg text-mystic-100">{room.title}</h3>
                  <p className="text-xs text-mystic-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {when.toLocaleString()} · {room.duration_minutes}m
                  </p>
                </div>
                {isLive && (
                  <Badge tone="gold" pulse>
                    Live
                  </Badge>
                )}
              </div>
              {room.description && (
                <p className="text-sm text-mystic-300 leading-relaxed mb-3">{room.description}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-mystic-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {t('liveRooms.capacity', { defaultValue: 'up to {{n}} listeners', n: room.capacity })}
                </p>
                {user ? (
                  <Button
                    variant={attending ? 'outline' : 'primary'}
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); toggleRsvp(room.id); }}
                  >
                    {attending ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {t('liveRooms.rsvpd', { defaultValue: 'You\'re in' })}
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-3 h-3 mr-1" />
                        {t('liveRooms.rsvp', { defaultValue: 'Save my seat' })}
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-xs text-mystic-500 italic">
                    {t('liveRooms.signInToRsvp', { defaultValue: 'Sign in to save a seat' })}
                  </p>
                )}
              </div>
              </div>
            </Card>
          );
        })
      )}

      <p className="text-[10px] text-center text-mystic-600 italic">
        {t('liveRooms.voiceComingSoon', {
          defaultValue: 'Audio is rolling out gradually. Save a seat, then check back here — each room opens at its scheduled time.',
        })}
      </p>
    </Page>
  );
}

export default LiveRoomsPage;
