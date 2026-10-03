import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Feather, Flower, Loader2, MessageCircle, Moon, Send } from 'lucide-react';
import { Card, Button, PageHeader, ReadingProse, toast, Page, Tabs } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { localDateStr } from '../utils/localDate';
import { scrollBehavior } from '../utils/motion';
import {
  loadConversation,
  saveConversation,
  loadDailyCount,
  saveDailyCount,
  newConversationId,
  type CompanionConversation,
  type CompanionMessage as Message,
  type CompanionPersona as Persona,
} from '../components/companion/companionHistory';

/** The `error.code` a function answered with (FunctionsHttpError keeps the Response on `context`). */
async function functionErrorCode(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).clone !== 'function') return null;
  try {
    const body = (await (ctx as Response).clone().json()) as { error?: { code?: unknown } | string; code?: unknown };
    const code = typeof body.error === 'object' && body.error ? body.error.code : body.code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

const PERSONAS: Array<{
  id: Persona;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  { id: 'sage',      icon: BookOpen,      accent: 'text-gold' },
  { id: 'oracle',    icon: Feather,       accent: 'text-cosmic-violetLight' },
  { id: 'mystic',    icon: Moon,          accent: 'text-cosmic-blue' },
  { id: 'priestess', icon: Flower,        accent: 'text-cosmic-rose' },
];

export function AiCompanionPage() {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;
  const [persona, setPersona] = useState<Persona>('sage');
  // History is per account AND per persona (companionHistory.ts); the
  // conversation id is what the server charges once for.
  const [convo, setConvo] = useState<CompanionConversation>(() => loadConversation(userId, 'sage'));
  const history = convo.messages;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const DAILY_LIMIT = 20; // free tier; premium bumps to 100 in a future sprint

  // Track daily usage per account. Use the LOCAL calendar date so the
  // message limit resets at the user's midnight, not UTC midnight.
  useEffect(() => {
    setDailyUsed(loadDailyCount(userId, localDateStr()));
  }, [userId]);

  // Load this account's conversation with the selected persona
  useEffect(() => {
    setConvo(loadConversation(userId, persona));
  }, [userId, persona]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: scrollBehavior() });
  }, [history, sending]);

  const incDailyUsed = useCallback(() => {
    const next = dailyUsed + 1;
    setDailyUsed(next);
    if (userId) saveDailyCount(userId, localDateStr(), next);
  }, [dailyUsed, userId]);

  const { tryConsume, EarnSheet, error: gateError } = useMoonstoneSpend('companion-session');

  // The daily cap is a safety rail, not the price. It is only shown once it
  // is close to being the thing that stops the next message; otherwise the
  // one rule on screen is the Moonstone cost of starting a conversation.
  const remaining = Math.max(0, DAILY_LIMIT - dailyUsed);
  const limitIsTheGate = remaining <= 3;

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !userId) return;
    if (dailyUsed >= DAILY_LIMIT) {
      toast(t('companion.dailyLimitReached', { defaultValue: 'Daily message limit reached — come back tomorrow.' }), 'error');
      return;
    }
    // One charge per conversation: the server debits once per
    // `conversationId` (premium = no debit), so the balance is checked
    // before the first message only.
    if (history.length === 0) {
      const ok = await tryConsume();
      if (!ok) return;
    }

    const prior = convo;
    const userMsg: Message = { role: 'user', content: trimmed, timestamp: Date.now() };
    const newHistory = [...history, userMsg];
    setConvo({ ...prior, messages: newHistory });
    setInput('');
    setSending(true);

    // An unanswered message is taken back out of the thread and returned
    // to the composer, so sending again is a clean retry, not a double.
    const restore = () => {
      setConvo(prior);
      setInput((cur) => cur || trimmed);
    };

    try {
      const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
      const userContext = {
        zodiacSign: zodiacSign ? zodiacData[zodiacSign].name : undefined,
        mbtiType: profile?.mbtiType,
        displayName: profile?.displayName,
        locale: getLocale(),
      };

      const { data, error } = await supabase.functions.invoke('ai-companion-chat', {
        body: {
          persona,
          conversationId: prior.conversationId,
          requestId: newConversationId(),
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userContext,
        },
      });

      if (error) {
        // Out of Moonstones / over today's AI limit is not a connection
        // problem: re-read the gate, which opens the earn sheet with the
        // right reason (insufficient or soft cap).
        const code = await functionErrorCode(error);
        if (code === 'INSUFFICIENT_BALANCE' || code === 'AI_SOFT_CAP') {
          restore();
          const allowed = await tryConsume();
          if (allowed) {
            toast(t('companion.balanceChangedRetry', { defaultValue: 'Your balance changed — send your message again.' }), 'info');
          }
          return;
        }
        throw error;
      }

      // New handler envelope wraps the result as `{ data: { reply, ... }, correlationId }`.
      // Fall back to the legacy flat shape for rollback safety.
      const payload = (data?.data ?? data) as { reply?: string } | null;
      if (!payload?.reply) {
        throw new Error('No reply');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: payload.reply,
        timestamp: Date.now(),
      };
      const next: CompanionConversation = { ...prior, messages: [...newHistory, assistantMsg] };
      setConvo(next);
      saveConversation(userId, persona, next);
      incDailyUsed();
    } catch {
      toast(t('companion.sendFailed', { defaultValue: 'Couldn’t reach your companion — check your connection and send again.' }), 'error');
      restore();
    } finally {
      setSending(false);
    }
  };

  // A new conversation is a new id, so the next message starts (and pays
  // for) a new conversation, as the cost line says.
  const clearConversation = () => {
    const fresh: CompanionConversation = { conversationId: newConversationId(), messages: [] };
    if (userId) saveConversation(userId, persona, fresh);
    setConvo(fresh);
  };

  const currentPersonaInfo = PERSONAS.find((p) => p.id === persona)!;
  const Icon = currentPersonaInfo.icon;

  return (
    <Page spacing="sm" className="flex flex-col h-[calc(100dvh-200px)] max-h-[calc(100dvh-200px)]">
      <PageHeader
        icon={<MessageCircle />}
        title={t('companion.title', { defaultValue: 'Companion' })}
        action={
          history.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearConversation}>
              {t('companion.newConversation', { defaultValue: 'New conversation' })}
            </Button>
          ) : undefined
        }
      />

      {/* Persona tabs */}
      <Tabs<Persona>
        items={PERSONAS.map((p) => ({
          id: p.id,
          label: t(`companion.personas.${p.id}.name`, { defaultValue: p.id }),
          icon: p.icon,
        }))}
        value={persona}
        onChange={setPersona}
        aria-label={t('companion.title', { defaultValue: 'Companion' }) as string}
        size="sm"
        idPrefix="companion-persona"
      />

      {/* Persona intro + meta */}
      <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${currentPersonaInfo.accent} mt-0.5`} />
          <div className="flex-1">
            <p className={`text-ui font-medium ${currentPersonaInfo.accent} mb-1`}>
              {t(`companion.personas.${persona}.name`, { defaultValue: persona })}
            </p>
            <p className="text-ui text-mystic-300 italic">
              {t(`companion.personas.${persona}.intro`, { defaultValue: currentPersonaInfo.id })}
            </p>
          </div>
        </div>
      </Card>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2">
        {history.length === 0 && (
          <div className="text-center py-12 px-4 text-ui text-mystic-400 italic max-w-prose mx-auto">
            {t('companion.emptyState', { defaultValue: 'Start by asking anything — a question held in your chest, a dream you want read, a name you want to understand.' })}
          </div>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] rounded-control p-3 text-ui bg-gold/15 text-mystic-100 rounded-br">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-control p-3 bg-mystic-800/60 rounded-bl">
                <ReadingProse text={msg.content} lede={false} className="whitespace-pre-line" />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-mystic-800/60 rounded-control rounded-bl p-3 text-meta text-mystic-400 italic">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                {t('companion.thinking', { defaultValue: 'thinking…' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer + the one gating rule */}
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
            placeholder={t('companion.placeholder', { defaultValue: 'Ask the companion…' }) as string}
            aria-label={t('companion.placeholder', { defaultValue: 'Ask the companion…' }) as string}
            className="flex-1 bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-ui placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
          />
          <Button
            variant="primary"
            onClick={send}
            disabled={sending || !input.trim() || dailyUsed >= DAILY_LIMIT}
            className="px-4"
            aria-label={t('common:actions.send', { defaultValue: 'Send' }) as string}
          >
            <Send className="w-4 h-4" aria-hidden />
          </Button>
        </div>
        {history.length === 0 && !limitIsTheGate && <MoonstoneCostLine wording="conversation" className="mt-1" />}
        {limitIsTheGate && (
          <p className="text-meta text-mystic-400 text-right tabular-nums" role="status">
            {remaining === 0
              ? t('companion.dailyLimitReached', { defaultValue: 'Daily message limit reached — come back tomorrow.' })
              : t('companion.dailyRemaining', {
                  defaultValue: '{{remaining}} messages left today',
                  remaining,
                  n: dailyUsed,
                  limit: DAILY_LIMIT,
                })}
          </p>
        )}
        {gateError && (
          <p className="text-meta text-coral" role="alert">
            {gateError}
          </p>
        )}
      </div>
      {EarnSheet}
    </Page>
  );
}

export default AiCompanionPage;
