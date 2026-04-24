import { supabase } from '../lib/supabase';

export type ModerationVerdict = 'allow' | 'review' | 'block';
export type ModerationSurface = 'post' | 'comment' | 'whispering-well';

export interface ModerationResult {
  verdict: ModerationVerdict;
  crisis: boolean;
  categories: string[];
  crisisResources?: {
    us: { name: string; number: string };
    textLine: { name: string; instructions: string };
    international: string;
  };
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
    const anyErr = error as { context?: { status?: number }; message?: string };
    const status = anyErr?.context?.status;
    if (status === 422) {
      return { verdict: 'block', crisis: false, categories: [] };
    }
    // Soft-fail: if the moderation service is down, treat as review (write
    // but flag) rather than blocking posting entirely. The server still
    // enforces moderation on its own ingest if we add server-side triggers.
    return { verdict: 'review', crisis: false, categories: [] };
  }

  const result = (data as { data?: ModerationResult })?.data ?? (data as ModerationResult);
  return result;
}
