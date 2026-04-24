/**
 * GDPR data export (Article 20 right-to-data-portability).
 *
 * Uses service-role to bypass RLS and collect every row the user owns
 * across the 19 tables where they can have data. Returns a single JSON
 * blob the client downloads as a file.
 *
 * Security:
 *   - auth: "required" — only the account owner gets their own data
 *   - rate limit: 3/hour — exports are large; one per couple hours is fine
 *   - empty request schema
 */

import { AppError, handler } from "../_shared/handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({}).strict();
type Req = z.infer<typeof RequestSchema>;

const TABLES_OWNED_BY_USER = [
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

Deno.serve(handler<Req, Record<string, unknown>>({
  fn: "account-export",
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

    const uid = ctx.userId!;
    const exportPayload: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: uid,
      user_email: ctx.user?.email ?? null,
    };

    for (const table of TABLES_OWNED_BY_USER) {
      const filter =
        table === "community_blocks"
          ? `blocker_id.eq.${uid},blocked_id.eq.${uid}`
          : table === "community_reports"
            ? `reporter_id.eq.${uid}`
            : table === "profiles"
              ? `id.eq.${uid}`
              : `user_id.eq.${uid}`;

      const { data, error } = await admin.from(table).select("*").or(filter);

      if (error && !/relation.*does not exist/.test(error.message)) {
        exportPayload[table] = { error: error.message };
      } else {
        exportPayload[table] = data ?? [];
      }
    }

    ctx.log.info("account_export.ok", { userId: uid, tables: TABLES_OWNED_BY_USER.length });
    return exportPayload;
  },
}));
