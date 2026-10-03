/**
 * The Companion's device-side memory: one conversation per (account,
 * persona), plus the per-day message counter.
 *
 * Scoped by ACCOUNT. The first version kept `arcana_companion_v1_<persona>`
 * and `arcana_companion_daily_<date>` device-global, so on a shared phone the
 * next account to open /companion read the previous account's private
 * conversation and inherited its message count (the same storage pattern as
 * the mood-diary leak, P7 review #1). The legacy keys are never read; sign-
 * out deletes them (AuthContext → clearLegacyCompanionCache).
 *
 * Each conversation carries a stable `conversationId` (uuid). The server
 * charges Moonstones once per conversation, keyed on it, so every reply in
 * a conversation is covered by the one charge the cost line names; "New
 * conversation" starts a new id (and a new charge).
 */

export type CompanionPersona = 'sage' | 'oracle' | 'mystic' | 'priestess';

export interface CompanionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CompanionConversation {
  conversationId: string;
  messages: CompanionMessage[];
}

const LEGACY_HISTORY_PREFIX = 'arcana_companion_v1_';
const LEGACY_DAILY_RE = /^arcana_companion_daily_\d{4}-\d{2}-\d{2}$/;
const HISTORY_PREFIX = 'arcana_companion_v2:';
const DAILY_PREFIX = 'arcana_companion_daily_v2:';
/** Bound on stored messages per conversation. */
export const MAX_STORED_MESSAGES = 40;

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

function isMessage(m: unknown): m is CompanionMessage {
  const v = m as CompanionMessage | null;
  return !!v && (v.role === 'user' || v.role === 'assistant') && typeof v.content === 'string';
}

/** This account's conversation with `persona`; a fresh empty one when there is none. */
export function loadConversation(userId: string | null | undefined, persona: CompanionPersona): CompanionConversation {
  const empty = (): CompanionConversation => ({ conversationId: newConversationId(), messages: [] });
  if (!userId || typeof window === 'undefined') return empty();
  try {
    const raw = window.localStorage.getItem(historyKey(userId, persona));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<CompanionConversation>;
    const messages = Array.isArray(parsed.messages) ? parsed.messages.filter(isMessage) : [];
    const conversationId = typeof parsed.conversationId === 'string' && UUID_RE.test(parsed.conversationId)
      ? parsed.conversationId
      : newConversationId();
    return { conversationId, messages };
  } catch {
    return empty();
  }
}

export function saveConversation(userId: string, persona: CompanionPersona, convo: CompanionConversation): void {
  try {
    const trimmed: CompanionConversation = {
      conversationId: convo.conversationId,
      messages: convo.messages.slice(-MAX_STORED_MESSAGES),
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

/** Delete the pre-scoping, device-global companion keys. Called on sign-out. */
export function clearLegacyCompanionCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith(LEGACY_HISTORY_PREFIX) || LEGACY_DAILY_RE.test(k))) doomed.push(k);
    }
    for (const k of doomed) window.localStorage.removeItem(k);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
