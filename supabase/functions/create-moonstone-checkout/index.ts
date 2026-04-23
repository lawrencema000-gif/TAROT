/**
 * Stripe one-off checkout for Moonstone packs (web only).
 *
 * Native (Android/iOS) uses Play Store / App Store IAP via RevenueCat —
 * see src/services/billing.ts. This endpoint exists purely for the web
 * (PWA / desktop browser) surface.
 *
 * Supported packs are coded here to match the PRODUCT_IDS in billing.ts:
 *   arcana_moonstones_100   — $2.99  → 100 Moonstones
 *   arcana_moonstones_300   — $7.99  → 300
 *   arcana_moonstones_750   — $16.99 → 750
 *   arcana_moonstones_2000  — $39.99 → 2000
 *
 * The stripe-webhook recognises metadata.purchase_type='moonstones' and
 * credits the ledger on checkout.session.completed.
 */

import Stripe from "npm:stripe@14.10.0";
import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";

const PACKS: Record<string, { amountCents: number; moonstones: number; label: string }> = {
  'arcana_moonstones_100':  { amountCents: 299,  moonstones: 100,  label: '100 Moonstones' },
  'arcana_moonstones_300':  { amountCents: 799,  moonstones: 300,  label: '300 Moonstones' },
  'arcana_moonstones_750':  { amountCents: 1699, moonstones: 750,  label: '750 Moonstones' },
  'arcana_moonstones_2000': { amountCents: 3999, moonstones: 2000, label: '2000 Moonstones' },
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
  packId: z.enum([
    'arcana_moonstones_100',
    'arcana_moonstones_300',
    'arcana_moonstones_750',
    'arcana_moonstones_2000',
  ]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  clientPlatform: z.enum(['web', 'android', 'ios']).optional(),
});

type Req = z.infer<typeof RequestSchema>;

interface Resp {
  sessionId: string;
  url: string | null;
}

export default handler<Req, Resp>({
  fn: "create-moonstone-checkout",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 10, windowMs: 10 * 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const { packId, successUrl, cancelUrl, clientPlatform } = body;

    if (clientPlatform === "android" || clientPlatform === "ios") {
      throw new AppError(
        "USE_IAP_ON_NATIVE",
        "Use in-app billing on native platforms",
        403,
      );
    }

    if (!allowedRedirect(successUrl) || !allowedRedirect(cancelUrl)) {
      throw new AppError("INVALID_REDIRECT_URL", "Redirect URLs must be on an approved host", 400);
    }

    const pack = PACKS[packId];
    if (!pack) throw new AppError("UNKNOWN_PACK", "Unknown Moonstone pack", 400);

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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: profile?.email || ctx.user?.email,
      client_reference_id: ctx.userId!,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: pack.amountCents,
          product_data: { name: pack.label },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        purchase_type: "moonstones",
        user_id: ctx.userId!,
        product_id: packId,
        moonstones: String(pack.moonstones),
      },
    });

    ctx.log.info("moonstone_checkout.created", { sessionId: session.id, packId, moonstones: pack.moonstones });

    return { sessionId: session.id, url: session.url };
  },
});
