/**
 * Advisor cashout processor — wraps the advisor_cashout_request() RPC with a
 * Stripe Connect transfer.
 *
 * Flow:
 *   1. Call the RPC AS THE ADVISOR (ctx.userSupabase — the RPC derives the
 *      advisor from auth.uid(), so on the service-role client it always said
 *      'Not authenticated'). It atomically inserts a `pending`
 *      advisor_cashouts row and debits the Moonstones in the same transaction
 *      (kind 'cashout', migration 20261003000006). It throws on insufficient
 *      balance or a missing Stripe Connect account. While the marketplace
 *      flag is off, EXECUTE on the RPC is revoked from `authenticated`
 *      (20260817020000), so this call fails closed with 42501 until the launch
 *      checklist re-grants it.
 *   2. Resolve the advisor's stripe_account_id.
 *   3. Create a Stripe transfer to that connected account for payout_cents,
 *      idempotent on the cashout id (a retried request cannot pay twice).
 *   4. Flip the cashout row to `paid` with stripe_transfer_id, OR fail it
 *      through advisor_cashout_fail_srv, which sets `failed` and writes the
 *      compensating 'refund' row so the debited Moonstones come back (once).
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

    // The advisor's own client: auth.uid() inside the RPC must be the advisor.
    const userSupabase = ctx.userSupabase;
    if (!userSupabase) throw new AppError("UNAUTHORIZED", "Authentication required", 401);

    const { data: rpcData, error: rpcErr } = await userSupabase.rpc("advisor_cashout_request", {
      p_moonstones: body.moonstones,
    });
    if (rpcErr) {
      const msg = rpcErr.message.toLowerCase();
      if (rpcErr.code === "42501" || msg.includes("permission denied")) {
        throw new AppError("ADVISORS_DISABLED", "Advisor cashouts are not open yet", 403);
      }
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
      await failCashout(ctx.supabase, cashoutId, "Missing Stripe account");
      throw new AppError("STRIPE_ACCOUNT_MISSING", "Payout account not found", 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Mark processing
    await ctx.supabase.from("advisor_cashouts").update({ state: "processing" }).eq("id", cashoutId);

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: payoutCents,
          currency: "usd",
          destination: payoutAcct.stripe_account_id as string,
          metadata: {
            cashout_id: cashoutId,
            user_id: ctx.userId!,
            moonstones: String(body.moonstones),
          },
        },
        // One transfer per cashout row, however many times the request is retried.
        { idempotencyKey: `cashout_${cashoutId}` },
      );

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
      await failCashout(ctx.supabase, cashoutId, msg);
      ctx.log.error("advisor_cashout.failed", { cashoutId, err: msg });
      throw new AppError("STRIPE_TRANSFER_FAILED", msg, 502);
    }
  },
}));

/**
 * Fail a cashout and return its Moonstones in one transaction
 * (advisor_cashout_fail_srv, service role only). The RPC acts once — a
 * second call on the same row is a no-op — so a retried failure path cannot
 * refund twice.
 */
async function failCashout(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> },
  cashoutId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("advisor_cashout_fail_srv", {
    p_cashout_id: cashoutId,
    p_error: reason,
  });
  if (error) {
    // Surface loudly: a cashout stuck in 'processing' with debited stones is
    // exactly the state the RPC exists to prevent.
    console.error("advisor_cashout.fail_rpc_failed", { cashoutId, err: error.message });
  }
}
