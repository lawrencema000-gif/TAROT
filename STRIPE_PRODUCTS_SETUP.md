# 🎉 Create Your Stripe Products - Quick Guide

## ✅ What's Ready

Your entire backend is configured and waiting for product creation:
- ✅ 3 Edge Functions deployed
- ✅ Double billing prevention active
- ✅ New pricing structure implemented
- ✅ Database ready
- ✅ Build successful

## 🚀 Create Products (Choose One Method)

### Method 1: Automated Script (Recommended) ⚡

This is the **fastest way** - it creates all products automatically!

```bash
# 1. Get your Stripe secret key from:
# https://dashboard.stripe.com/test/apikeys

# 2. Run this command:
STRIPE_SECRET_KEY=sk_test_xxxxx npm run create-stripe-products

# 3. Done! Script will:
#    ✅ Create 3 products in Stripe
#    ✅ Generate price IDs
#    ✅ Update your .env file automatically
```

**That's it!** Skip to "Next Steps" below.

---

### Method 2: Manual Creation via Stripe Dashboard

If you prefer manual control:

#### Step 1: Go to Stripe Dashboard

1. Visit https://dashboard.stripe.com/test/products
2. Make sure you're in **Test Mode** (toggle in top right)

#### Step 2: Create Product 1 - Premium Lifetime

Click **"+ Add product"**

```
Product information:
  Name: Arcana Premium Lifetime
  Description: One-time purchase, unlock everything + remove ads forever

Pricing:
  Standard pricing: One time
  Price: $9.99
  Currency: USD

Metadata (optional but recommended):
  product_id: arcana_premium_lifetime
  type: lifetime
```

Click **"Save product"**

**Important**: Copy the **Price ID** (starts with `price_`) - you'll need this!

#### Step 3: Create Product 2 - Premium Monthly

Click **"+ Add product"**

```
Product information:
  Name: Arcana Premium Monthly
  Description: Monthly subscription - Cancel anytime

Pricing:
  Standard pricing: Recurring
  Price: $2.99
  Billing period: Monthly
  Currency: USD

Metadata (optional but recommended):
  product_id: arcana_premium_monthly
  type: subscription
```

Click **"Save product"**

**Important**: Copy the **Price ID** (starts with `price_`)

#### Step 4: Create Product 3 - Premium Yearly

Click **"+ Add product"**

```
Product information:
  Name: Arcana Premium Yearly
  Description: Yearly subscription - Best value, save 44%

Pricing:
  Standard pricing: Recurring
  Price: $19.99
  Billing period: Yearly
  Currency: USD

Metadata (optional but recommended):
  product_id: arcana_premium_yearly
  type: subscription
```

Click **"Save product"**

**Important**: Copy the **Price ID** (starts with `price_`)

#### Step 5: Update Your .env File

Open your `.env` file and add the price IDs:

```bash
VITE_STRIPE_PRICE_LIFETIME=price_xxxxxxxxxxxxxxxx
VITE_STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxxxxx
VITE_STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxxxxx
```

---

## 🔔 Next Steps

### 1. Set Up Webhook (Required for payments to work)

Your webhook endpoint is:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

**Two options:**

#### Option A: Stripe CLI (for testing)
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to YOUR_SUPABASE_URL/functions/v1/stripe-webhook

# Copy the webhook signing secret (whsec_xxxxx)
# Add to Supabase Edge Function secrets as STRIPE_WEBHOOK_SECRET
```

#### Option B: Stripe Dashboard (for production)

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy **Signing secret** (starts with `whsec_`)
7. Add to Supabase:
   - Go to Project Settings → Edge Functions → Secrets
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_xxxxx`

### 2. Test Your Setup

```bash
npm run dev
```

1. Sign in to your app
2. Navigate to premium/subscription page
3. Click subscribe
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify premium access granted!

### 3. Configure RevenueCat (for mobile)

Don't forget to create the same products in RevenueCat:

1. Go to https://app.revenuecat.com
2. Create products with same IDs:
   - `arcana_premium_lifetime` → $9.99 one-time
   - `arcana_premium_monthly` → $2.99 monthly
   - `arcana_premium_yearly` → $19.99 yearly
3. Add to offering with correct identifiers

## 🛡️ Double Billing Prevention is Active!

Your app now prevents users from being charged twice:

- ✅ If user buys on web → Mobile app blocks purchase
- ✅ If user buys in mobile app → Web blocks purchase
- ✅ Clear warnings shown to users
- ✅ Single database tracks all purchases

See `PRICING_STRUCTURE.md` for details.

## 📊 Verify Everything Works

### Checklist

- [ ] Stripe products created (3 total)
- [ ] Price IDs in `.env` file
- [ ] Webhook endpoint configured
- [ ] Webhook secret in Supabase secrets
- [ ] Test purchase successful on web
- [ ] Premium status granted in database
- [ ] RevenueCat products created (for mobile)

### Where to Check

**Stripe Dashboard:**
- Products: https://dashboard.stripe.com/test/products
- Payments: https://dashboard.stripe.com/test/payments
- Webhooks: https://dashboard.stripe.com/test/webhooks

**Supabase Dashboard:**
- Edge Functions: Project → Edge Functions
- Database: Table Editor → profiles (check `is_premium`)
- Database: Table Editor → subscriptions (check entries)

**RevenueCat Dashboard:**
- Products: https://app.revenuecat.com/products
- Offerings: https://app.revenuecat.com/offerings

## 💡 Quick Reference

### Pricing at a Glance

```
Free Version:
- Daily readings
- Limited journal
- Shows ads

Premium ($9.99 lifetime):
- Everything unlocked
- No ads
- Unlimited journal
- Advanced features
```

### Product IDs

```javascript
// In code
PRODUCT_IDS = {
  PREMIUM_LIFETIME: 'arcana_premium_lifetime',   // $9.99
  PREMIUM_MONTHLY: 'arcana_premium_monthly',     // $2.99
  PREMIUM_YEARLY: 'arcana_premium_yearly',       // $19.99
}
```

### Key Files

- `src/services/billing.ts` - Payment handling
- `src/services/billingGuard.ts` - Double billing prevention
- `scripts/create-stripe-products.mjs` - Auto product creation
- `supabase/functions/stripe-webhook/` - Payment processing

## 🆘 Troubleshooting

**Q: Script fails with "Authentication failed"**
```bash
# Make sure you're using the correct secret key format:
STRIPE_SECRET_KEY=sk_test_51xxxxx npm run create-stripe-products
#                  ^^^^^^^^ Must start with sk_test_ or sk_live_
```

**Q: Can't find price IDs**
```
1. Go to Stripe Dashboard → Products
2. Click on a product
3. Look for "Pricing" section
4. Price ID is shown (starts with price_)
```

**Q: Webhook not working**
```
1. Check URL is correct in Stripe Dashboard
2. Verify webhook secret in Supabase Edge Function secrets
3. Check Edge Function logs for errors
4. Test with Stripe CLI first
```

**Q: User not getting premium after purchase**
```
1. Check webhook fired (Stripe Dashboard → Webhooks → Logs)
2. Check Edge Function logs
3. Verify database: profiles.is_premium = true
4. Check subscriptions table has entry
```

## 🎉 You're All Set!

Once products are created and webhook is configured, your dual payment system is fully operational:

- **Web users** → Pay via Stripe → 97% revenue
- **Mobile users** → Pay via Google Play → 70% revenue
- **Both platforms** → Same premium experience
- **No double charges** → Protected by billing guard

For more details, see:
- `PRICING_STRUCTURE.md` - Full pricing & prevention docs
- `STRIPE_SETUP_GUIDE.md` - Comprehensive setup guide
- `BOLT_STRIPE_QUICKSTART.md` - Quick start guide

**Happy selling! 🚀**
