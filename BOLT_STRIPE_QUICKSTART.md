# Bolt.new → Stripe Connection Quick Start

## 🎯 Your Backend is 100% Ready!

All Stripe infrastructure is deployed and configured:
- ✅ 3 Edge Functions deployed to Supabase
- ✅ WebBillingService fully integrated
- ✅ Database schema supports subscriptions
- ✅ Webhook handlers ready
- ✅ Build successful

## 📋 Next Steps (15 minutes)

### 1. Connect Stripe via Bolt.new

Look for Stripe integration options in Bolt.new:
- Bolt.new will guide you through Stripe OAuth
- This automatically configures API keys in Supabase
- Webhook endpoints will be set up for you

### 2. Create 3 Products in Stripe

Once connected, create these products:

| Product | Price | Period | Trial |
|---------|-------|--------|-------|
| Premium Monthly | $9.99 | Monthly | 3 days |
| Premium Yearly | $49.99 | Yearly | 3 days |
| Premium Lifetime | $99.99 | One-time | None |

### 3. Copy Price IDs to .env

After creating products, Stripe gives you Price IDs (start with `price_`):

```bash
VITE_STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_LIFETIME=price_xxxxxxxxxxxxx
```

### 4. Test It!

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
