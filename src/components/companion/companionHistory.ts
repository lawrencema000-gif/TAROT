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
  /**
   * When a message this conversation was not covered for went out and no
   * reply came back (epoch ms; the first such send since the last reply).
   * The server may have taken the conversation's charge then — a reply
   * lost on its way back — so a later reply that reports the conversation
   * already paid (`conversationPaid`) dates the 24 hours from here, and
   * resending is not held at the balance gate (p9 R09). Cleared by a reply.
   */
  pendingSince?: number;
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

/**
 * Bound on the messages sent with each request (p9 R23). ai-companion-chat
 * refuses a history of more than 100 messages (400 INVALID_REQUEST, before
 * any charge) and reads only the last 20 (MAX_HISTORY_MESSAGES); a thread
 * that loaded at 80 used to pass 100 on the eleventh message of a visit,
 * and every send after that failed as "check your connection". 40 is room
 * to spare on both sides.
 */
export const MAX_SENT_MESSAGES = 40;
/** ai-companion-chat's bound on one message's content. */
const MAX_SENT_CONTENT = 4000;

/** The messages a request carries: the last MAX_SENT_MESSAGES of the thread, each within the function's bound. */
export function historyToSend(messages: CompanionMessage[]): Array<{ role: CompanionMessage['role']; content: string }> {
  return messages.slice(-MAX_SENT_MESSAGES).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_SENT_CONTENT) }));
}

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
 * Whether a send whose reply never came back may already have paid for
 * this conversation: one went out (uncovered) less than 24 hours ago. Its
 * resend is then not held at the balance gate — the server answers it
 * free if the charge was taken, and refuses (402) only if it was not and
 * the balance is short — so a charge that left the reader under 50 does
 * not block the reply it paid for (p9 R09).
 */
export function mayBePaid(convo: Pick<CompanionConversation, 'messages' | 'pendingSince'>, now: number = Date.now()): boolean {
  if (typeof convo.pendingSince !== 'number') return false;
  const age = now - convo.pendingSince;
  return age >= 0 && age < CONVERSATION_COVER_MS - COVER_MARGIN_MS;
}

/**
 * The conversation as a message it is not covered for goes out: marked
 * with the send time (the first since the last reply, while that can still
 * be the charge), so a reply lost after the server charged is not read
 * later as "nothing paid".
 */
export function markPending(convo: CompanionConversation, now: number = Date.now()): CompanionConversation {
  return mayBePaid(convo, now) ? convo : { ...convo, pendingSince: now };
}

/**
 * The conversation with no send pending: after a refusal for the balance
 * (402 / soft cap). That refusal comes before any debit, and a send that
 * had been charged would have made this one free — so nothing is paid.
 */
export function withoutPending(convo: CompanionConversation): CompanionConversation {
  return {
    conversationId: convo.conversationId,
    messages: convo.messages,
    ...(typeof convo.chargedAt === 'number' ? { chargedAt: convo.chargedAt } : {}),
  };
}

/**
 * The conversation's `chargedAt` after a reply. `charged`: this message
 * took the conversation's charge — the 24 hours start now.
 * `conversationPaid`: it was free, the conversation being paid already;
 * when this device was not counting it as covered, the live charge is the
 * last one it saw (if that is still inside the server's 24 hours — the
 * page reads the window as closing a few minutes early) or else the send
 * whose reply was lost (`pendingSince`; p9 R09 — the free retry used to
 * stay "not covered" for the whole day, priced and gated on every
 * message). The earliest of those counts, so the window is never read as
 * running later than it does. Knowing neither, nothing is assumed. An
 * older server that reports nothing is read as having charged a message
 * the conversation was not covered for.
 */
export function chargedAtAfterReply(
  convo: Pick<CompanionConversation, 'messages' | 'chargedAt' | 'pendingSince'>,
  reply: { charged?: boolean; conversationPaid?: boolean },
  wasCovered: boolean,
  now: number = Date.now(),
): number | undefined {
  if (reply.charged === true) return now;
  if (reply.conversationPaid === true && !wasCovered) {
    const live = [convo.chargedAt, convo.pendingSince].filter(
      (at): at is number => typeof at === 'number' && at <= now && now - at < CONVERSATION_COVER_MS,
    );
    if (live.length > 0) return Math.min(...live);
  }
  if (reply.charged === undefined && reply.conversationPaid === undefined && !wasCovered) return now;
  return convo.chargedAt;
}

/** The conversation once a reply has landed: the reply added, the thread bounded, the charge dated, no send pending. */
export function afterReply(
  base: CompanionConversation,
  messages: CompanionMessage[],
  reply: { charged?: boolean; conversationPaid?: boolean },
  wasCovered: boolean,
  now: number = Date.now(),
): CompanionConversation {
  const chargedAt = chargedAtAfterReply(base, reply, wasCovered, now);
  return {
    conversationId: base.conversationId,
    // The in-memory thread is held to what is stored (p9 R23), so a long
    // visit reads like a reload.
    messages: messages.slice(-MAX_STORED_MESSAGES),
    ...(typeof chargedAt === 'number' ? { chargedAt } : {}),
  };
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
    return { conversationId, messages, ...timesOf(parsed) };
  } catch {
    return empty();
  }
}

/** A stored conversation's `chargedAt` and `pendingSince`, when they are numbers. */
function timesOf(p: Partial<CompanionConversation>): Pick<CompanionConversation, 'chargedAt' | 'pendingSince'> {
  return {
    ...(typeof p.chargedAt === 'number' && Number.isFinite(p.chargedAt) ? { chargedAt: p.chargedAt } : {}),
    ...(typeof p.pendingSince === 'number' && Number.isFinite(p.pendingSince) ? { pendingSince: p.pendingSince } : {}),
  };
}

export function saveConversation(userId: string, persona: CompanionPersona, convo: CompanionConversation): void {
  try {
    const trimmed: CompanionConversation = {
      conversationId: convo.conversationId,
      messages: convo.messages.slice(-MAX_STORED_MESSAGES),
      ...timesOf(convo),
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
 * (p8 F02/F10). Kept per account while that charge covers it — or may
 * (an opener or follow-up whose reply was lost: `pendingSince`, p9 R09) —
 * so leaving the page does not lose a conversation that is paid for.
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
            ...timesOf(c),
          }
        : null;
    if (
      !conversation ||
      typeof p.cardId !== 'number' ||
      (!conversationCovered(conversation, now) && !mayBePaid(conversation, now))
    ) {
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
