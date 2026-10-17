import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Feather, Flower, Loader2, MessageCircle, Moon, Send } from 'lucide-react';
import { Card, Button, PageHeader, ReadingProse, toast, Page, Tabs, Sheet } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { localDateStr } from '../utils/localDate';
import { scrollBehavior } from '../utils/motion';
import { aiFailureOf } from '../components/reports/aiReading';
import {
  loadConversation,
  saveConversation,
  loadDailyCount,
  saveDailyCount,
  newConversationId,
  conversationCovered,
  chargedAtAfterReply,
  legacyCompanionOffer,
  claimLegacyCompanion,
  declineLegacyCompanion,
  historyKey,
  type CompanionConversation,
  type CompanionMessage as Message,
  type CompanionPersona as Persona,
} from '../components/companion/companionHistory';

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

/** "Sage and Oracle" in the app's language. */
function listOf(names: string[]): string {
  type ListFormatCtor = new (locale: string, o: { style: string; type: string }) => { format: (l: string[]) => string };
  const ListFormat = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;
  try {
    if (ListFormat) return new ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    /* an unknown locale tag: plain commas below */
  }
  return names.join(', ');
}

/** The conversation id this account has saved for `persona`, or null when nothing is saved yet. */
function savedConversationId(userId: string, persona: Persona): string | null {
  try {
    const raw = window.localStorage.getItem(historyKey(userId, persona));
    if (!raw) return null;
    const id = (JSON.parse(raw) as { conversationId?: unknown })?.conversationId;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

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
  /** A message is being handled: from the press, through the gate, until its reply settles. */
  const [busy, setBusy] = useState(false);
  /** The request is out: the "thinking" line shows. */
  const [sending, setSending] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  /**
   * Set synchronously on the press, before the balance gate is awaited, so
   * a second press (Enter twice, a double tap) while the first is handled
   * is ignored.
   */
  const inFlight = useRef(false);
  /**
   * What is on screen, for a reply that lands later: it is shown only if
   * the screen still holds the conversation it was sent in (p8 F39).
   */
  const onScreen = useRef({ userId, persona, conversationId: convo.conversationId });
  useEffect(() => {
    onScreen.current = { userId, persona, conversationId: convo.conversationId };
  }, [userId, persona, convo.conversationId]);

  /**
   * Personas whose conversation an earlier version kept on this device,
   * writer unknown, that this account has not answered for: asked about,
   * never taken (p8 F33).
   */
  const [legacyPersonas, setLegacyPersonas] = useState<Persona[]>([]);
  /** Closed without an answer: asked again on the next visit, not again on this one. */
  const [legacyLater, setLegacyLater] = useState(false);
  useEffect(() => {
    setLegacyPersonas(legacyCompanionOffer(userId));
    setLegacyLater(false);
  }, [userId]);

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
    setDailyUsed((n) => {
      const next = n + 1;
      if (userId) saveDailyCount(userId, localDateStr(), next);
      return next;
    });
  }, [userId]);

  const { tryConsume, EarnSheet, error: gateError } = useMoonstoneSpend('companion-session');

  // The daily cap is a safety rail, not the price. It is only shown once it
  // is close to being the thing that stops the next message; otherwise the
  // one rule on screen is the Moonstone cost of starting a conversation.
  const remaining = Math.max(0, DAILY_LIMIT - dailyUsed);
  const limitIsTheGate = remaining <= 3;
  /**
   * The next message is covered by this conversation's charge: one was
   * seen less than 24 hours ago. When it is not — a new conversation, or
   * one whose 24 hours ran out — the next message is charged, so the price
   * is on screen and the balance is checked before it goes (p8 F40).
   */
  const covered = conversationCovered(convo);
  /** Its 24 hours ran out (a charge was seen, more than a day ago). Premium pays nothing, so is told nothing. */
  const lapsed = history.length > 0 && typeof convo.chargedAt === 'number' && !covered && !profile?.isPremium;

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || !userId || inFlight.current) return;
    if (dailyUsed >= DAILY_LIMIT) {
      toast(t('companion.dailyLimitReached', { defaultValue: 'Daily message limit reached — come back tomorrow.' }), 'error');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    const sentPersona = persona;
    const prior = convo;
    const wasCovered = conversationCovered(prior);
    const stillOnScreen = () =>
      onScreen.current.userId === userId &&
      onScreen.current.persona === sentPersona &&
      onScreen.current.conversationId === prior.conversationId;
    // An unanswered message is taken back out of the thread and returned
    // to the composer, so sending again is a clean retry, not a double.
    const restore = () => {
      if (!stillOnScreen()) return;
      setConvo(prior);
      setInput((cur) => cur || trimmed);
    };
    try {
      // The server charges once per conversation for 24 hours (premium =
      // no debit). Any message it will charge — the first of a
      // conversation, or the first after its 24 hours — is checked against
      // the balance first.
      if (!wasCovered) {
        const ok = await tryConsume();
        if (!ok) return;
      }

      const userMsg: Message = { role: 'user', content: trimmed, timestamp: Date.now() };
      const newHistory = [...prior.messages, userMsg];
      if (stillOnScreen()) setConvo({ ...prior, messages: newHistory });
      setInput('');
      setSending(true);

      const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
      const userContext = {
        zodiacSign: zodiacSign ? zodiacData[zodiacSign].name : undefined,
        mbtiType: profile?.mbtiType,
        displayName: profile?.displayName,
        locale: getLocale(),
      };

      const { data, error } = await supabase.functions.invoke('ai-companion-chat', {
        body: {
          persona: sentPersona,
          conversationId: prior.conversationId,
          requestId: newConversationId(),
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userContext,
        },
      });

      if (error) {
        // Out of Moonstones / over today's AI limit is not a connection
        // problem: re-read the gate, which opens the earn sheet with the
        // right reason (insufficient or soft cap). The unsent message goes
        // back into the box either way.
        const failure = await aiFailureOf(error);
        if (failure === 'insufficient' || failure === 'soft-cap') {
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
      const payload = (data?.data ?? data) as { reply?: string; charged?: boolean } | null;
      if (!payload?.reply) {
        throw new Error('No reply');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: payload.reply,
        timestamp: Date.now(),
      };
      const next: CompanionConversation = {
        ...prior,
        messages: [...newHistory, assistantMsg],
        chargedAt: chargedAtAfterReply(prior, payload.charged, wasCovered),
      };
      // Filed under the persona and conversation it was sent in, whatever
      // the screen shows now — unless that conversation was replaced
      // ("New conversation") while the reply was on its way.
      const saved = savedConversationId(userId, sentPersona);
      if (saved === null || saved === prior.conversationId) saveConversation(userId, sentPersona, next);
      if (stillOnScreen()) setConvo(next);
      incDailyUsed();
    } catch {
      toast(t('companion.sendFailed', { defaultValue: 'Couldn’t reach your companion — check your connection and send again.' }), 'error');
      restore();
    } finally {
      inFlight.current = false;
      setSending(false);
      setBusy(false);
    }
  };

  // A new conversation is a new id, so the next message starts (and pays
  // for) a new conversation, as the cost line says.
  const clearConversation = () => {
    const fresh: CompanionConversation = { conversationId: newConversationId(), messages: [] };
    if (userId) saveConversation(userId, persona, fresh);
    setConvo(fresh);
  };

  /** "They're mine": the old conversations join this account's, and the device copy goes. */
  const claimLegacy = () => {
    if (!userId) return;
    const moved = claimLegacyCompanion(userId);
    setLegacyPersonas(legacyCompanionOffer(userId));
    setConvo(loadConversation(userId, persona));
    if (moved.length > 0) {
      toast(t('companion.legacyClaimed', { defaultValue: 'Added to your conversations' }), 'success');
    } else {
      toast(t('companion.legacyClaimFailed', { defaultValue: 'Couldn’t add them right now. They’re still on this device — try again in a moment.' }), 'error');
    }
  };

  /** "Not mine": this account is not asked again; they stay on the device for whoever had them. */
  const declineLegacy = () => {
    if (!userId) return;
    declineLegacyCompanion(userId);
    setLegacyPersonas([]);
  };

  const currentPersonaInfo = PERSONAS.find((p) => p.id === persona)!;
  const Icon = currentPersonaInfo.icon;
  const personaName = (id: Persona) => t(`companion.personas.${id}.name`, { defaultValue: id });

  return (
    <Page spacing="sm" className="flex flex-col h-[calc(100dvh-200px)] max-h-[calc(100dvh-200px)]">
      <PageHeader
        icon={<MessageCircle />}
        title={t('companion.title', { defaultValue: 'Companion' })}
        action={
          history.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearConversation} disabled={busy}>
              {t('companion.newConversation', { defaultValue: 'New conversation' })}
            </Button>
          ) : undefined
        }
      />

      {/* Persona tabs. Held while a message is on its way: a reply belongs
          to the persona it was sent to (p8 F39). */}
      <Tabs<Persona>
        items={PERSONAS.map((p) => ({
          id: p.id,
          label: personaName(p.id),
          icon: p.icon,
          disabled: busy && p.id !== persona,
        }))}
        value={persona}
        onChange={(id) => {
          if (!inFlight.current) setPersona(id);
        }}
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
              {personaName(persona)}
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
            disabled={busy || !input.trim() || dailyUsed >= DAILY_LIMIT}
            className="px-4"
            aria-label={t('common:actions.send', { defaultValue: 'Send' }) as string}
          >
            <Send className="w-4 h-4" aria-hidden />
          </Button>
        </div>
        {/* The price, whenever the next message is the one charged: a new
            conversation, or one whose 24 hours ran out (p8 F40). */}
        {lapsed && (
          <p className="text-meta text-mystic-300" role="status">
            {t('companion.renewNotice', {
              defaultValue: 'The 24 hours this conversation covered have passed. Your next message starts a new 24 hours.',
            })}
          </p>
        )}
        {!covered && <MoonstoneCostLine wording="conversation" className="mt-1" />}
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

      {/* Conversations an earlier version kept on this device: asked
          about, never taken (p8 F33). Only who they were with is shown
          until the account says they are its own. A sheet, not a card: the
          chat column has a fixed height, and a card would push the composer
          under the nav. */}
      <Sheet
        open={legacyPersonas.length > 0 && !legacyLater}
        onClose={() => setLegacyLater(true)}
        title={t('companion.legacyTitle', { defaultValue: 'Conversations saved on this device' })}
      >
        <div className="space-y-5">
          <p className="text-ui text-mystic-300 leading-relaxed">
            {t('companion.legacyBody', {
              count: legacyPersonas.length,
              personas: listOf(legacyPersonas.map(personaName)),
              defaultValue: 'An earlier version of Arcana saved conversations with {{personas}} on this device. If they’re yours, add them to your conversations. If not, they stay here for whoever had them.',
            })}
          </p>
          <div className="space-y-2">
            <Button variant="gold" fullWidth onClick={claimLegacy} disabled={busy}>
              {t('companion.legacyClaim', { count: legacyPersonas.length, defaultValue: 'Add them to my conversations' })}
            </Button>
            <Button variant="ghost" fullWidth onClick={declineLegacy} disabled={busy}>
              {t('companion.legacyDecline', { defaultValue: 'Not mine' })}
            </Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}

export default AiCompanionPage;
