# Dual Payment System Setup Guide

This app supports **two payment systems** running simultaneously:
- **Mobile App**: Google Play Billing (via RevenueCat)
- **Web Version**: Stripe (for direct web users)

Both systems update the same `is_premium` flag in your Supabase database, so users get premium access regardless of how they paid.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Payment                          │
└─────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
         ┌──────▼──────┐              ┌──────▼──────┐
         │  Mobile App  │              │  Web Version │
         └──────┬──────┘              └──────┬──────┘
                │                             │
    ┌───────────▼───────────┐     ┌──────────▼──────────┐
    │  Google Play Billing   │     │      Stripe         │
    │    (RevenueCat)        │     │   (Web Payments)    │
    └───────────┬───────────┘     └──────────┬──────────┘
                │                             │
                └──────────────┬──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Supabase Database  │
                    │   is_premium: true  │
                    └─────────────────────┘
```

---

## Part 1: Google Play Console Setup (Mobile App)

### Step 1: Create In-App Products in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (com.arcana.app)
3. Navigate to: **Monetization → In-app products**
4. Create **3 products** with these **exact Product IDs**:

#### Product 1: Monthly Subscription
- **Product ID**: `arcana_premium_monthly`
- **Name**: Premium Monthly
- **Description**: Full access to all features with 3-day free trial
- **Price**: $9.99 USD
- **Billing Period**: 1 Month
- **Free Trial**: 3 days
- **Status**: Active

#### Product 2: Yearly Subscription
- **Product ID**: `arcana_premium_yearly`
- **Name**: Premium Yearly
- **Description**: Full access to all features with 3-day free trial - Save 58%!
- **Price**: $49.99 USD
- **Billing Period**: 1 Year
- **Free Trial**: 3 days
- **Status**: Active

#### Product 3: Lifetime Purchase
- **Product ID**: `arcana_premium_lifetime`
- **Name**: Premium Lifetime
- **Description**: One-time purchase, lifetime access to all features
- **Type**: Managed Product (One-Time)
- **Price**: $99.99 USD
- **Status**: Active

### Step 2: Important Notes for Play Console

⚠️ **Critical**: The Product IDs above MUST match exactly. They're already configured in your app code (`src/services/billing.ts:43-47`).

- Subscriptions must be created in **"Subscriptions"** section
- Lifetime purchase goes in **"In-app products"** section
- Test purchases before going live using test accounts
- Set up pricing for all countries (or use template pricing)

---

## Part 2: RevenueCat Setup

### Step 1: Create RevenueCat Account

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create a new project called "Arcana"
3. Add an Android app with package name: `com.arcana.app`

### Step 2: Configure Google Play Integration

1. In RevenueCat, go to **Apps → com.arcana.app → Configure**
2. Click **"Service credentials"**
3. Follow RevenueCat's guide to link your Google Play Console:
   - Create a service account in Google Cloud Console
   - Grant permissions in Play Console
   - Upload JSON credentials to RevenueCat

### Step 3: Create Products/Offerings in RevenueCat

1. Go to **Products** tab in RevenueCat
2. Click **"Import from Google Play"**
3. Select all 3 products:
   - `arcana_premium_monthly`
   - `arcana_premium_yearly`
   - `arcana_premium_lifetime`

### Step 4: Create an Offering

1. Go to **Offerings** tab
2. Create a new offering called **"default"** (must be lowercase)
3. Add all 3 products to this offering
4. Set it as the **Current Offering**

### Step 5: Create Entitlement

1. Go to **Entitlements** tab
2. Create an entitlement with ID: **`premium`** (must be exactly this)
3. Attach all 3 products to this entitlement

### Step 6: Get API Keys

1. Go to **API keys** in RevenueCat
2. Copy your **Google Play Android API key** (starts with `goog_`)
3. Add it to your `.env` file:

```bash
VITE_REVENUECAT_API_KEY=goog_xxxxxxxxxxxxxxxx
```

### Step 7: Configure Webhooks (Important!)

1. In RevenueCat, go to **Integrations → Webhooks**
2. Add webhook URL (you'll need to create this Supabase Edge Function):
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook`
3. Enable events:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Expiration

---

## Part 3: Web Payments with Stripe (Optional)

### Why Add Stripe for Web?

- **Avoid 30% Google/Apple fee** on web purchases
- **Direct relationship** with web customers
- **More control** over pricing and promotions
- **Required by Google**: Cannot use Play Billing on web

### Setup Steps

1. Create [Stripe Account](https://dashboard.stripe.com/register)
2. Create Products in Stripe (matching your Play Store pricing)
3. Get Stripe API keys
4. Add to `.env`:

```bash
# Stripe Configuration (for web version)
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
```

5. Create Stripe webhook handler in Supabase Edge Functions

---

## Part 4: Supabase Integration

### Create RevenueCat Webhook Handler

Create this Edge Function to sync purchases from RevenueCat to your database:

**File**: `supabase/functions/revenuecat-webhook/index.ts`

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const event = await req.json();
    console.log('[RevenueCat] Webhook received:', event.type);

    const { event: eventType, app_user_id: userId } = event;

    // Handle purchase events
    if (eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL') {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', userId);

      if (error) {
        console.error('[RevenueCat] Error updating profile:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[RevenueCat] User ${userId} upgraded to premium`);
    }

    // Handle cancellation/expiration
    if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('id', userId);

      if (error) {
        console.error('[RevenueCat] Error updating profile:', error);
      }

      console.log(`[RevenueCat] User ${userId} premium expired`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[RevenueCat] Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Testing the Setup

### Test on Android

1. Build and install your app:
   ```bash
   npm run android:build
   ```

2. Make sure you're signed in to the app
3. Navigate to the Premium/Subscription screen
4. Try purchasing (use a test account from Play Console)

### Test Purchases

Before going live, test with these accounts:
1. Add test accounts in Play Console → Setup → License testing
2. Use those accounts to make test purchases
3. Verify `is_premium` updates in Supabase

### Debug Logs

Check these logs for issues:
- **App logs**: `adb logcat | grep RevenueCat`
- **RevenueCat dashboard**: View customer history
- **Supabase logs**: Check Edge Function execution

---

## Production Checklist

Before launching:

- [ ] All 3 products created in Play Console with correct IDs
- [ ] RevenueCat configured and connected to Play Console
- [ ] Entitlement "premium" created in RevenueCat
- [ ] Default offering created and set as current
- [ ] API keys added to `.env` file
- [ ] Webhook handler deployed to Supabase
- [ ] Webhook URL configured in RevenueCat
- [ ] Test purchases successful
- [ ] Test webhook updates database correctly
- [ ] App signed and ready for Play Store
- [ ] Stripe (optional) configured for web version

---

## Current Code Structure

Your billing system is already set up with platform detection:

**Mobile App** (src/services/billing.ts:61-295):
- Uses `NativeBillingService`
- Connects to RevenueCat → Google Play Billing
- Handles subscriptions, purchases, restores

**Web Version** (src/services/billing.ts:297-359):
- Uses `WebBillingService` (currently stub)
- Ready for Stripe integration
- Shows products but routes to payment

**Automatic Detection** (src/services/billing.ts:52-59):
- Platform detected automatically
- Correct billing service instantiated
- No manual switching needed

---

## User ID Synchronization

**Critical**: RevenueCat needs to know your Supabase user ID:

The app automatically sets this when users sign in (src/App.tsx:88-90):

```typescript
useEffect(() => {
  if (user) {
    // This line syncs user ID with RevenueCat
    adsService.setUserId(user.id);
  }
}, [user]);
```

**You also need to do this for RevenueCat** - update your billing initialization to set the app user ID:

```typescript
await Purchases.configure({
  apiKey: REVENUECAT_API_KEY,
  appUserID: userId, // Pass Supabase user ID
});
```

---

## Next Steps

1. ✅ Create products in Play Console (use exact IDs above)
2. ✅ Set up RevenueCat account and connect Play Console
3. ✅ Import products to RevenueCat
4. ✅ Create offering and entitlement
5. ✅ Get API key and add to `.env`
6. ✅ Deploy webhook handler to Supabase
7. ✅ Test purchases with test account
8. ✅ (Optional) Set up Stripe for web version
9. ✅ Submit app to Play Store

---

## Support Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [Google Play Billing Guide](https://developer.android.com/google/play/billing)
- [RevenueCat + Capacitor Guide](https://www.revenuecat.com/docs/capacitor)
- [Stripe Documentation](https://stripe.com/docs)

---

## Troubleshooting

**Problem**: "No offerings available"
- **Solution**: Make sure offering is set as "Current" in RevenueCat

**Problem**: Purchases not updating database
- **Solution**: Check webhook is configured and Edge Function is deployed

**Problem**: "Product not found"
- **Solution**: Verify Product IDs exactly match in Play Console and code

**Problem**: Test purchases not working
- **Solution**: Add your Google account to license testers in Play Console
