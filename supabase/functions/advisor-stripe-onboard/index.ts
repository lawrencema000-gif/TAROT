/**
 * Creates or refreshes a Stripe Connect Express onboarding link for an
 * advisor. Call it when the advisor taps "Set up payouts" in their dashboard.
 *
 * First call: creates a Stripe Express account for the user, stores the id
 * in advisor_payout_accounts, returns an onboarding URL the client redirects to.
 *
 * Subsequent calls: retrieves the existing account and returns a fresh
 * onboarding URL (useful if the user didn't complete the flow the first time).
 *
 * After the user finishes onboarding on Stripe, the `account.updated` webhook
 * will mark payouts_enabled=true. That webhook handling lives in stripe-webhook.
 */

import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const RequestSchema = z.object({
  returnUrl: z.string().url(),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  url: string;
  accountId: string;
}

const ALLOWED_HOSTS = [
  'localhost', '127.0.0.1',
  'arcana.app', 'www.arcana.app',
  'tarotlife.app', 'www.tarotlife.app',
  'arcana-ritual-app.netlify.app',
];

function allowedRedirect(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
  } catch {
    return false;
  }
}

export default handler<Req, Resp>({
  fn: "advisor-stripe-onboard",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 10 * 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    if (!allowedRedirect(body.returnUrl)) {
      throw new AppError("INVALID_REDIRECT_URL", "Return URL must be on an approved host", 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe not configured", 503);

    // Must be an advisor to onboard
    const { data: advisor } = await ctx.supabase
      .from("advisor_profiles")
      .select("id, user_id")
      .eq("user_id", ctx.userId!)
      .maybeSingle();
    if (!advisor) throw new AppError("NOT_AN_ADVISOR", "Only advisors can set up payouts", 403);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let { data: payoutAcct } = await ctx.supabase
      .from("advisor_payout_accounts")
      .select("stripe_account_id, onboarding_complete, payouts_enabled")
      .eq("user_id", ctx.userId!)
      .maybeSingle();

    let accountId: string;
    if (!payoutAcct) {
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("email")
        .eq("id", ctx.userId!)
        .maybeSingle();
      const acct = await stripe.accounts.create({
        type: "express",
        email: profile?.email || ctx.user?.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { user_id: ctx.userId! },
      });
      accountId = acct.id;
      const { error: insertErr } = await ctx.supabase
        .from("advisor_payout_accounts")
        .insert({
          user_id: ctx.userId!,
          stripe_account_id: accountId,
          onboarding_complete: false,
          payouts_enabled: false,
        });
      if (insertErr) {
        ctx.log.error("advisor_payout_acct.insert_failed", { err: insertErr.message });
        throw new AppError("DB_INSERT_FAILED", "Could not record payout account", 500);
      }
      payoutAcct = { stripe_account_id: accountId, onboarding_complete: false, payouts_enabled: false };
    } else {
      accountId = payoutAcct.stripe_account_id as string;
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: body.returnUrl,
      return_url: body.returnUrl,
      type: "account_onboarding",
    });

    ctx.log.info("advisor_stripe_onboard.link_created", { accountId });

    return { url: link.url, accountId };
  },
});
