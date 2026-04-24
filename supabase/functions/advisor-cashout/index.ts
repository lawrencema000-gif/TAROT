/**
 * Advisor cashout processor — wraps the advisor_cashout_request() RPC with a
 * Stripe Connect transfer.
 *
 * Flow:
 *   1. Call the RPC which atomically inserts a `pending` advisor_cashouts
 *      row and reserves the Moonstones. RPC throws on insufficient balance
 *      or missing Stripe Connect account.
 *   2. Resolve the advisor's stripe_account_id.
 *   3. Create a Stripe transfer to that connected account for payout_cents.
 *   4. Flip the cashout row to `paid` with stripe_transfer_id, OR `failed`
 *      with error_message (at which point we also need to UNDO the Moonstone
 *      hold — but our RPC actually doesn't debit; it just blocks future
 *      requests via the view's denominator. So failure state → a compensating
 *      insert of +N gift-receive won't double-count because the cashout row
 *      is already in 'failed' state and the view excludes failed rows).
 *      See migration note: the v_advisor_cashout_eligibility view sums
 *      cashouts in states pending/processing/paid. On failure, set state=
 *      'failed' so those Moonstones become available again.
 */

import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  moonstones: z.number().int().min(100).max(100_000),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  cashoutId: string;
  state: 'paid' | 'failed';
  payoutCents: number;
  platformFeeCents: number;
  transferId?: string;
}

// Deno.serve required on Supabase Edge Runtime when importing npm:stripe —
// `export default handler(...)` alone makes OPTIONS preflight hang 15s+.
Deno.serve(handler<Req, Resp>({
  fn: "advisor-cashout",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 3, windowMs: 60 * 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe not configured", 503);

    const { data: rpcData, error: rpcErr } = await ctx.supabase.rpc("advisor_cashout_request", {
      p_moonstones: body.moonstones,
    });
    if (rpcErr) {
      const msg = rpcErr.message.toLowerCase();
      if (msg.includes("insufficient")) throw new AppError("INSUFFICIENT_BALANCE", rpcErr.message, 422);
      if (msg.includes("onboarding")) throw new AppError("ONBOARDING_REQUIRED", "Complete Stripe Connect onboarding first", 402);
      if (msg.includes("only advisors")) throw new AppError("NOT_AN_ADVISOR", "Only advisors can cash out", 403);
      if (msg.includes("minimum cashout")) throw new AppError("MINIMUM_CASHOUT", rpcErr.message, 422);
      throw new AppError("RPC_FAILED", rpcErr.message, 500);
    }
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!row) throw new AppError("NO_ROW", "RPC returned no row", 500);

    const cashoutId  = row.cashout_id as string;
    const payoutCents = row.payout_cents as number;
    const platformFeeCents = row.platform_fee_cents as number;

    const { data: payoutAcct } = await ctx.supabase
      .from("advisor_payout_accounts")
      .select("stripe_account_id")
      .eq("user_id", ctx.userId!)
      .maybeSingle();
    if (!payoutAcct?.stripe_account_id) {
      await ctx.supabase
        .from("advisor_cashouts")
        .update({ state: "failed", error_message: "Missing Stripe account", processed_at: new Date().toISOString() })
        .eq("id", cashoutId);
      throw new AppError("STRIPE_ACCOUNT_MISSING", "Payout account not found", 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Mark processing
    await ctx.supabase.from("advisor_cashouts").update({ state: "processing" }).eq("id", cashoutId);

    try {
      const transfer = await stripe.transfers.create({
        amount: payoutCents,
        currency: "usd",
        destination: payoutAcct.stripe_account_id as string,
        metadata: {
          cashout_id: cashoutId,
          user_id: ctx.userId!,
          moonstones: String(body.moonstones),
        },
      });

      await ctx.supabase
        .from("advisor_cashouts")
        .update({
          state: "paid",
          stripe_transfer_id: transfer.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", cashoutId);

      ctx.log.info("advisor_cashout.paid", { cashoutId, transferId: transfer.id, payoutCents });

      return {
        cashoutId,
        state: "paid",
        payoutCents,
        platformFeeCents,
        transferId: transfer.id,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transfer failed";
      await ctx.supabase
        .from("advisor_cashouts")
        .update({
          state: "failed",
          error_message: msg,
          processed_at: new Date().toISOString(),
        })
        .eq("id", cashoutId);
      ctx.log.error("advisor_cashout.failed", { cashoutId, err: msg });
      throw new AppError("STRIPE_TRANSFER_FAILED", msg, 502);
    }
  },
}));
