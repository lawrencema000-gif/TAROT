/**
 * Self-service account deletion (Apple App Store + GDPR requirement).
 *
 * Strategy:
 *   1. Redact the profile row (name, email, PII) so any in-flight queries
 *      see consistent "deleted user" state before the cascade.
 *   2. Call admin.deleteUser() via service-role — cascades to every table
 *      with `ON DELETE CASCADE` on auth.users(id).
 *   3. The user is signed out client-side immediately after.
 *
 * Security:
 *   - auth: "required" — only the account owner can delete their own
 *   - rate limit: 3/hour — nobody needs to delete faster than that
 *   - empty request schema so the body can't carry any spoofed fields
 */

import { AppError, handler } from "../_shared/handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({}).strict();
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  deleted: true;
  userId: string;
}

export default handler<Req, Resp>({
  fn: "account-delete",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 3, windowMs: 60 * 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new AppError("MISCONFIGURED", "Server misconfigured", 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userId = ctx.userId!;

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
      .eq("id", userId);

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      ctx.log.error("account_delete.failed", { err: deleteErr.message, userId });
      throw new AppError(
        "DELETE_FAILED",
        `Failed to delete account: ${deleteErr.message}`,
        500,
      );
    }

    ctx.log.info("account_delete.ok", { userId });
    return { deleted: true, userId };
  },
});
