import { createClient } from "npm:@supabase/supabase-js@2.57.4";

/** Create a Supabase admin client (service role). */
export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/**
 * Extract and verify the user JWT from the Authorization header.
 * Returns the authenticated user or null if invalid/missing.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(url, anonKey);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

/**
 * Validate a webhook secret against the Authorization header.
 * Used for server-to-server webhooks (RevenueCat, Stripe, etc.).
 */
export function validateWebhookSecret(
  req: Request,
  expectedSecret: string
): boolean {
  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${expectedSecret}`;
}
