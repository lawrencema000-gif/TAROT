# Quick Start: Play Store & RevenueCat Setup

## ✅ What's Already Done

Your app is fully configured for dual payment systems:
- ✅ RevenueCat integration code complete
- ✅ Google Play Billing SDK integrated
- ✅ User ID synchronization setup
- ✅ Webhook handler deployed to Supabase
- ✅ Product IDs defined in code

## 🎯 What You Need to Do

### Step 1: Create Products in Google Play Console (10 minutes)

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **com.arcana.app**
3. Navigate to **Monetization → Products**

Create these **3 products** with exact IDs:

#### Subscriptions Section:
```
Product ID: arcana_premium_monthly
Name: Premium Monthly
Price: $9.99/month
Free Trial: 3 days
```

```
Product ID: arcana_premium_yearly
Name: Premium Yearly
Price: $49.99/year
Free Trial: 3 days
```

#### In-App Products Section:
```
Product ID: arcana_premium_lifetime
Name: Premium Lifetime
Type: One-time purchase
Price: $99.99
```

⚠️ **Critical**: Product IDs must match exactly (they're in `src/services/billing.ts:44-47`)

---

### Step 2: Set Up RevenueCat (15 minutes)

1. **Create Account**: [RevenueCat Dashboard](https://app.revenuecat.com)

2. **Add Android App**:
   - Project name: Arcana
   - Platform: Android
   - Package name: `com.arcana.app`

3. **Connect Google Play**:
   - Go to **App Settings → Service Credentials**
   - Follow the guide to create a service account
   - Upload the JSON credentials

4. **Import Products**:
   - Go to **Products** tab
   - Click "Import from Google Play"
   - Select all 3 products

5. **Create Offering**:
   - Go to **Offerings** tab
   - Create new offering: `default` (lowercase!)
   - Add all 3 products
   - Set as **Current Offering**

6. **Create Entitlement**:
   - Go to **Entitlements** tab
   - Create entitlement ID: `premium` (must be exact!)
   - Attach all 3 products

7. **Get API Key**:
   - Go to **API Keys**
   - Copy the Android/Google API key (starts with `goog_`)

8. **Add to .env**:
   ```bash
   VITE_REVENUECAT_API_KEY=goog_xxxxxxxxxxxxxxxx
   ```

---

### Step 3: Configure Webhook (5 minutes)

1. In RevenueCat, go to **Integrations → Webhooks**

2. Add webhook URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook
   ```
   (Replace YOUR_PROJECT_REF with your actual Supabase project reference)

3. Select events:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Expiration
   - ✅ Billing Issue

4. **Authorization**: None needed (webhook is public)

---

### Step 4: Test Everything (10 minutes)

1. **Add Test Account**:
   - Play Console → Setup → License testing
   - Add your Google account email

2. **Build and Install**:
   ```bash
   npm run android:build
   ```

3. **Test Purchase Flow**:
   - Sign in to your app
   - Navigate to premium/subscription screen
   - Try purchasing with test account
   - Verify `is_premium` updates in Supabase

4. **Check Logs**:
   - RevenueCat Dashboard → Customer history
   - Supabase Dashboard → Edge Functions logs
   - Android logcat: `adb logcat | grep RevenueCat`

---

## 📋 Pre-Flight Checklist

Before going live:

- [ ] All 3 products created in Play Console
- [ ] RevenueCat account configured
- [ ] Service account connected
- [ ] Products imported to RevenueCat
- [ ] Offering "default" created and current
- [ ] Entitlement "premium" created
- [ ] API key in `.env` file
- [ ] Webhook URL configured
- [ ] Test purchase successful
- [ ] Database updates working
- [ ] App signed for release

---

## 🔍 How It Works

```
User clicks "Subscribe" in app
        ↓
RevenueCat shows Google Play pricing
        ↓
User completes purchase via Google Play
        ↓
RevenueCat validates receipt
        ↓
Webhook sent to Supabase
        ↓
Database updates is_premium = true
        ↓
User gets premium access!
```

---

## 💡 Benefits of This Setup

**For Mobile App (RevenueCat/Play Billing)**:
- ✅ Required by Google Play policies
- ✅ Automatic receipt validation
- ✅ Subscription management
- ✅ Cross-platform support (iOS ready)
- ✅ Built-in analytics

**For Web Version (Future Stripe)**:
- ✅ Avoid 30% Google fee
- ✅ Direct customer relationship
- ✅ More pricing flexibility
- ✅ Faster payouts

Both update the same `is_premium` flag in Supabase, so users get access regardless of payment method.

---

## 🆘 Troubleshooting

**Issue**: "No offerings available"
- **Fix**: Make sure offering is marked as "Current" in RevenueCat

**Issue**: Purchases not updating database
- **Fix**: Check webhook URL is correct and function is deployed

**Issue**: "Product not found" error
- **Fix**: Verify Product IDs match exactly in Play Console and code

**Issue**: Can't test purchases
- **Fix**: Add your Google account to license testers in Play Console

**Issue**: RevenueCat shows "App not configured"
- **Fix**: Ensure service account has proper permissions in Play Console

---

## 📚 Documentation

- [RevenueCat Docs](https://www.revenuecat.com/docs)
- [RevenueCat Capacitor SDK](https://www.revenuecat.com/docs/capacitor)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [RevenueCat Webhooks](https://www.revenuecat.com/docs/webhooks)

---

## 🎉 Next Steps After Setup

Once everything works:

1. Consider adding Stripe for web version (see DUAL_PAYMENT_SETUP.md)
2. Set up promotional offers in Play Console
3. Configure subscription grace periods
4. Add in-app restore purchases button
5. Implement purchase analytics

Your app is ready for monetization! 🚀
