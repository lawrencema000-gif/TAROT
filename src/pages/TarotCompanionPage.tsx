import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, RefreshCw, Shuffle, MessageCircle } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import i18n from '../i18n/config';
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import type { TarotCard } from '../types';

/**
 * Tarot companion — draws a card, then opens a focused AI chat about that
 * specific card. Reuses the existing ai-companion-chat edge function with
 * the oracle persona; the first message is auto-seeded client-side so the
 * AI has the card context. Multi-turn: the user can ask follow-ups.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function TarotCompanionPage() {
  const { t } = useT('app');
  const { profile, user } = useAuth();
  const [card, setCard] = useState<{ card: TarotCard; reversed: boolean } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(async () => {
    setDrawing(true);
    setMessages([]);
    const deck = await getAllTarotCards();
    const seed = `${user?.id || 'anon'}:${Date.now()}`;
    const [drawn] = drawSeededCards(1, seed, deck);
    // small delay for the shuffle feel
    await new Promise((r) => setTimeout(r, 600));
    setCard(drawn);
    setDrawing(false);
    // Auto-send an initial "I drew X. Help me sit with it." turn so the
    // AI leads with a reading rather than a prompt.
    sendInitial(drawn);
  }, [user?.id]);

  useEffect(() => { draw(); }, [draw]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const callAi = async (history: ChatMessage[]) => {
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const userContext = {
      zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
      mbtiType: profile?.mbtiType,
      locale: i18n.language || 'en',
      displayName: profile?.displayName,
    };
    const { data, error } = await supabase.functions.invoke('ai-companion-chat', {
      body: { persona: 'oracle', history, userContext },
    });
    if (error) return null;
    const payload = (data?.data ?? data) as { reply?: string } | null;
    return payload?.reply ?? null;
  };

  const sendInitial = async (drawn: { card: TarotCard; reversed: boolean }) => {
    const label = `${drawn.card.name}${drawn.reversed ? ' (reversed)' : ''}`;
    const seed: ChatMessage = {
      role: 'user',
      content: t('tarotCompanion.seedMessage', {
        defaultValue: 'I just drew {{card}}. Help me sit with what it might be pointing to right now.',
        card: label,
      }) as string,
    };
    setMessages([seed]);
    setSending(true);
    const reply = await callAi([seed]);
    setSending(false);
    if (!reply) {
      toast(t('tarotCompanion.aiFailed', { defaultValue: 'Could not reach the oracle' }), 'error');
      return;
    }
    setMessages([seed, { role: 'assistant', content: reply }]);
  };

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    const next: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, next];
    setMessages(updated);
    setSending(true);
    const reply = await callAi(updated);
    setSending(false);
    if (!reply) {
      toast(t('tarotCompanion.aiFailed', { defaultValue: 'Could not reach the oracle' }), 'error');
      return;
    }
    setMessages([...updated, { role: 'assistant', content: reply }]);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('tarotCompanion.title', { defaultValue: 'Tarot companion' })}
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={draw} disabled={drawing} className="gap-1">
          <Shuffle className="w-3 h-3" />
          {t('tarotCompanion.redraw', { defaultValue: 'New card' })}
        </Button>
      </div>

      {drawing && (
        <div className="py-12 text-center">
          <div className="loading-constellation mx-auto mb-3" />
          <p className="text-xs text-mystic-500">{t('tarotCompanion.drawing', { defaultValue: 'Drawing…' })}</p>
        </div>
      )}

      {card && !drawing && (
        <Card padding="lg" variant="glow" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-cosmic-violet/5">
          <div className="flex items-center gap-4">
            {card.card.imageUrl ? (
              <img
                src={card.card.imageUrl}
                alt={card.card.name}
                className={`w-20 h-32 rounded-lg object-cover ${card.reversed ? 'rotate-180' : ''}`}
              />
            ) : (
              <div className="w-20 h-32 bg-mystic-800 rounded-lg flex items-center justify-center text-4xl">
                {card.card.suit === 'cups' ? '🍷' : card.card.suit === 'wands' ? '🕯' : card.card.suit === 'swords' ? '⚔' : card.card.suit === 'pentacles' ? '🪙' : '✨'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
                {card.reversed ? t('tarotCompanion.reversed', { defaultValue: 'Reversed' }) : t('tarotCompanion.upright', { defaultValue: 'Upright' })}
              </p>
              <h2 className="font-display text-lg text-mystic-100">{card.card.name}</h2>
              <p className="text-xs text-mystic-400 mt-1 leading-relaxed line-clamp-3">
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
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gold/15 text-mystic-100 border border-gold/30'
                    : 'bg-mystic-800/50 text-mystic-200 border border-mystic-700/40'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-mystic-800/50 border border-mystic-700/40 px-3 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-mystic-500 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-mystic-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-mystic-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
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
              className="flex-1 bg-mystic-800/50 border border-mystic-700/50 rounded-xl px-3 py-2 text-mystic-100 text-sm placeholder-mystic-600 focus:outline-none focus:border-gold/40"
            />
            <Button variant="primary" onClick={handleSend} disabled={sending || !draft.trim()} className="px-4">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {messages.length === 0 && !drawing && (
        <Card padding="lg" className="text-center">
          <MessageCircle className="w-6 h-6 text-mystic-500 mx-auto mb-2" />
          <p className="text-xs text-mystic-400">
            {t('tarotCompanion.empty', { defaultValue: 'Pull a card to begin a conversation.' })}
          </p>
          <Button variant="gold" onClick={draw} className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('tarotCompanion.drawCta', { defaultValue: 'Draw a card' })}
          </Button>
        </Card>
      )}
    </div>
  );
}

export default TarotCompanionPage;
