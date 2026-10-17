import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, RefreshCw, Shuffle, MessageCircle, Loader2 } from 'lucide-react';
import { Card, Button, PageHeader, ReadingProse, toast, Page, Badge, TarotFace } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { aiFailureOf } from '../components/reports/aiReading';
import {
  newConversationId,
  conversationCovered,
  chargedAtAfterReply,
  loadTarotSession,
  saveTarotSession,
  clearTarotSession,
  type CompanionConversation,
  type CompanionMessage,
} from '../components/companion/companionHistory';
import type { TarotCard } from '../types';

/**
 * Tarot companion — draws a card, then, when the reader asks, opens a
 * focused AI chat about that card. Reuses the ai-companion-chat edge
 * function with the oracle persona; the first message is seeded
 * client-side so the AI has the card context. Multi-turn: the reader can
 * ask follow-ups.
 *
 * Opening the page draws a card and costs nothing. The conversation — the
 * one paid step (50 Moonstones, debited by the server) — starts only on
 * "Read this card". It used to start on mount, so merely visiting the page
 * (or coming back to it, or tapping "New card") charged the reader.
 *
 * Each drawn card is one conversation with its own conversationId, sent
 * with the opener and every follow-up: the server charges the opener once
 * and every follow-up for 24 hours is free, as the cost line says. Without
 * it each request was charged on its own — every follow-up cost 50, and a
 * short balance read as "Could not reach the oracle" (p8 F02/F10/O#21).
 * The conversation is kept for the account while that charge covers it.
 */

type ReplyOutcome =
  | { ok: true; reply: string; charged?: boolean }
  | { ok: false; balance: boolean };

export function TarotCompanionPage() {
  const { t } = useT('app');
  const { profile, user } = useAuth();
  const userId = user?.id ?? null;
  const [card, setCard] = useState<{ card: TarotCard; reversed: boolean } | null>(null);
  const [drawing, setDrawing] = useState(false);
  /** The conversation about the card on screen. A new card is a new conversation (a new id). */
  const [convo, setConvo] = useState<CompanionConversation>(() => ({ conversationId: newConversationId(), messages: [] }));
  const messages = convo.messages;
  const [draft, setDraft] = useState('');
  /** A press is being handled — through the balance gate and the reply. */
  const [busy, setBusy] = useState(false);
  /** The request is out: the "thinking" line shows. */
  const [sending, setSending] = useState(false);
  /**
   * Set synchronously on a press, before the balance gate is awaited: a
   * second tap on "Read this card" (or a second send) while the first is
   * handled is ignored. A double tap used to open — and pay for — two
   * conversations (p8 F11, O#21).
   */
  const inFlight = useRef(false);
  /** The conversation on screen, for a reply that lands after "New card". */
  const shownConversation = useRef(convo.conversationId);
  useEffect(() => {
    shownConversation.current = convo.conversationId;
  }, [convo.conversationId]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tryConsume, EarnSheet } = useMoonstoneSpend('tarot-companion-session');

  const draw = useCallback(async () => {
    setDrawing(true);
    const deck = await getAllTarotCards();
    const seed = `${userId || 'anon'}:${Date.now()}`;
    const [drawn] = drawSeededCards(1, seed, deck);
    // small delay for the shuffle feel
    await new Promise((r) => setTimeout(r, 600));
    setCard(drawn);
    // A new card is a new conversation: a new id, and nothing charged until it is read.
    setConvo({ conversationId: newConversationId(), messages: [] });
    setDraft('');
    if (userId) clearTarotSession(userId);
    setDrawing(false);
  }, [userId]);

  // The conversation this account is still inside (its charge covers it)
  // comes back as it was; otherwise a fresh card. Neither sends anything.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = loadTarotSession(userId);
      if (saved) {
        const deck = await getAllTarotCards();
        const found = deck.find((c) => c.id === saved.cardId);
        if (cancelled) return;
        if (found) {
          setCard({ card: found, reversed: saved.reversed });
          setConvo(saved.conversation);
          return;
        }
      }
      if (!cancelled) await draw();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, draw]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const callAi = async (conversationId: string, history: CompanionMessage[]): Promise<ReplyOutcome> => {
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const userContext = {
      zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
      mbtiType: profile?.mbtiType,
      locale: getLocale(),
      displayName: profile?.displayName,
    };
    const { data, error } = await supabase.functions.invoke('ai-companion-chat', {
      body: {
        persona: 'oracle',
        conversationId,
        history: history.map((m) => ({ role: m.role, content: m.content })),
        userContext,
      },
    });
    if (error) {
      // Short of Moonstones / over today's AI limit is not a connection
      // problem: the caller reopens the gate, which shows the Earn sheet.
      const failure = await aiFailureOf(error);
      return { ok: false, balance: failure === 'insufficient' || failure === 'soft-cap' };
    }
    const payload = (data?.data ?? data) as { reply?: string; charged?: boolean } | null;
    return payload?.reply ? { ok: true, reply: payload.reply, charged: payload.charged } : { ok: false, balance: false };
  };

  /**
   * Send `asked` (the thread with the new user message) and settle it: the
   * reply joins the conversation and is kept for the account; anything else
   * takes the message back out. Returns whether a reply came.
   */
  const exchange = async (
    drawn: { card: TarotCard; reversed: boolean },
    base: CompanionConversation,
    asked: CompanionConversation,
    wasCovered: boolean,
  ): Promise<ReplyOutcome> => {
    setConvo(asked);
    setSending(true);
    const res = await callAi(base.conversationId, asked.messages);
    setSending(false);
    const shown = shownConversation.current === base.conversationId;
    if (res.ok) {
      const next: CompanionConversation = {
        ...asked,
        messages: [...asked.messages, { role: 'assistant', content: res.reply, timestamp: Date.now() }],
        chargedAt: chargedAtAfterReply(base, res.charged, wasCovered),
      };
      // Kept even if the page was left or a new card drawn meanwhile: it is paid for.
      if (userId && (shown || !loadTarotSession(userId))) {
        saveTarotSession(userId, { cardId: drawn.card.id, reversed: drawn.reversed, conversation: next });
      }
      if (shown) setConvo(next);
      return res;
    }
    if (shown) setConvo(base);
    return res;
  };

  const sendInitial = async () => {
    if (!card || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const drawn = card;
    try {
      // The opener is the conversation's one charge (premium: no debit;
      // the soft cap counts one slot). Check the balance first.
      const ok = await tryConsume();
      if (!ok) return;
      const label = drawn.reversed
        ? t('tarotCompanion.cardReversed', { name: drawn.card.name, defaultValue: '{{name}} (reversed)' })
        : drawn.card.name;
      const seed: CompanionMessage = {
        role: 'user',
        content: t('tarotCompanion.seedMessage', {
          defaultValue: 'I just drew {{card}}. Help me sit with what it might be pointing to right now.',
          card: label,
        }) as string,
        timestamp: Date.now(),
      };
      const base = convo;
      const res = await exchange(drawn, base, { ...base, messages: [seed] }, false);
      if (res.ok) return;
      if (res.balance) {
        if (await tryConsume()) {
          toast(t('tarotCompanion.balanceChangedRetry', { defaultValue: 'Your balance changed — try again.' }), 'info');
        }
        return;
      }
      toast(t('tarotCompanion.aiFailed', { defaultValue: 'Couldn’t reach the oracle — check your connection and ask again.' }), 'error');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !card || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const drawn = card;
    const base = convo;
    const wasCovered = conversationCovered(base);
    try {
      // Follow-ups are free while the opener's charge covers the
      // conversation (24 hours). After that the next message is charged:
      // the price is on screen and the balance is checked first.
      if (!wasCovered) {
        const ok = await tryConsume();
        if (!ok) return;
      }
      setDraft('');
      const res = await exchange(
        drawn,
        base,
        { ...base, messages: [...base.messages, { role: 'user', content: text, timestamp: Date.now() }] },
        wasCovered,
      );
      if (res.ok) return;
      // Not answered: the question goes back in the composer and out of the thread.
      if (shownConversation.current === base.conversationId) setDraft((cur) => cur || text);
      if (res.balance) {
        // Refused before any debit: the gate opens the Earn sheet with the
        // balance or the soft-cap reset — not "could not reach the oracle".
        if (await tryConsume()) {
          toast(t('tarotCompanion.balanceChangedRetry', { defaultValue: 'Your balance changed — try again.' }), 'info');
        }
        return;
      }
      toast(t('tarotCompanion.aiFailed', { defaultValue: 'Couldn’t reach the oracle — check your connection and ask again.' }), 'error');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  /** Whether the next follow-up is covered by the opener's charge. */
  const covered = conversationCovered(convo);

  return (
    <Page spacing="sm">
      <PageHeader
        icon={<Sparkles />}
        title={t('tarotCompanion.title', { defaultValue: 'Tarot companion' })}
        action={
          <Button variant="ghost" size="sm" onClick={draw} disabled={drawing || busy} className="gap-1">
            <Shuffle className="w-3 h-3" />
            {t('tarotCompanion.redraw', { defaultValue: 'New card' })}
          </Button>
        }
      />


      {drawing && (
        <div className="py-12 text-center">
          <div className="loading-constellation mx-auto mb-3" />
          <p className="text-ui text-mystic-400">{t('tarotCompanion.drawing', { defaultValue: 'Drawing…' })}</p>
        </div>
      )}

      {card && !drawing && (
        <Card padding="lg">
          <div className="flex items-center gap-4">
            {/* The face as the rest of the app draws it; the badge names the orientation. */}
            <div className="w-20 shrink-0">
              <TarotFace card={card.card} size="fill" detail="quiet" reversed={card.reversed} reversedTag={false} alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-1">
                <Badge tone={card.reversed ? 'coral' : 'gold'}>
                  {card.reversed ? t('tarotCompanion.reversed', { defaultValue: 'Reversed' }) : t('tarotCompanion.upright', { defaultValue: 'Upright' })}
                </Badge>
              </div>
              <h2 className="heading-display-md heading-strong text-mystic-100">{card.card.name}</h2>
              <p className="text-ui text-mystic-300 mt-1 line-clamp-3">
                {card.reversed ? card.card.meaningReversed : card.card.meaningUpright}
              </p>
            </div>
          </div>
        </Card>
      )}

      {messages.length > 0 && (
        <Card padding="md">
          <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto space-y-3 mb-3 pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%] px-3 py-2 rounded-card text-ui bg-gold/15 text-mystic-100 border border-gold/30">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] px-3 py-2 rounded-card bg-mystic-800/50 border border-mystic-700/40">
                    <ReadingProse text={m.content} lede={false} className="whitespace-pre-line" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-mystic-800/50 border border-mystic-700/40 px-3 py-2 rounded-card" role="status" aria-live="polite">
                  <Loader2 className="w-4 h-4 text-mystic-400 animate-spin" aria-hidden />
                  <span className="sr-only">{t('tarotCompanion.thinking', { defaultValue: 'The oracle is thinking…' })}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t('tarotCompanion.composerPlaceholder', { defaultValue: 'Ask a follow-up…' })}
              maxLength={2000}
              className="flex-1 bg-mystic-800/50 border border-mystic-700/50 rounded-control px-3 py-2 min-h-[44px] text-mystic-100 text-ui placeholder-mystic-500 focus:outline-none focus:border-gold/40"
            />
            <Button variant="primary" onClick={handleSend} disabled={busy || !draft.trim()} className="px-4" aria-label={t('common:actions.send', { defaultValue: 'Send' })}>
              <Send className="w-4 h-4" aria-hidden />
            </Button>
          </div>
          {/* When the next follow-up is the one charged — the opener's 24
              hours are over, or no charge was seen — the price is on
              screen before it goes. */}
          {!covered && !sending && (
            <div className="mt-3 space-y-1">
              {typeof convo.chargedAt === 'number' && (
                <p className="text-meta text-mystic-300">
                  {t('tarotCompanion.renewNotice', {
                    defaultValue: 'The 24 hours this conversation covered have passed. Your next question starts a new 24 hours.',
                  })}
                </p>
              )}
              <MoonstoneCostLine wording="conversation" />
            </div>
          )}
        </Card>
      )}

      {/* Nothing is spent until the reader asks: the card is free, the conversation is the paid step. */}
      {messages.length === 0 && !drawing && !sending && (
        <Card padding="lg" className="text-center">
          <MessageCircle className="w-6 h-6 text-mystic-500 mx-auto mb-2" aria-hidden />
          {card ? (
            <>
              <p className="text-ui text-mystic-400">
                {t('tarotCompanion.readPrompt', { defaultValue: 'Ask the oracle to read this card with you.' })}
              </p>
              <Button variant="gold" onClick={() => void sendInitial()} disabled={busy} className="mt-3">
                <Sparkles className="w-4 h-4 mr-2" aria-hidden />
                {t('tarotCompanion.readCta', { defaultValue: 'Read this card' })}
              </Button>
              <MoonstoneCostLine wording="conversation" className="mt-3 justify-center" />
            </>
          ) : (
            <>
              <p className="text-ui text-mystic-400">
                {t('tarotCompanion.empty', { defaultValue: 'Pull a card to begin a conversation.' })}
              </p>
              <Button variant="gold" onClick={draw} className="mt-3">
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden />
                {t('tarotCompanion.drawCta', { defaultValue: 'Draw a card' })}
              </Button>
            </>
          )}
        </Card>
      )}
      {EarnSheet}
    </Page>
  );
}

export default TarotCompanionPage;
