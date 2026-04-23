import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Self-service account deletion (Apple App Store requirement).
//
// Strategy: soft-delete user profile + cascade-delete user-owned rows
// via the existing FK ON DELETE CASCADE constraints. We DON'T use
// auth.admin.deleteUser() directly because that requires service-role.
// Instead we:
//   1. Mark profile as deleted (display_name → 'Deleted user', email cleared)
//   2. Cascade deletes happen on all user-owned tables via FK
//   3. Call admin.deleteUser() server-side with service-role to remove from auth.users
//
// The user is signed out immediately after. They can re-register with the
// same email if they wish (this is now a fresh account).

Deno.serve(handler(async (req, { user }) => {
  if (req.method !== "POST") throw new AppError("method_not_allowed", "Method not allowed", 405);
  if (!user) throw new AppError("auth_required", "Authentication required", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError("misconfigured", "Server misconfigured", 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Cascade-delete happens via FK ON DELETE CASCADE when the auth user is deleted.
  // But first we mark the profile as deleted so any in-flight queries see consistent state.
  await admin
    .from("profiles")
    .update({
      display_name: "Deleted user",
      email: null,
      is_guest: true,
      birth_date: null,
      birth_time: null,
      birth_place: null,
      birth_lat: null,
      birth_lon: null,
      timezone: null,
      goals: null,
      mbti_type: null,
      love_language: null,
      tone_preference: null,
      avatar_seed: null,
      background_url: null,
      card_back_url: null,
    })
    .eq("id", user.id);

  // Delete the auth user — cascades to all tables with FK on auth.users
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    throw new AppError("delete_failed", `Failed to delete account: ${deleteErr.message}`, 500);
  }

  return { deleted: true, userId: user.id };
}));
