/**
 * Stripe one-off checkout for pay-per-reports.
 *
 * Creates a Stripe Checkout session in "payment" mode (not subscription)
 * with inline price_data — no pre-configured Stripe products required.
 * The webhook for `checkout.session.completed` is responsible for:
 *   1. Inserting a report_unlocks row tied to this user + report key.
 *   2. If the purchasing user was referred by an affiliate with tier='affiliate',
 *      inserting an affiliate_earnings accrual.
 *
 * Valid report keys + pricing:
 *   career-archetype    — $6.99
 *   natal-chart-pdf     — $9.99
 *   year-ahead          — $12.99
 *
 * The `reference` is the key the client uses to verify unlock (mbti code,
 * birth date, year). It's stored on the Stripe session metadata and read
 * in the webhook so the unlock row has the right composite key.
 */

import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const REPORT_PRICES: Record<string, { label: string; amountCents: number }> = {
  'career-archetype': { label: 'Career Archetype Report',  amountCents: 699 },
  'natal-chart-pdf':  { label: 'Full Natal Chart Report',  amountCents: 999 },
  'year-ahead':       { label: 'Year Ahead Forecast',      amountCents: 1299 },
};

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

const RequestSchema = z.object({
  reportKey: z.enum(['career-archetype', 'natal-chart-pdf', 'year-ahead']),
  reference: z.string().min(1).max(64),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  /**
   * Client platform. Required for compliance defence-in-depth: we refuse
   * Stripe checkout from the native apps where Google Play / App Store
   * require in-app billing. The client UI already hides the button on
   * native, but a modified client could still hit the endpoint directly.
   */
  clientPlatform: z.enum(['web', 'android', 'ios']).optional(),
});

type Req = z.infer<typeof RequestSchema>;

interface Resp {
  sessionId: string;
  url: string | null;
}

// Wrapping with Deno.serve is required on Supabase Edge Runtime when the
// module imports `npm:stripe` — without it, the Stripe module evaluation
// blocks the OPTIONS preflight response forever. `export default handler`
// alone is not enough. Symptom before fix: browser CORS preflight hangs
// for 15s+ and every client fetch fails with net::ERR_FAILED.
Deno.serve(handler<Req, Resp>({
  fn: "create-report-checkout",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 10 * 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { reportKey, reference, successUrl, cancelUrl, clientPlatform } = body;

    if (!allowedRedirect(successUrl) || !allowedRedirect(cancelUrl)) {
      throw new AppError("INVALID_REDIRECT_URL", "Redirect URLs must be on an approved host", 400);
    }

    // Defence-in-depth: refuse Stripe checkout from native platforms.
    // Play Store + App Store require in-app billing for digital content.
    if (clientPlatform === "android" || clientPlatform === "ios") {
      throw new AppError(
        "USE_IAP_ON_NATIVE",
        "Use in-app billing on native platforms",
        403,
      );
    }

    const price = REPORT_PRICES[reportKey];
    if (!price) throw new AppError("UNKNOWN_REPORT", "Unknown report key", 400);

    // If already unlocked, short-circuit — don't charge twice.
    const { data: existing } = await ctx.supabase
      .from("report_unlocks")
      .select("id")
      .eq("user_id", ctx.userId!)
      .eq("report_key", reportKey)
      .eq("reference", reference)
      .maybeSingle();
    if (existing) {
      throw new AppError("ALREADY_UNLOCKED", "This report is already unlocked", 409);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new AppError("STRIPE_NOT_CONFIGURED", "Stripe not configured", 503);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { data: profile } = await ctx.supabase
      .from("profiles")
      .select("email")
      .eq("id", ctx.userId!)
      .maybeSingle();

    // Find the user's referrer (if any) to stash on the session metadata,
    // so the webhook can accrue affiliate earnings without another lookup.
    const { data: redemption } = await ctx.supabase
      .from("referral_redemptions")
      .select("referrer_id, code")
      .eq("invitee_id", ctx.userId!)
      .maybeSingle();

    let affiliateReferrerId: string | null = null;
    if (redemption) {
      const { data: code } = await ctx.supabase
        .from("referral_codes")
        .select("tier")
        .eq("user_id", redemption.referrer_id)
        .maybeSingle();
      if (code?.tier === "affiliate") {
        affiliateReferrerId = redemption.referrer_id as string;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: profile?.email || ctx.user?.email,
      client_reference_id: ctx.userId!,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: price.amountCents,
          product_data: { name: price.label },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        purchase_type: "report",
        user_id: ctx.userId!,
        report_key: reportKey,
        reference,
        ...(affiliateReferrerId ? { affiliate_referrer_id: affiliateReferrerId } : {}),
      },
    });

    ctx.log.info("report_checkout.created", {
      sessionId: session.id,
      reportKey,
      amountCents: price.amountCents,
      affiliate: !!affiliateReferrerId,
    });

    return { sessionId: session.id, url: session.url };
  },
}));
