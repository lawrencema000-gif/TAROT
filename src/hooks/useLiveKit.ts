import { useEffect, useRef, useState, useCallback } from 'react';
// Types are imported for compile-time only — the runtime SDK is loaded lazily
// inside connect() so the 60+ KB of livekit-client never ships in the main
// bundle for users who never open a voice room.
import type { Room as LKRoom, Track as LKTrack, RemoteParticipant, LocalParticipant } from 'livekit-client';

type AnyParticipant = LocalParticipant | RemoteParticipant;
import { supabase } from '../lib/supabase';

/**
 * Lightweight LiveKit voice hook.
 *
 * Usage:
 *   const { state, participants, connect, disconnect, toggleMic, micMuted, canPublish }
 *     = useLiveKit({ roomName });
 *
 * The hook stays disconnected until `connect()` is called so the room page
 * doesn't open a mic/websocket just from mounting. Disconnects automatically
 * on unmount.
 *
 * Tokens are minted server-side via the livekit-token edge function. If the
 * server returns 503 LIVEKIT_NOT_CONFIGURED, the hook surfaces that as
 * `state = 'unavailable'` so the UI can fall back gracefully.
 */

export type LiveKitState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'unavailable';

export interface ParticipantInfo {
  identity: string;
  name: string | null;
  isSpeaking: boolean;
  isLocal: boolean;
  isMuted: boolean;
}

export function useLiveKit({ roomName }: { roomName: string | null }) {
  const roomRef = useRef<LKRoom | null>(null);
  const [state, setState] = useState<LiveKitState>('idle');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const collectParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return [];
    const list: ParticipantInfo[] = [];
    const makeInfo = (p: AnyParticipant, isLocal: boolean): ParticipantInfo => ({
      identity: p.identity,
      name: p.name || null,
      isSpeaking: p.isSpeaking,
      isLocal,
      isMuted: !p.isMicrophoneEnabled,
    });
    list.push(makeInfo(room.localParticipant, true));
    for (const rp of room.remoteParticipants.values()) list.push(makeInfo(rp, false));
    return list;
  }, []);

  const refreshParticipants = useCallback(() => {
    setParticipants(collectParticipants());
  }, [collectParticipants]);

  const connect = useCallback(async () => {
    if (!roomName) return;
    if (state === 'connecting' || state === 'connected') return;
    setState('connecting');
    setErrorMessage(null);

    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: { room: roomName },
    });
    if (error) {
      const anyErr = error as { context?: { status?: number }; message?: string };
      if (anyErr?.context?.status === 503) {
        setState('unavailable');
      } else {
        setErrorMessage(anyErr?.message ?? 'Could not get token');
        setState('error');
      }
      return;
    }
    const payload = (data?.data ?? data) as { token?: string; wsUrl?: string; canPublish?: boolean } | null;
    if (!payload?.token || !payload?.wsUrl) {
      setState('error');
      setErrorMessage('No token');
      return;
    }
    setCanPublish(!!payload.canPublish);

    // Lazy-load the SDK so it only enters the bundle when a user actually
    // tries to join voice.
    const { Room, RoomEvent } = await import('livekit-client');

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.ParticipantConnected, refreshParticipants);
    room.on(RoomEvent.ParticipantDisconnected, refreshParticipants);
    room.on(RoomEvent.ActiveSpeakersChanged, refreshParticipants);
    room.on(RoomEvent.TrackMuted, refreshParticipants);
    room.on(RoomEvent.TrackUnmuted, refreshParticipants);
    room.on(RoomEvent.Disconnected, () => setState('disconnected'));

    try {
      await room.connect(payload.wsUrl, payload.token);
      setState('connected');
      refreshParticipants();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Connect failed');
      setState('error');
    }
  }, [roomName, state, refreshParticipants]);

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }
    setState('disconnected');
    setParticipants([]);
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !canPublish) return;
    const isOn = room.localParticipant.isMicrophoneEnabled;
    if (isOn) {
      await room.localParticipant.setMicrophoneEnabled(false);
      setMicMuted(true);
    } else {
      // Request permission + turn on mic
      await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true });
      setMicMuted(false);
    }
    refreshParticipants();
  }, [canPublish, refreshParticipants]);

  // Subscribe/play remote audio tracks automatically. livekit-client doesn't
  // attach tracks to DOM on its own for audio — we need to call .attach() on
  // each TrackSubscribed for audio to play.
  useEffect(() => {
    const room = roomRef.current;
    if (!room || state !== 'connected') return;
    let cancelled = false;
    let offSubscribed: (() => void) | null = null;
    let offUnsubscribed: (() => void) | null = null;

    const handleSubscribed = (track: LKTrack) => {
      if (track.kind === 'audio') {
        const el = track.attach() as HTMLAudioElement;
        el.style.display = 'none';
        document.body.appendChild(el);
      }
    };
    const handleUnsubscribed = (track: LKTrack) => {
      if (track.kind === 'audio') {
        track.detach().forEach((el: HTMLMediaElement) => el.remove());
      }
    };

    import('livekit-client').then(({ RoomEvent }) => {
      if (cancelled) return;
      for (const rp of room.remoteParticipants.values()) {
        rp.audioTrackPublications.forEach((pub) => {
          if (pub.track) handleSubscribed(pub.track);
        });
      }
      room.on(RoomEvent.TrackSubscribed, handleSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
      offSubscribed = () => room.off(RoomEvent.TrackSubscribed, handleSubscribed);
      offUnsubscribed = () => room.off(RoomEvent.TrackUnsubscribed, handleUnsubscribed);
    });

    return () => {
      cancelled = true;
      offSubscribed?.();
      offUnsubscribed?.();
    };
  }, [state]);

  // Auto-disconnect on unmount
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) room.disconnect();
    };
  }, []);

  return {
    state,
    participants,
    canPublish,
    micMuted,
    errorMessage,
    connect,
    disconnect,
    toggleMic,
  };
}
