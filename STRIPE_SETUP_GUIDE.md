# Stripe Payment Setup Guide for Web Version

Your app now has **complete Stripe integration** for web payments! All backend infrastructure is deployed and ready.

## ✅ What's Already Done

- ✅ Three Supabase Edge Functions deployed:
  - `create-checkout-session` - Creates Stripe checkout
  - `stripe-webhook` - Processes payment events
  - `create-portal-session` - Customer subscription management
- ✅ WebBillingService updated with Stripe integration
- ✅ User authentication and session handling
- ✅ Database schema supports both Stripe and RevenueCat
- ✅ Automatic premium status updates
- ✅ Build successful

## 🎯 What You Need to Do

### Step 1: Connect Bolt.new to Stripe (5 minutes)

Bolt.new makes Stripe integration easy! Here's how:

1. **In Bolt.new**, look for the Stripe connection option
2. Click **"Connect to Stripe"** or similar button
3. You'll be redirected to Stripe to authorize the connection
4. Bolt.new will automatically:
   - Get your Stripe API keys
   - Configure the secret keys in Supabase Edge Functions
   - Set up the webhook endpoint

**OR Manual Setup**:

If Bolt.new doesn't auto-configure, follow these manual steps:

---

### Step 2: Create Products in Stripe Dashboard (10 minutes)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Make sure you're in **Test Mode** (toggle in top right)
3. Click **"+ Add Product"**

#### Product 1: Premium Monthly
```
Product name: Arcana Premium Monthly
Description: Full access to all premium features
Price: $9.99 USD
Billing period: Monthly
Free trial: 3 days
```
- After creating, copy the **Price ID** (starts with `price_`)
- Add to your `.env`: `VITE_STRIPE_PRICE_MONTHLY=price_xxxxx`

#### Product 2: Premium Yearly
```
Product name: Arcana Premium Yearly
Description: Full access to all premium features - Save 58%!
Price: $49.99 USD
Billing period: Yearly
Free trial: 3 days
```
- Copy the **Price ID**
- Add to your `.env`: `VITE_STRIPE_PRICE_YEARLY=price_xxxxx`

#### Product 3: Premium Lifetime
```
Product name: Arcana Premium Lifetime
Description: One-time purchase, lifetime access
Price: $99.99 USD
Type: One-time payment (not recurring)
```
- Copy the **Price ID**
- Add to your `.env`: `VITE_STRIPE_PRICE_LIFETIME=price_xxxxx`

---

### Step 3: Configure Stripe Secrets (Manual Only)

**If Bolt.new didn't auto-configure**, add these secrets to Supabase:

1. Go to [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_`)
3. In Supabase Dashboard:
   - Go to **Project Settings → Edge Functions → Secrets**
   - Add: `STRIPE_SECRET_KEY` = `sk_test_xxxxx`

---

### Step 4: Set Up Webhook (10 minutes)

The webhook tells your app when payments happen.

#### Option A: Using Stripe CLI (Recommended for Testing)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local Supabase
stripe listen --forward-to YOUR_SUPABASE_URL/functions/v1/stripe-webhook

# Copy the webhook signing secret (starts with whsec_)
# Add to Supabase secrets: STRIPE_WEBHOOK_SECRET
```

#### Option B: Using Stripe Dashboard (For Production)

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.payment_succeeded`

5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to Supabase Edge Function secrets:
   - Secret name: `STRIPE_WEBHOOK_SECRET`
   - Secret value: `whsec_xxxxx`

---

### Step 5: Update Your .env File

Your `.env` should look like this:

```bash
# Supabase (already configured)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx

# RevenueCat for mobile (already configured)
VITE_REVENUECAT_API_KEY=goog_xxxxx

# Stripe for web (add these)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
VITE_STRIPE_PRICE_MONTHLY=price_xxxxx
VITE_STRIPE_PRICE_YEARLY=price_xxxxx
VITE_STRIPE_PRICE_LIFETIME=price_xxxxx
```

**Note**: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` go in **Supabase Edge Function secrets**, NOT in `.env`!

---

## 🧪 Testing Your Setup

### Test Purchase Flow (Web)

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open in browser: `http://localhost:5173`

3. Sign in to your app

4. Navigate to the premium/subscription page

5. Click "Subscribe" on any plan

6. You should be redirected to Stripe Checkout

7. Use a [test card](https://stripe.com/docs/testing#cards):
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

8. Complete checkout

9. Verify:
   - Redirected back to your app
   - Check Supabase: `profiles.is_premium` should be `true`
   - Check Supabase: `subscriptions` table has new entry
   - Check Stripe Dashboard: Payment appears

### Test Webhook

1. In Stripe Dashboard, find the payment

2. Click **"Send test webhook"**

3. Check Supabase Edge Function logs:
   ```
   [Stripe] Webhook received: checkout.session.completed
   [Stripe] User xxxxx subscribed
   ```

4. Verify database updated correctly

---

## 🔄 How It Works

```
User clicks "Subscribe" on web
        ↓
WebBillingService.purchase()
        ↓
Calls create-checkout-session Edge Function
        ↓
Redirects to Stripe Checkout
        ↓
User completes payment
        ↓
Stripe sends webhook to stripe-webhook Edge Function
        ↓
Updates profiles.is_premium = true
        ↓
Updates subscriptions table
        ↓
User gets premium access!
```

---

## 📊 Platform Detection

Your app automatically detects the platform:

- **Mobile App**: Uses RevenueCat → Google Play Billing
- **Web Browser**: Uses Stripe → Direct web payments

Both systems update the same `is_premium` flag in your database.

---

## 🛠️ Managing Subscriptions

Users can manage their Stripe subscriptions through the Customer Portal:

```typescript
// In your settings page
import { getBillingService } from './services/billing';

const billingService = getBillingService();

// Check if on web (has portal)
if (billingService.provider === 'web') {
  const webService = billingService as any;
  if (webService.openCustomerPortal) {
    await webService.openCustomerPortal();
  }
}
```

The portal allows users to:
- Update payment method
- Cancel subscription
- View invoices
- Update billing information

---

## 🚀 Going to Production

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Create the same 3 products** in live mode
3. **Update .env** with live keys:
   - `VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx`
   - Price IDs will be different (live mode)
4. **Update webhook** to point to production URL
5. **Add live secrets** to Supabase:
   - `STRIPE_SECRET_KEY=sk_live_xxxxx`
   - `STRIPE_WEBHOOK_SECRET=whsec_xxxxx` (from live webhook)
6. **Enable Stripe billing portal** in [Portal Settings](https://dashboard.stripe.com/settings/billing/portal)
7. **Test thoroughly** with real test purchases

---

## 💡 Benefits of Dual Payment System

### Web Payments (Stripe)
- ✅ **No 30% app store fee** (you keep 97.1%)
- ✅ Direct customer relationship
- ✅ Faster payouts (2-7 days vs 45-60 days)
- ✅ More pricing flexibility
- ✅ Promotional codes and coupons
- ✅ Usage-based billing options

### Mobile Payments (RevenueCat)
- ✅ **Required by Google/Apple policies**
- ✅ Automatic receipt validation
- ✅ Cross-platform subscription syncing
- ✅ Built-in analytics
- ✅ Customer expects it in app stores

---

## 🆘 Troubleshooting

**Issue**: "Invalid product ID" error
- **Fix**: Make sure Price IDs in `.env` match exactly what's in Stripe

**Issue**: Checkout page not loading
- **Fix**: Check browser console for errors. Verify VITE_STRIPE_PRICE_* are set

**Issue**: Webhook not triggering
- **Fix**: Check webhook URL is correct and Edge Function is deployed

**Issue**: Premium status not updating
- **Fix**: Check Supabase Edge Function logs for webhook errors

**Issue**: "No active Stripe subscription found" in portal
- **Fix**: User needs to have an active subscription first

**Issue**: Payment succeeds but premium not enabled
- **Fix**: Check webhook secret is configured correctly

---

## 📚 Key Files

- **Edge Functions**:
  - `supabase/functions/create-checkout-session/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`
  - `supabase/functions/create-portal-session/index.ts`

- **Frontend**:
  - `src/services/billing.ts` (WebBillingService)

- **Configuration**:
  - `.env` (frontend env vars)
  - Supabase Edge Function Secrets (backend keys)

---

## 🎓 Resources

- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe API Reference](https://stripe.com/docs/api)

---

## ✅ Pre-Flight Checklist

Before going live:

- [ ] Stripe account created and verified
- [ ] 3 products created in Stripe (monthly, yearly, lifetime)
- [ ] Price IDs added to `.env`
- [ ] Public key added to `.env`
- [ ] Secret key added to Supabase secrets
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to Supabase secrets
- [ ] Test purchase successful on web
- [ ] Database updates confirmed
- [ ] Customer portal working
- [ ] Mobile app still works with RevenueCat
- [ ] Both payment systems update same database

---

## 🎉 You're Ready!

Your dual payment system is now complete:
- ✅ Mobile users pay via Google Play (RevenueCat)
- ✅ Web users pay via Stripe (direct)
- ✅ Both get premium access
- ✅ Revenue optimized for each platform

Follow the Bolt.new Stripe connection flow to finish setup!
