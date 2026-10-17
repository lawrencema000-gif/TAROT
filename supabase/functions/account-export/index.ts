/**
 * GDPR data export (Article 20 right-to-data-portability).
 *
 * Uses service-role to bypass RLS and collect every row the user owns
 * across the tables where they can have data (spec.ts). Returns a single
 * JSON blob the client downloads as a file.
 *
 * Security:
 *   - auth: "required" — only the account owner gets their own data
 *   - rate limit: 3/hour — exports are large; one per couple hours is fine
 *   - empty request schema
 *   - own rows only, by one owner column per table: no block made against
 *     the caller, and no anonymous author behind a block (spec.ts)
 */

import { AppError, handler } from "../_shared/handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";
import { EXPORT_SPECS, isMissingTable } from "./spec.ts";

const RequestSchema = z.object({}).strict();
type Req = z.infer<typeof RequestSchema>;

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

    for (const spec of EXPORT_SPECS) {
      const { data, error } = await admin.from(spec.table).select(spec.columns).eq(spec.ownerColumn, uid);

      if (error && !isMissingTable(error)) {
        exportPayload[spec.table] = { error: error.message };
      } else {
        exportPayload[spec.table] = data ?? [];
      }
    }

    ctx.log.info("account_export.ok", { userId: uid, tables: EXPORT_SPECS.length });
    return exportPayload;
  },
}));
