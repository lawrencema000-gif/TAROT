import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, MessageCircle, Feather, Moon, Flower } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getZodiacSign, zodiacData } from '../utils/zodiac';

type Persona = 'sage' | 'oracle' | 'mystic' | 'priestess';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const PERSONAS: Array<{
  id: Persona;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  { id: 'sage',      icon: Sparkles,      accent: 'text-gold' },
  { id: 'oracle',    icon: Feather,       accent: 'text-cosmic-violet' },
  { id: 'mystic',    icon: Moon,          accent: 'text-cosmic-blue' },
  { id: 'priestess', icon: Flower,        accent: 'text-pink-400' },
];

const STORAGE_KEY_PREFIX = 'arcana_companion_v1_';

function loadHistory(persona: Persona): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + persona);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is Message => m && typeof m.role === 'string' && typeof m.content === 'string');
  } catch {
    return [];
  }
}

function saveHistory(persona: Persona, history: Message[]) {
  try {
    // Keep only last 40 messages to bound storage
    const trimmed = history.slice(-40);
    localStorage.setItem(STORAGE_KEY_PREFIX + persona, JSON.stringify(trimmed));
  } catch {
    // silent — localStorage full or unavailable
  }
}

export function AiCompanionPage() {
  const { t, i18n } = useT('app');
  const { profile } = useAuth();
  const [persona, setPersona] = useState<Persona>('sage');
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const DAILY_LIMIT = 20; // free tier; premium bumps to 100 in a future sprint

  // Track daily usage via localStorage
  useEffect(() => {
    const key = `arcana_companion_daily_${new Date().toISOString().slice(0, 10)}`;
    try {
      const n = parseInt(localStorage.getItem(key) || '0', 10);
      setDailyUsed(Number.isFinite(n) ? n : 0);
    } catch { /* ignore */ }
  }, []);

  // Load history for selected persona
  useEffect(() => {
    setHistory(loadHistory(persona));
  }, [persona]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, sending]);

  const incDailyUsed = useCallback(() => {
    const key = `arcana_companion_daily_${new Date().toISOString().slice(0, 10)}`;
    try {
      const next = dailyUsed + 1;
      localStorage.setItem(key, String(next));
      setDailyUsed(next);
    } catch { /* ignore */ }
  }, [dailyUsed]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    if (dailyUsed >= DAILY_LIMIT) {
      toast(t('companion.dailyLimitReached', { defaultValue: 'Daily message limit reached — come back tomorrow.' }), 'error');
      return;
    }

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: Date.now() };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput('');
    setSending(true);

    try {
      const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
      const userContext = {
        zodiacSign: zodiacSign ? zodiacData[zodiacSign].name : undefined,
        mbtiType: profile?.mbtiType,
        displayName: profile?.displayName,
        locale: i18n.language || 'en',
      };

      const { data, error } = await supabase.functions.invoke('ai-companion-chat', {
        body: {
          persona,
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userContext,
        },
      });

      if (error || !data?.reply) {
        throw new Error(error?.message || 'No reply');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply as string,
        timestamp: Date.now(),
      };
      const finalHistory = [...newHistory, assistantMsg];
      setHistory(finalHistory);
      saveHistory(persona, finalHistory);
      incDailyUsed();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast(t('companion.sendFailed', { defaultValue: 'Could not reach the companion: {{err}}', err: msg }), 'error');
      setHistory(newHistory); // keep user message so they can retry
    } finally {
      setSending(false);
    }
  };

  const clearConversation = () => {
    saveHistory(persona, []);
    setHistory([]);
  };

  const currentPersonaInfo = PERSONAS.find((p) => p.id === persona)!;
  const Icon = currentPersonaInfo.icon;

  return (
    <div className="space-y-4 pb-6 flex flex-col h-[calc(100dvh-200px)] max-h-[calc(100dvh-200px)]">
      {/* Header with persona picker */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gold" />
          <h1 className="font-display text-xl text-mystic-100">
            {t('companion.title', { defaultValue: 'Companion' })}
          </h1>
        </div>
        <button
          onClick={clearConversation}
          className="text-xs text-mystic-500 hover:text-mystic-300 px-2 py-1"
        >
          {t('companion.newConversation', { defaultValue: 'New' })}
        </button>
      </div>

      {/* Persona tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERSONAS.map((p) => {
          const PIcon = p.icon;
          const isActive = persona === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all border ${
                isActive
                  ? `${p.accent} bg-mystic-800/70 border-current/40`
                  : 'text-mystic-400 bg-mystic-800/30 border-mystic-700/30'
              }`}
            >
              <PIcon className="w-3.5 h-3.5" />
              {t(`companion.personas.${p.id}.name`, { defaultValue: p.id })}
            </button>
          );
        })}
      </div>

      {/* Persona intro + meta */}
      <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${currentPersonaInfo.accent} mt-0.5`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${currentPersonaInfo.accent} mb-1`}>
              {t(`companion.personas.${persona}.name`, { defaultValue: persona })}
            </p>
            <p className="text-xs text-mystic-400 italic leading-relaxed">
              {t(`companion.personas.${persona}.intro`, { defaultValue: currentPersonaInfo.id })}
            </p>
          </div>
        </div>
      </Card>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2">
        {history.length === 0 && (
          <div className="text-center py-12 text-mystic-500 text-sm italic">
            {t('companion.emptyState', { defaultValue: 'Start by asking anything — a question held in your chest, a dream you want read, a name you want to understand.' })}
          </div>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold/15 text-mystic-100 rounded-br-sm'
                  : 'bg-mystic-800/60 text-mystic-200 rounded-bl-sm whitespace-pre-wrap'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-mystic-800/60 rounded-xl rounded-bl-sm p-3 text-sm text-mystic-400 italic">
              <span className="inline-block animate-pulse">
                {t('companion.thinking', { defaultValue: 'thinking…' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer + limit */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            maxLength={3000}
            placeholder={t('companion.placeholder', { defaultValue: 'Ask the companion...' }) as string}
            className="flex-1 bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
          />
          <Button
            variant="primary"
            onClick={send}
            disabled={sending || !input.trim() || dailyUsed >= DAILY_LIMIT}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-mystic-600 text-right">
          {t('companion.dailyRemaining', {
            defaultValue: '{{n}} / {{limit}} today',
            n: dailyUsed,
            limit: DAILY_LIMIT,
          })}
        </p>
      </div>
    </div>
  );
}

export default AiCompanionPage;
