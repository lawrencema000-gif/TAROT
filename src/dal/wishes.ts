// The Wishing Sky — data access for the shared star map.
//
// Every wish is a star everyone can see. Contact details are deliberately not
// part of a wish: reaching a wisher goes through an offer, which is private to
// the two people involved. See the header of
// supabase/migrations/20260817040000_wish_stars.sql for why.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type WishTheme =
  | 'love' | 'health' | 'family' | 'work' | 'home' | 'healing' | 'someone_else' | 'other';

export const WISH_THEMES: { key: WishTheme; label: string; hue: number }[] = [
  // Hue drives the star colour on the map, so a sky read at a glance already
  // shows what people are wishing for.
  { key: 'love', label: 'Love', hue: 340 },
  { key: 'health', label: 'Health', hue: 150 },
  { key: 'family', label: 'Family', hue: 30 },
  { key: 'work', label: 'Work', hue: 200 },
  { key: 'home', label: 'Home', hue: 45 },
  { key: 'healing', label: 'Healing', hue: 280 },
  { key: 'someone_else', label: 'For someone else', hue: 190 },
  { key: 'other', label: 'Something else', hue: 220 },
];

export interface Wish {
  id: string;
  userId: string;
  text: string;
  theme: WishTheme;
  starX: number;
  starY: number;
  starSeed: number;
  openToHelp: boolean;
  wisherLabel: string | null;
  grantedAt: string | null;
  echoCount: number;
  createdAt: string;
}

export interface WishEcho {
  wishId: string;
  userId: string;
}

export interface WishOffer {
  id: string;
  wishId: string;
  helperId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

/**
 * Contact details are rejected before a wish is ever sent.
 *
 * The database enforces this too — it is the whole privacy design and must not
 * live only in React — but catching it here lets us explain WHY in the moment,
 * instead of surfacing a raw constraint error.
 *
 * Matches a run of 7+ digits (allowing the separators people actually type) or
 * an email address. Deliberately a little eager: a false positive costs someone
 * a rephrase, a false negative publishes a phone number to the whole app.
 */
const EMAIL_RE = /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i;
/** Separators people put inside a number. Stripped before counting digits. */
const PHONE_SEPARATORS = /[\s().+,-]/g;

export function findsContactDetails(text: string): 'phone' | 'email' | null {
  if (EMAIL_RE.test(text)) return 'email';
  // Count DIGITS, not characters. An earlier version matched a run of 8+
  // characters, which let a bare 7-digit number through — and 7 digits is a
  // perfectly ordinary local number. Collapse the separators first, so
  // "555-019-2837", "555 019 2837" and "5550192837" are all the same thing.
  if (/\d{7,}/.test(text.replace(PHONE_SEPARATORS, ''))) return 'phone';
  return null;
}

/**
 * Where a new star lands.
 *
 * A uniform scatter reads as noise rather than as a sky, so stars are drawn
 * toward a soft diagonal band — the same trick that makes a painted galaxy feel
 * like one. Pure and seedable so the placement can be tested rather than
 * eyeballed.
 *
 * Returns fractions of the map in [0.02, 0.98], keeping stars off the edges
 * where a glow would be clipped.
 */
export function assignStarPosition(seed: number): { x: number; y: number } {
  // A cheap deterministic hash — good enough for scatter, and stable per seed.
  const rand = (n: number) => {
    const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const x = rand(1);
  // Pull toward the band: average two samples (a triangular distribution) then
  // offset by the diagonal so the dense stripe runs corner to corner.
  const spread = (rand(2) + rand(3)) / 2;
  const band = 0.5 + (x - 0.5) * 0.6;
  const y = band + (spread - 0.5) * 0.7;
  const clamp = (v: number) => Math.min(0.98, Math.max(0.02, v));
  return { x: clamp(x), y: clamp(y) };
}

function mapWish(r: Record<string, unknown>): Wish {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    text: r.text as string,
    theme: (r.theme as WishTheme) ?? 'other',
    starX: Number(r.star_x),
    starY: Number(r.star_y),
    starSeed: Number(r.star_seed ?? 0),
    openToHelp: Boolean(r.open_to_help),
    wisherLabel: (r.wisher_label as string) ?? null,
    grantedAt: (r.granted_at as string) ?? null,
    echoCount: Number(r.echo_count ?? 0),
    createdAt: r.created_at as string,
  };
}

const WISH_COLUMNS =
  'id, user_id, text, theme, star_x, star_y, star_seed, open_to_help, wisher_label, granted_at, echo_count, created_at';

/** The sky. Newest first; the map itself does not care about order. */
export async function listSky(limit = 2000): Promise<Result<Wish[]>> {
  const { data, error } = await supabase
    .from('wishes')
    .select(WISH_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    captureException('dal.wishes.listSky', error);
    return { ok: false, error: 'Could not load the sky.' };
  }
  return { ok: true, data: (data ?? []).map(mapWish) };
}

export interface NewWish {
  text: string;
  theme: WishTheme;
  openToHelp: boolean;
  wisherLabel?: string | null;
}

export async function makeWish(userId: string, input: NewWish): Promise<Result<Wish>> {
  const contact = findsContactDetails(input.text);
  if (contact) {
    return {
      ok: false,
      error:
        contact === 'email'
          ? 'Please take the email address out — a wish is public. Turn on “open to help” and people can reach you privately instead.'
          : 'Please take the phone number out — a wish is public. Turn on “open to help” and people can reach you privately instead.',
    };
  }

  const seed = Math.floor(Math.random() * 100000);
  const { x, y } = assignStarPosition(seed);

  const { data, error } = await supabase
    .from('wishes')
    .insert({
      user_id: userId,
      text: input.text.trim(),
      theme: input.theme,
      open_to_help: input.openToHelp,
      wisher_label: input.wisherLabel?.trim() || null,
      star_x: x,
      star_y: y,
      star_seed: seed,
    })
    .select(WISH_COLUMNS)
    .single();

  if (error) {
    captureException('dal.wishes.makeWish', error);
    return { ok: false, error: 'Could not light your star. Try again.' };
  }
  return { ok: true, data: mapWish(data as Record<string, unknown>) };
}

export async function listEchoes(): Promise<Result<WishEcho[]>> {
  const { data, error } = await supabase.from('wish_echoes').select('wish_id, user_id');
  if (error) {
    captureException('dal.wishes.listEchoes', error);
    return { ok: false, error: 'Could not load the links.' };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({ wishId: r.wish_id as string, userId: r.user_id as string })),
  };
}

/** Echoing is a toggle — wishing it for someone, and taking it back. */
export async function echo(wishId: string, userId: string): Promise<Result<true>> {
  const { error } = await supabase.from('wish_echoes').insert({ wish_id: wishId, user_id: userId });
  if (error) {
    if (error.code === '23505') return { ok: true, data: true }; // already echoed
    captureException('dal.wishes.echo', error);
    return { ok: false, error: 'Could not add your echo.' };
  }
  return { ok: true, data: true };
}

export async function unecho(wishId: string, userId: string): Promise<Result<true>> {
  const { error } = await supabase
    .from('wish_echoes').delete().eq('wish_id', wishId).eq('user_id', userId);
  if (error) {
    captureException('dal.wishes.unecho', error);
    return { ok: false, error: 'Could not remove your echo.' };
  }
  return { ok: true, data: true };
}

/**
 * Offer to help with a wish.
 *
 * This is the whole reason the map carries no phone numbers: the message goes
 * to the wisher privately, and they decide whether to answer.
 */
export async function offerHelp(
  wishId: string, helperId: string, message: string,
): Promise<Result<true>> {
  const { error } = await supabase
    .from('wish_offers').insert({ wish_id: wishId, helper_id: helperId, message: message.trim() });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'You have already offered to help with this wish.' };
    captureException('dal.wishes.offerHelp', error);
    return { ok: false, error: 'Could not send your offer.' };
  }
  return { ok: true, data: true };
}

/** Offers on your own wishes, plus offers you have sent. RLS scopes it. */
export async function listOffers(): Promise<Result<WishOffer[]>> {
  const { data, error } = await supabase
    .from('wish_offers')
    .select('id, wish_id, helper_id, message, status, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    captureException('dal.wishes.listOffers', error);
    return { ok: false, error: 'Could not load offers.' };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id as string,
      wishId: r.wish_id as string,
      helperId: r.helper_id as string,
      message: r.message as string,
      status: r.status as WishOffer['status'],
      createdAt: r.created_at as string,
    })),
  };
}

export async function respondToOffer(
  offerId: string, status: 'accepted' | 'declined',
): Promise<Result<true>> {
  const { error } = await supabase.from('wish_offers').update({ status }).eq('id', offerId);
  if (error) {
    captureException('dal.wishes.respondToOffer', error);
    return { ok: false, error: 'Could not respond.' };
  }
  return { ok: true, data: true };
}

export async function report(wishId: string, userId: string, reason?: string): Promise<Result<true>> {
  const { error } = await supabase
    .from('wish_reports').insert({ wish_id: wishId, user_id: userId, reason: reason ?? null });
  if (error) {
    if (error.code === '23505') return { ok: true, data: true }; // already reported
    captureException('dal.wishes.report', error);
    return { ok: false, error: 'Could not send the report.' };
  }
  return { ok: true, data: true };
}

/**
 * The bright lines.
 *
 * An echo connects two PEOPLE, so it is drawn between the echoer's own most
 * recent star and the star they echoed. Someone who has not wished yet still
 * adds to the count — they just have no star to draw from, which is a quiet
 * reason to make one.
 */
export function buildLinks(
  wishes: Wish[], echoes: WishEcho[],
): { from: Wish; to: Wish }[] {
  const byId = new Map(wishes.map((w) => [w.id, w]));
  const latestByUser = new Map<string, Wish>();
  for (const w of wishes) {
    const cur = latestByUser.get(w.userId);
    if (!cur || w.createdAt > cur.createdAt) latestByUser.set(w.userId, w);
  }
  const out: { from: Wish; to: Wish }[] = [];
  const seen = new Set<string>();
  for (const e of echoes) {
    const to = byId.get(e.wishId);
    const from = latestByUser.get(e.userId);
    if (!to || !from || from.id === to.id) continue;
    const key = from.id < to.id ? `${from.id}:${to.id}` : `${to.id}:${from.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from, to });
  }
  return out;
}
