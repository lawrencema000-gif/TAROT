import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.24.1";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * Rewarded-ad Moonstone credit.
 *
 * The client used to call the SECURITY DEFINER RPC moonstone_credit_for_ad
 * directly, with any ad-event id and any amount up to 200 — which is how a
 * QA balance went 100 → 710 with zero ads watched (p7-ai-audit §0.1). That
 * RPC is now service-role only (20261003000005). The credit runs here as the
 * service role, through moonstone_credit_for_ad_srv, which fixes the amount
 * at 50 and enforces per user: at most 6 credits per UTC day, at least 20 s
 * between credits, and idempotency on the client's ad_event_id (a replay
 * returns the same outcome and is not another ad).
 *
 * Bounded exposure without AdMob server-side verification: 300 Moonstones
 * per user per day. True verification is the AdMob SSV callback (a signed
 * GET from Google) — an AdMob console task for the owner; this function is
 * where that callback would be verified and the credit issued instead of on
 * the client's word.
 */

const RequestSchema = z.object({
  adEventId: z.string().min(8).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  amountCredited: number;
  newBalance: number;
  alreadyCredited: boolean;
}

Deno.serve(
  handler<Req, Resp>({
    fn: "ad-reward",
    auth: "required",
    methods: ["POST"],
    rateLimit: { max: 12, windowMs: 60_000 },
    requestSchema: RequestSchema,
    run: async (ctx, body) => {
      const { data, error } = await ctx.supabase.rpc("moonstone_credit_for_ad_srv", {
        p_user_id: ctx.userId,
        p_ad_event_id: body.adEventId,
      });

      if (error) {
        const msg = error.message ?? "";
        if (msg.startsWith("AD_DAILY_CAP")) {
          throw new AppError(
            "AD_DAILY_CAP",
            "You have earned today's rewarded-ad Moonstones. Come back tomorrow.",
            429,
          );
        }
        if (msg.startsWith("AD_TOO_SOON")) {
          throw new AppError("AD_TOO_SOON", "Give it a moment before the next ad.", 429);
        }
        ctx.log.error("ad_reward.rpc_failed", { err: msg });
        throw new AppError("CREDIT_FAILED", "Could not credit the reward", 500);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new AppError("NO_ROW", "RPC returned no row", 500);

      const result: Resp = {
        amountCredited: Number(row.amount_credited ?? 0),
        newBalance: Number(row.new_balance ?? 0),
        alreadyCredited: Boolean(row.already_credited),
      };
      ctx.log.info("ad_reward.credited", {
        amount: result.amountCredited,
        alreadyCredited: result.alreadyCredited,
      });
      return result;
    },
  }),
);
