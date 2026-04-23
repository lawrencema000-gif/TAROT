import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// GDPR data export. Returns a single JSON blob of every table the user
// owns rows in. Client downloads this as a .json file from Settings.

Deno.serve(handler(async (req, { user }) => {
  if (req.method !== "POST") throw new AppError("method_not_allowed", "Method not allowed", 405);
  if (!user) throw new AppError("auth_required", "Authentication required", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError("misconfigured", "Server misconfigured", 500);
  }

  // Use service-role to bypass RLS so we can read everything the user
  // owns, even from tables where they'd normally need a specific policy.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const uid = user.id;
  const tables = [
    "profiles",
    "journal_entries",
    "tarot_readings",
    "daily_rituals",
    "quiz_results",
    "saved_highlights",
    "content_interactions",
    "premium_readings",
    "rewarded_ad_unlocks",
    "community_posts",
    "community_comments",
    "community_reactions",
    "community_reports",
    "community_blocks",
    "moonstone_transactions",
    "moonstone_daily_checkins",
    "advisor_interest",
    "subscriptions",
    "user_preferences",
  ];

  const exportPayload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: uid,
    user_email: user.email,
  };

  for (const table of tables) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .or(table === "community_blocks"
        ? `blocker_id.eq.${uid},blocked_id.eq.${uid}`
        : table === "community_reports"
          ? `reporter_id.eq.${uid}`
          : table === "profiles"
            ? `id.eq.${uid}`
            : `user_id.eq.${uid}`);

    // Silently skip tables that don't exist in this deployment
    if (error && !/relation.*does not exist/.test(error.message)) {
      exportPayload[table] = { error: error.message };
    } else {
      exportPayload[table] = data ?? [];
    }
  }

  return exportPayload;
}));
