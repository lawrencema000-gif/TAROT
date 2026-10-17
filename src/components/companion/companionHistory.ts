/**
 * The Companion's device-side memory: one conversation per (account,
 * persona), plus the per-day message counter.
 *
 * Scoped by ACCOUNT. The first version kept `arcana_companion_v1_<persona>`
 * and `arcana_companion_daily_<date>` device-global, so on a shared phone the
 * next account to open /companion read the previous account's private
 * conversation and inherited its message count (the same storage pattern as
 * the mood-diary leak, P7 review #1).
 *
 * The legacy conversations are the only copy of what the live app (web and
 * Android v1.2.0) saved, so they are never deleted unseen: the first time an
 * account opens the Companion while they are on the device it is ASKED
 * whether they are its own (`legacyCompanionOffer`). "Yes" moves them into
 * that account's conversations and deletes the device-global copy
 * (`claimLegacyCompanion`); "not mine" leaves them for whoever wrote them
 * (`declineLegacyCompanion`). Nothing is attributed silently, and sign-out
 * no longer deletes them (p8 F33).
 *
 * Each conversation carries a stable `conversationId` (uuid). The server
 * charges Moonstones once per conversation, keyed on it, for 24 hours, so
 * every reply in that window is covered by the one charge the cost line
 * names; after it, the next message is charged again. `chargedAt` records
 * when this device saw that charge taken, so the page can say so before the
 * next message rather than after (p8 F40). "New conversation" starts a new
 * id (and a new charge).
 */

export type CompanionPersona = 'sage' | 'oracle' | 'mystic' | 'priestess';

export const COMPANION_PERSONAS: readonly CompanionPersona[] = ['sage', 'oracle', 'mystic', 'priestess'];

export interface CompanionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CompanionConversation {
  conversationId: string;
  messages: CompanionMessage[];
  /**
   * When the server took this conversation's charge (epoch ms, this
   * device's clock, at the reply that reported `charged`). Absent when no
   * charge has been seen — a new conversation, or one saved before this
   * field existed — and then the next message is treated as charged.
   */
  chargedAt?: number;
}

const LEGACY_HISTORY_PREFIX = 'arcana_companion_v1_';
const LEGACY_DAILY_RE = /^arcana_companion_daily_\d{4}-\d{2}-\d{2}$/;
const HISTORY_PREFIX = 'arcana_companion_v2:';
const DAILY_PREFIX = 'arcana_companion_daily_v2:';
const LEGACY_DECLINED_PREFIX = 'arcana_companion_legacy_declined:';
/**
 * Bound on stored messages per conversation: room for a whole legacy
 * conversation (the old build kept 40) on top of a current one, so an
 * import never trims what it moved.
 */
export const MAX_STORED_MESSAGES = 80;

/** How long one charge covers a conversation, server-side (ai-companion-chat, `ttlHours: 24`). */
export const CONVERSATION_COVER_MS = 24 * 60 * 60_000;
/**
 * Read the window as closing this much early: `chargedAt` is when the reply
 * arrived, a little after the server's charge, and an early "this message
 * starts a new 24 hours" costs nothing, while a late one would be a charge
 * the screen did not announce.
 */
const COVER_MARGIN_MS = 5 * 60_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function historyKey(userId: string, persona: CompanionPersona): string {
  return `${HISTORY_PREFIX}${userId}:${persona}`;
}

export function dailyKey(userId: string): string {
  return DAILY_PREFIX + userId;
}

export function newConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // RFC 4122 v4 from Math.random — only for very old WebViews without randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Whether the next message of this conversation is free: its charge was
 * seen less than 24 hours ago. False for a conversation with no messages,
 * none seen charged, or one whose 24 hours have run out.
 */
export function conversationCovered(
  convo: Pick<CompanionConversation, 'messages' | 'chargedAt'>,
  now: number = Date.now(),
): boolean {
  if (convo.messages.length === 0 || typeof convo.chargedAt !== 'number') return false;
  const age = now - convo.chargedAt;
  return age >= 0 && age < CONVERSATION_COVER_MS - COVER_MARGIN_MS;
}

/**
 * The conversation after a reply: `charged` is what the server reported
 * for that message. A message charged on the server starts the 24 hours
 * now; an older server that reports nothing is read as having charged a
 * message the conversation was not covered for.
 */
export function chargedAtAfterReply(
  convo: Pick<CompanionConversation, 'messages' | 'chargedAt'>,
  charged: boolean | undefined,
  wasCovered: boolean,
  now: number = Date.now(),
): number | undefined {
  if (charged === true) return now;
  if (charged === undefined && !wasCovered) return now;
  return convo.chargedAt;
}

function isMessage(m: unknown): m is CompanionMessage {
  const v = m as CompanionMessage | null;
  return !!v && (v.role === 'user' || v.role === 'assistant') && typeof v.content === 'string' && v.content.length > 0;
}

function toMessage(m: CompanionMessage): CompanionMessage {
  return { role: m.role, content: m.content, timestamp: typeof m.timestamp === 'number' ? m.timestamp : 0 };
}

/** This account's conversation with `persona`; a fresh empty one when there is none. */
export function loadConversation(userId: string | null | undefined, persona: CompanionPersona): CompanionConversation {
  const empty = (): CompanionConversation => ({ conversationId: newConversationId(), messages: [] });
  if (!userId || typeof window === 'undefined') return empty();
  try {
    const raw = window.localStorage.getItem(historyKey(userId, persona));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<CompanionConversation>;
    const messages = Array.isArray(parsed.messages) ? parsed.messages.filter(isMessage).map(toMessage) : [];
    const conversationId = typeof parsed.conversationId === 'string' && UUID_RE.test(parsed.conversationId)
      ? parsed.conversationId
      : newConversationId();
    const chargedAt = typeof parsed.chargedAt === 'number' && Number.isFinite(parsed.chargedAt) ? parsed.chargedAt : undefined;
    return chargedAt === undefined ? { conversationId, messages } : { conversationId, messages, chargedAt };
  } catch {
    return empty();
  }
}

export function saveConversation(userId: string, persona: CompanionPersona, convo: CompanionConversation): void {
  try {
    const trimmed: CompanionConversation = {
      conversationId: convo.conversationId,
      messages: convo.messages.slice(-MAX_STORED_MESSAGES),
      ...(typeof convo.chargedAt === 'number' ? { chargedAt: convo.chargedAt } : {}),
    };
    window.localStorage.setItem(historyKey(userId, persona), JSON.stringify(trimmed));
  } catch {
    /* storage full or unavailable — the conversation lives on in memory */
  }
}

/** Messages this account sent today (local calendar day). */
export function loadDailyCount(userId: string | null | undefined, today: string): number {
  if (!userId || typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(dailyKey(userId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: string; n?: number };
    return parsed.date === today && typeof parsed.n === 'number' && Number.isFinite(parsed.n) ? parsed.n : 0;
  } catch {
    return 0;
  }
}

export function saveDailyCount(userId: string, today: string, n: number): void {
  try {
    window.localStorage.setItem(dailyKey(userId), JSON.stringify({ date: today, n }));
  } catch {
    /* ignore */
  }
}

// ── The Tarot companion's conversation about one drawn card ────────────────

/**
 * The card on the Tarot companion and the conversation about it. One
 * conversation id per drawn card, so the server charges "Read this card"
 * once and every follow-up for 24 hours is free, as its cost line says
 * (p8 F02/F10). Kept per account while that charge covers it, so leaving
 * the page does not lose a conversation that is paid for.
 */
export interface TarotCompanionSession {
  cardId: number;
  reversed: boolean;
  conversation: CompanionConversation;
}

const TAROT_SESSION_PREFIX = 'arcana_tarot_companion_v1:';

function tarotSessionKey(userId: string): string {
  return TAROT_SESSION_PREFIX + userId;
}

/** This account's Tarot companion conversation, while its charge still covers it; null otherwise. */
export function loadTarotSession(userId: string | null | undefined, now: number = Date.now()): TarotCompanionSession | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(tarotSessionKey(userId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<TarotCompanionSession> & { conversation?: Partial<CompanionConversation> };
    const c = p.conversation;
    const conversation: CompanionConversation | null =
      c && typeof c.conversationId === 'string' && UUID_RE.test(c.conversationId) && Array.isArray(c.messages)
        ? {
            conversationId: c.conversationId,
            messages: c.messages.filter(isMessage).map(toMessage),
            ...(typeof c.chargedAt === 'number' ? { chargedAt: c.chargedAt } : {}),
          }
        : null;
    if (!conversation || typeof p.cardId !== 'number' || !conversationCovered(conversation, now)) {
      window.localStorage.removeItem(tarotSessionKey(userId));
      return null;
    }
    return { cardId: p.cardId, reversed: p.reversed === true, conversation };
  } catch {
    return null;
  }
}

export function saveTarotSession(userId: string, session: TarotCompanionSession): void {
  try {
    window.localStorage.setItem(tarotSessionKey(userId), JSON.stringify({
      cardId: session.cardId,
      reversed: session.reversed,
      conversation: { ...session.conversation, messages: session.conversation.messages.slice(-MAX_STORED_MESSAGES) },
    }));
  } catch {
    /* storage full or unavailable — the conversation lives on while the page is open */
  }
}

export function clearTarotSession(userId: string): void {
  try {
    window.localStorage.removeItem(tarotSessionKey(userId));
  } catch {
    /* ignore */
  }
}

// ── The legacy, device-global conversations (p8 F33) ───────────────────────

/** The messages the old build kept for `persona` on this device (it stored a bare array). */
export function loadLegacyConversation(persona: CompanionPersona): CompanionMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_HISTORY_PREFIX + persona);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMessage).map(toMessage) : [];
  } catch {
    return [];
  }
}

function startsWith(messages: CompanionMessage[], head: CompanionMessage[]): boolean {
  return head.length > 0 && head.length <= messages.length
    && head.every((m, i) => messages[i].role === m.role && messages[i].content === m.content);
}

function declinedKey(userId: string): string {
  return LEGACY_DECLINED_PREFIX + userId;
}

/**
 * The personas whose old, device-global conversation this account should be
 * asked about: every persona with one on the device, unless this account
 * already said they are not its own.
 */
export function legacyCompanionOffer(userId: string | null | undefined): CompanionPersona[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    if (window.localStorage.getItem(declinedKey(userId))) return [];
  } catch {
    return [];
  }
  return COMPANION_PERSONAS.filter((p) => loadLegacyConversation(p).length > 0);
}

/** This account says the old conversations are not its own: never ask it again; leave them for their writer. */
export function declineLegacyCompanion(userId: string): void {
  try {
    window.localStorage.setItem(declinedKey(userId), '1');
  } catch {
    /* storage unavailable — the question comes back next time */
  }
}

/**
 * This account says the old conversations are its own: each one goes in
 * front of the account's conversation with that persona (older first,
 * under the account's conversation id and charge), and the device-global
 * copy is deleted. A conversation that was empty takes the old messages
 * under a fresh id with no charge seen, so the next message shows its
 * price. Returns the personas moved.
 */
export function claimLegacyCompanion(userId: string): CompanionPersona[] {
  const moved: CompanionPersona[] = [];
  for (const persona of COMPANION_PERSONAS) {
    const legacy = loadLegacyConversation(persona);
    if (legacy.length === 0) continue;
    const current = loadConversation(userId, persona);
    // Already in front (a claim whose delete did not land): not again.
    const merged: CompanionConversation = startsWith(current.messages, legacy)
      ? current
      : { ...current, messages: [...legacy, ...current.messages] };
    saveConversation(userId, persona, merged);
    // Delete the device copy only once the account's copy reads back whole.
    if (loadConversation(userId, persona).messages.length >= Math.min(merged.messages.length, MAX_STORED_MESSAGES)) {
      try {
        window.localStorage.removeItem(LEGACY_HISTORY_PREFIX + persona);
      } catch {
        /* storage unavailable — offered again next time; the check above keeps it from doubling */
      }
      moved.push(persona);
    }
  }
  clearLegacyCompanionCounters();
  return moved;
}

/** Delete the old build's device-global daily message counters. They hold no content. */
export function clearLegacyCompanionCounters(): void {
  if (typeof window === 'undefined') return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && LEGACY_DAILY_RE.test(k)) doomed.push(k);
    }
    for (const k of doomed) window.localStorage.removeItem(k);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
