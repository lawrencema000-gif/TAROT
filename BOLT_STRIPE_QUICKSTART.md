# Bolt.new → Stripe Connection Quick Start

## 🎯 Your Backend is 100% Ready!

All Stripe infrastructure is deployed and configured:
- ✅ 3 Edge Functions deployed to Supabase
- ✅ WebBillingService fully integrated with double billing prevention
- ✅ Database schema supports subscriptions
- ✅ Webhook handlers ready
- ✅ New pricing structure configured
- ✅ Build successful

## 💰 Pricing Structure

| Product | Price | Type |
|---------|-------|------|
| **Premium Lifetime** | **$9.99** | One-time (PRIMARY) |
| Premium Monthly | $2.99 | Recurring (optional) |
| Premium Yearly | $19.99 | Recurring (optional) |

## 📋 Two Ways to Set Up

### Option A: Automated Script (Fastest) ⚡

1. **Get your Stripe secret key** from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

2. **Run the product creation script:**
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx node scripts/create-stripe-products.mjs
```

3. **Done!** The script will:
   - Create all 3 products in Stripe
   - Generate price IDs
   - Automatically update your `.env` file

### Option B: Manual Setup via Bolt.new

1. **Connect Stripe via Bolt.new**
   - Bolt.new will guide you through Stripe OAuth
   - Automatically configures API keys in Supabase

2. **Create 3 products manually:**

| Product | Price | Period |
|---------|-------|--------|
| Premium Lifetime | $9.99 | One-time payment |
| Premium Monthly | $2.99 | Monthly |
| Premium Yearly | $19.99 | Yearly |

3. **Copy Price IDs to `.env`:**
```bash
VITE_STRIPE_PRICE_LIFETIME=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx
```

## 🧪 Test It!

```bash
npm run dev
```

- Sign in
- Try subscribing
- Use test card: `4242 4242 4242 4242`
- Verify premium access granted

## 🎉 That's It!

You now have:
- 🌐 **Web**: Stripe payments (97% revenue)
- 📱 **Mobile**: Google Play billing (via RevenueCat)
- 💾 **Database**: Both systems update same flags
- 🔄 **Automatic**: No manual sync needed

## 📖 Full Details

See **STRIPE_SETUP_GUIDE.md** for:
- Detailed configuration
- Webhook setup
- Testing guide
- Troubleshooting
- Production checklist

## 🆘 Common Issues

**Q: Where do I find Price IDs?**
A: Stripe Dashboard → Products → Click product → Copy Price ID

**Q: Do I need to configure secrets manually?**
A: No, if Bolt.new connected Stripe. Otherwise see STRIPE_SETUP_GUIDE.md

**Q: Can I test without real money?**
A: Yes! Use test mode and test cards from [Stripe Testing](https://stripe.com/docs/testing)

**Q: Will mobile users still use Google Play?**
A: Yes! The app auto-detects platform. Web = Stripe, Mobile = RevenueCat

---

**Need help?** Check STRIPE_SETUP_GUIDE.md for comprehensive documentation.
