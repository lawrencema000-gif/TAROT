import { supabase } from '../lib/supabase';

export type ModerationVerdict = 'allow' | 'review' | 'block';
export type ModerationSurface = 'post' | 'comment' | 'whispering-well';

export interface ModerationResult {
  verdict: ModerationVerdict;
  crisis: boolean;
  categories: string[];
  /** set when the call also published the content */
  publishedId?: string;
  publishedStatus?: 'allowed' | 'flagged';
  crisisResources?: {
    us: { name: string; number: string };
    textLine: { name: string; instructions: string };
    international: string;
  };
}

export interface PublishOptions {
  topic?: string;
  isAnonymous?: boolean;
  /** required when surface is 'comment' */
  postId?: string;
}

type CrisisResources = NonNullable<ModerationResult['crisisResources']>;

function isCrisisResources(v: unknown): v is CrisisResources {
  const r = v as Partial<CrisisResources> | null;
  return !!r && typeof r === 'object' && typeof r.us?.number === 'string' && typeof r.textLine?.instructions === 'string';
}

/**
 * The verdict a 422 CONTENT_BLOCKED carries, or null for any other error.
 * A refused post can still come from someone in crisis: the server puts
 * `crisis` and the helplines in the envelope's `details`, and they are
 * passed on so the Community page shows them instead of the guidelines
 * notice (p7 #6). A 422 whose body can't be read is still a block.
 */
export async function blockedResult(error: unknown): Promise<ModerationResult | null> {
  const ctx = (error as { context?: unknown } | null)?.context as Response | undefined;
  if (!ctx || ctx.status !== 422) return null;
  let details: Record<string, unknown> = {};
  try {
    const body = (await ctx.clone().json()) as { error?: { details?: unknown } };
    const d = body?.error?.details;
    if (d && typeof d === 'object') details = d as Record<string, unknown>;
  } catch {
    // unreadable body: a plain block
  }
  const categories = Array.isArray(details.categories)
    ? details.categories.filter((c): c is string => typeof c === 'string')
    : [];
  const crisisResources = isCrisisResources(details.crisisResources) ? details.crisisResources : undefined;
  return {
    verdict: 'block',
    crisis: details.crisis === true,
    categories,
    ...(crisisResources ? { crisisResources } : {}),
  };
}

/**
 * Screen AND publish in one server-side call.
 *
 * This is the ONLY way to get content into the public feed. A direct client
 * insert is force-pending by DB trigger and pending rows are invisible under
 * RLS, so screening can't be skipped by talking to the REST API directly —
 * which was possible before, when moderation ran only in the client.
 *
 * Returns verdict + the created row id. 'review' content is published as
 * 'flagged' (author + admins only) rather than silently discarded.
 */
export async function publishContent(
  content: string,
  surface: ModerationSurface,
  publish: PublishOptions,
): Promise<ModerationResult & { error?: string }> {
  const { data, error } = await supabase.functions.invoke('community-moderate', {
    body: { content, surface, publish },
  });

  if (error) {
    const blocked = await blockedResult(error);
    if (blocked) return blocked;
    // Fail CLOSED: nothing is published. Better an honest retry than a post
    // the author believes is live but nobody can see.
    return { verdict: 'review', crisis: false, categories: [], error: 'unavailable' };
  }

  return (data as { data?: ModerationResult })?.data ?? (data as ModerationResult);
}

/**
 * Calls the community-moderate edge function to check content before
 * writing a post or comment. Returns the verdict. Throws on hard
 * network errors — the caller can decide to fail-open or fail-closed.
 *
 * The edge function returns HTTP 422 CONTENT_BLOCKED for disallowed
 * content; this wrapper translates that into { verdict: 'block' } so
 * callers don't need to sniff status codes.
 */
export async function moderateContent(
  content: string,
  surface: ModerationSurface,
): Promise<ModerationResult> {
  const { data, error } = await supabase.functions.invoke('community-moderate', {
    body: { content, surface },
  });

  if (error) {
    // Supabase SDK sets `error` on any non-2xx. For 422 (CONTENT_BLOCKED)
    // we still want to surface the result shape.
    const blocked = await blockedResult(error);
    if (blocked) return blocked;
    // Soft-fail: if the moderation service is down, treat as review (write
    // but flag) rather than blocking posting entirely. The server still
    // enforces moderation on its own ingest if we add server-side triggers.
    return { verdict: 'review', crisis: false, categories: [] };
  }

  const result = (data as { data?: ModerationResult })?.data ?? (data as ModerationResult);
  return result;
}
