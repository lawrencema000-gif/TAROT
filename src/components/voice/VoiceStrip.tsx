import { Mic, MicOff, PhoneOff, Phone, AudioLines } from 'lucide-react';
import { Button } from '../ui';
import { useT } from '../../i18n/useT';
import { useLiveKit, type LiveKitState } from '../../hooks/useLiveKit';

interface VoiceStripProps {
  /** LiveKit room identifier, e.g. "advisor-session:<uuid>" or "live-room:<uuid>" */
  roomName: string | null;
  /** Show when enabled — parent can tie this to a feature flag. */
  enabled: boolean;
}

const STATE_COPY: Record<LiveKitState, { label: string; tone: string }> = {
  idle:        { label: '',                 tone: 'text-mystic-500' },
  connecting:  { label: 'Connecting…',      tone: 'text-cosmic-blue' },
  connected:   { label: 'Voice on',         tone: 'text-emerald-400' },
  disconnected:{ label: 'Voice ended',      tone: 'text-mystic-500' },
  error:       { label: 'Voice error',      tone: 'text-pink-400' },
  unavailable: { label: 'Voice coming soon',tone: 'text-mystic-500' },
};

/**
 * Small strip that connects/disconnects a voice room and shows mic toggle +
 * live participants. Intended to sit inside AdvisorSessionPage or LiveRoomsPage.
 */
export function VoiceStrip({ roomName, enabled }: VoiceStripProps) {
  const { t } = useT('app');
  const { state, participants, canPublish, micMuted, connect, disconnect, toggleMic } =
    useLiveKit({ roomName: enabled ? roomName : null });

  if (!enabled) return null;

  const copy = STATE_COPY[state];
  const isConnected = state === 'connected';
  const isConnecting = state === 'connecting';

  return (
    <div className="rounded-xl border border-mystic-800/70 bg-mystic-900/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AudioLines className={`w-4 h-4 flex-shrink-0 ${copy.tone}`} />
          <p className={`text-xs truncate ${copy.tone}`}>
            {copy.label ? t(`voice.state.${state}`, { defaultValue: copy.label }) : t('voice.notConnected', { defaultValue: 'Voice off' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && canPublish && (
            <button
              onClick={toggleMic}
              aria-label={micMuted ? 'Unmute' : 'Mute'}
              className={`p-2 rounded-full transition-colors ${
                micMuted
                  ? 'bg-mystic-800 text-mystic-400 hover:bg-mystic-700'
                  : 'bg-emerald-400/20 text-emerald-400'
              }`}
            >
              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          {!isConnected ? (
            <Button
              variant="gold"
              size="sm"
              onClick={connect}
              disabled={isConnecting || state === 'unavailable' || !roomName}
              className="min-h-[36px]"
            >
              <Phone className="w-3 h-3 mr-1" />
              {isConnecting
                ? t('voice.joining', { defaultValue: 'Joining…' })
                : t('voice.join', { defaultValue: 'Join voice' })}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={disconnect} className="min-h-[36px]">
              <PhoneOff className="w-3 h-3 mr-1" />
              {t('voice.leave', { defaultValue: 'Leave' })}
            </Button>
          )}
        </div>
      </div>

      {isConnected && participants.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-mystic-800/60">
          {participants.map((p) => (
            <span
              key={p.identity}
              className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                p.isSpeaking
                  ? 'bg-emerald-400/20 text-emerald-400'
                  : 'bg-mystic-800 text-mystic-400'
              }`}
            >
              {p.isMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
              {p.name || p.identity.slice(0, 6)}
              {p.isLocal ? ' (you)' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
