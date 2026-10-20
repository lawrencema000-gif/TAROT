import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Clock, Users, CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge, Page, PageHeader, EmptyState, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Live rooms — scheduled gatherings, listed with a seat to save.
 *
 * What ships today is a list and an RSVP: hosts schedule a room in the
 * admin dashboard, members save a seat, and the room page opens at its
 * scheduled time. Voice (LiveKit) sits behind its own flag and is not
 * promised here — the copy describes the list, not a roadmap.
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
      toast(t('liveRooms.rsvpCancelled', { defaultValue: 'Seat released — you can save it again any time.' }), 'info');
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
          defaultValue: 'Your seat is saved. The room opens here at {{time}}.',
          time: room ? new Date(room.scheduled_at).toLocaleString() : '',
        }),
        'success',
      );
    }
  };

  return (
    <Page spacing="md">
      <PageHeader
        icon={<Mic />}
        title={t('liveRooms.title', { defaultValue: 'Live rooms' })}
        subtitle={t('liveRooms.intro', {
          defaultValue:
            'Scheduled gatherings — full moon circles, Mercury retrograde debriefs, live tarot pulls. Save a seat and the room opens here at its scheduled time.',
        })}
      />

      {loading && (
        <div className="py-12 text-center text-mystic-500 text-ui">
          {t('common:actions.loading', { defaultValue: 'Loading…' })}
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <EmptyState
          icon={<Mic />}
          title={t('liveRooms.empty', { defaultValue: 'Nothing is scheduled right now' })}
          description={t('liveRooms.emptyBody', { defaultValue: 'New rooms appear here as hosts add them.' })}
        />
      )}

      {!loading &&
        rooms.map((room) => {
          const attending = rsvpSet.has(room.id);
          const when = new Date(room.scheduled_at);
          const isLive = room.state === 'live';
          return (
            <Card
              key={room.id}
              padding="lg"
              className={isLive ? 'border-gold/40' : ''}
              interactive
              onClick={() => navigate(`/live-rooms/${room.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="heading-display-md text-mystic-100">{room.title}</h3>
                  <p className="text-meta text-mystic-400 mt-0.5 flex items-center gap-1 tabular-nums">
                    <Clock className="w-3 h-3" aria-hidden />
                    {when.toLocaleString()} · {room.duration_minutes}m
                  </p>
                </div>
                {isLive && (
                  <Badge tone="gold" pulse>
                    {t('liveRooms.liveBadge', { defaultValue: 'Live' })}
                  </Badge>
                )}
              </div>
              {room.description && (
                <p className="text-ui text-mystic-300 leading-relaxed mb-3">{room.description}</p>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-meta text-mystic-500 flex items-center gap-1 tabular-nums">
                  <Users className="w-3 h-3" aria-hidden />
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
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                        {t('liveRooms.rsvpd', { defaultValue: 'You’re in' })}
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-3.5 h-3.5" aria-hidden />
                        {t('liveRooms.rsvp', { defaultValue: 'Save my seat' })}
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-meta text-mystic-500 italic">
                    {t('liveRooms.signInToRsvp', { defaultValue: 'Sign in to save a seat' })}
                  </p>
                )}
              </div>
            </Card>
          );
        })}

      {!loading && rooms.length > 0 && (
        <p className="text-caption text-center text-mystic-500">
          {t('liveRooms.footer', {
            defaultValue: 'A saved seat is a reminder, not a ticket — rooms are free to join at their scheduled time.',
          })}
        </p>
      )}
    </Page>
  );
}

export default LiveRoomsPage;
