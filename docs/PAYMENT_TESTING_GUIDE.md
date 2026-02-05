# Payment System Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Arcana app payment system to ensure:
- Prices match between RevenueCat and the paywall
- Purchase flow works correctly
- Transaction IDs are valid
- All edge cases are handled properly

## Updated Pricing (Current)
- **Monthly**: $4.99 USD
- **Yearly**: $24.99 USD
- **Lifetime**: $29.99 USD

---

## Pre-Testing Checklist

### 1. Verify RevenueCat Configuration
1. Log into [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Navigate to **Projects > Arcana > Products**
3. Verify these product IDs exist:
   - `arcana_premium_monthly`
   - `arcana_premium_yearly`
   - `arcana_premium_lifetime`
4. Verify prices in Google Play Console match the pricing above
5. Go to **Offerings** tab
6. Ensure there is a **"Current"** offering set (this is critical!)
7. Verify all three products are added to the Current offering

### 2. Environment Variables
Verify `.env` file contains:
```
VITE_REVENUECAT_API_KEY=your_key_here
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```

---

## Test Suite

## Test 1: Price Display & Matching

**Objective**: Verify paywall displays correct prices from RevenueCat

**Steps**:
1. Open the app on an Android device or emulator
2. Sign in to your account
3. Trigger the paywall (try to access a premium feature like Celtic Cross spread)
4. Check for loading spinner (should appear briefly)
5. Verify three subscription plans appear

**Expected Results**:
- **Monthly Plan**:
  - Price: $4.99/month
  - No badge
  - Has radio button selection
- **Yearly Plan**:
  - Price: $24.99/year
  - "Best Value" badge (gold background)
  - Preselected by default
- **Lifetime Plan**:
  - Price: $29.99 one-time
  - "Forever Access" badge (emerald background)
  - Has radio button selection

**Verify in Console**:
```
[RevenueCat] Initialized with user ID: <uuid>
[RevenueCat] Available packages: [
  { identifier: "...", productId: "arcana_premium_monthly", price: "$4.99" },
  { identifier: "...", productId: "arcana_premium_yearly", price: "$24.99" },
  { identifier: "...", productId: "arcana_premium_lifetime", price: "$29.99" }
]
[Paywall] Loaded products: [
  { id: "arcana_premium_monthly:...", period: "month", price: "$4.99", hasRcPackage: true },
  { id: "arcana_premium_yearly:...", period: "year", price: "$24.99", hasRcPackage: true },
  { id: "arcana_premium_lifetime", period: "lifetime", price: "$29.99", hasRcPackage: true }
]
```

**Pass Criteria**:
- ✅ All three plans display
- ✅ Prices match RevenueCat dashboard
- ✅ Console shows `hasRcPackage: true` for all products
- ✅ No error messages or warnings

---

## Test 2: Successful Purchase Flow

**Objective**: Complete a full purchase and verify transaction tracking

**Steps**:
1. Open paywall
2. Select **Yearly** plan (recommended for testing)
3. Click "Subscribe Now" button
4. Complete Google Play purchase dialog
   - Use test card or sandbox account
5. Wait for purchase to complete

**Expected Results**:
1. Google Play dialog appears with correct price ($24.99)
2. After confirmation, dialog closes
3. Toast notification appears: "Welcome to Premium!"
4. Paywall closes automatically
5. Premium features unlock immediately

**Verify in Console**:
```
[RevenueCat] Starting purchase for: arcana_premium_yearly hasRcPackage: true
[RevenueCat] Purchasing package: <package_identifier>
[RevenueCat] Purchase result: {
  isPremium: true,
  transactionId: "GPA.xxxx-xxxx-xxxx-xxxx",
  entitlements: ["premium"]
}
[RevenueCat] DB billing guard warning (purchase succeeded): User may already have a subscription
```

**Verify in Supabase**:
1. Open Supabase Dashboard
2. Navigate to Table Editor > `profiles`
3. Find your user record
4. Verify: `is_premium = true`
5. Navigate to Table Editor > `subscriptions`
6. Find subscription record for your user
7. Verify:
   - `provider = 'google'`
   - `status = 'active'`
   - `product_id = 'arcana_premium_yearly'`

**Pass Criteria**:
- ✅ Purchase completes successfully
- ✅ Transaction ID starts with "GPA." (Google Play)
- ✅ Transaction ID is NOT just the user ID
- ✅ Database records updated correctly
- ✅ Premium features unlock
- ✅ Toast message appears

---

## Test 3: Cancelled Purchase

**Objective**: Verify proper handling of cancelled purchases

**Steps**:
1. Open paywall
2. Select any plan
3. Click "Subscribe Now"
4. **Cancel** the Google Play dialog (back button or cancel)

**Expected Results**:
- Toast appears: "Purchase cancelled"
- Paywall remains open
- User is not charged
- No database changes

**Verify in Console**:
```
[RevenueCat] Starting purchase for: <product_id>
[RevenueCat] Purchase failed: <error details>
```

**Pass Criteria**:
- ✅ Error message is user-friendly
- ✅ Paywall stays open
- ✅ No charge occurs
- ✅ No false premium status

---

## Test 4: Transaction ID Validation

**Objective**: Ensure transaction IDs are real, not user IDs

**Steps**:
1. Complete a purchase (any plan)
2. Open browser DevTools or view Android logs
3. Find the purchase result log

**Expected Results**:
```
[RevenueCat] Purchase result: {
  isPremium: true,
  transactionId: "GPA.1234-5678-9012-3456",
  entitlements: ["premium"]
}
```

**Pass Criteria**:
- ✅ `transactionId` starts with "GPA." (for Google Play)
- ✅ `transactionId` is NOT a UUID
- ✅ `transactionId` is NOT the same as user ID
- ✅ Each purchase has a unique transaction ID

**Common Issues**:
- ❌ If you see a UUID, RevenueCat may be returning `originalAppUserId` instead of transaction identifier
- ❌ If transaction ID is reused, this indicates a caching issue

---

## Test 5: Restore Purchases

**Objective**: Verify users can restore previous purchases

**Setup**:
1. Complete a purchase on one device/account
2. Log out
3. Either:
   - Log in on a different device, OR
   - Uninstall and reinstall the app, then log in

**Steps**:
1. Open the app (should be in free mode)
2. Open paywall
3. Click "Restore Purchase" button
4. Wait for restoration

**Expected Results**:
- Toast appears: "Purchases restored!"
- Paywall closes
- Premium features unlock
- `is_premium` flag updates to `true`

**Verify in Console**:
```
[RevenueCat] Restore result: {
  isPremium: true,
  entitlements: ["premium"]
}
```

**Pass Criteria**:
- ✅ Restore succeeds for valid purchases
- ✅ Premium status updates
- ✅ Features unlock
- ✅ User doesn't need to purchase again

---

## Test 6: Billing Guard Logic

**Objective**: Verify the billing guard advisory system

**Steps**:
1. Complete a purchase successfully
2. Immediately try to purchase again (same or different plan)
3. Observe console logs

**Expected Results**:
- Google Play dialog appears again
- Purchase can proceed (not blocked)
- Console shows advisory warning

**Verify in Console**:
```
[RevenueCat] DB billing guard warning (purchase succeeded): User may already have a subscription
```

**Important Notes**:
- ⚠️ The warning is **advisory only**
- ✅ Purchase should NOT be blocked
- ✅ RevenueCat is the source of truth
- ✅ Database check is for informational purposes

**Pass Criteria**:
- ✅ Warning logged but purchase proceeds
- ✅ RevenueCat handles duplicate purchase correctly
- ✅ No user-facing error message

---

## Test 7: Fallback Prices (No Internet / Not Configured)

**Objective**: Verify fallback behavior when RevenueCat is unavailable

### Test 7A: No Internet Connection
**Steps**:
1. Disable internet on device (airplane mode)
2. Open paywall

**Expected Results**:
- Paywall shows fallback prices:
  - Monthly: $4.99
  - Yearly: $24.99
  - Lifetime: $29.99
- Amber warning banner: "Premium Not Available"
- Purchase button disabled
- "Restore Purchase" button still visible

### Test 7B: RevenueCat Not Configured
**Steps**:
1. Comment out or remove `VITE_REVENUECAT_API_KEY` from `.env`
2. Rebuild app
3. Open paywall

**Expected Results**:
- Same as Test 7A
- Console warning: "RevenueCat API key not configured"

**Pass Criteria**:
- ✅ Fallback prices display correctly
- ✅ Clear warning message shown
- ✅ Purchase button properly disabled
- ✅ App doesn't crash

---

## Test 8: No Current Offering Set

**Objective**: Verify behavior when RevenueCat offerings aren't configured

**Setup**:
1. In RevenueCat Dashboard, remove the "Current" offering designation
2. Or, create offerings but don't add products to them

**Expected Results**:
- Console warning: "No current offering set"
- Fallback prices display
- Amber warning banner in paywall
- Purchase button disabled

**Verify in Console**:
```
[RevenueCat] No current offering set. Please configure a "Current" offering in RevenueCat dashboard.
[RevenueCat] Available offerings: []
[Paywall] Products loaded but no rcPackage found - RevenueCat offerings may not be configured
```

**Pass Criteria**:
- ✅ Graceful degradation
- ✅ Clear error messaging
- ✅ User understands issue
- ✅ App doesn't crash

---

## Test 9: Product ID Mismatch Handling

**Objective**: Verify handling of product ID variations (e.g., `:base-plan` suffix)

**Background**: Google Play may append `:base-plan` or other suffixes to product IDs

**Steps**:
1. Verify product IDs in console logs
2. Check if they have suffixes like `:base-plan`
3. Attempt purchase

**Expected Results**:
- App matches product IDs correctly despite suffixes
- Purchase proceeds normally

**Verify in Console**:
```
[Paywall] Loaded products: [
  { id: "arcana_premium_monthly:base-plan", ... },
  ...
]
[Paywall] Built display plans: [
  { id: "monthly", productId: "arcana_premium_monthly:base-plan", hasProduct: true, hasRcPackage: true }
]
```

**Pass Criteria**:
- ✅ Products match correctly
- ✅ Purchase succeeds
- ✅ No "Product not found" errors

---

## Test 10: Premium Feature Gating

**Objective**: Verify premium features are properly locked/unlocked

**Free User Tests**:
1. Try to access Celtic Cross spread
   - ✅ Should show paywall
2. Try to view birth chart
   - ✅ Should show paywall
3. Save more than X readings (check limit)
   - ✅ Should show paywall when limit reached
4. Check if ads appear
   - ✅ Should show ads

**Premium User Tests** (after purchase):
1. Try Celtic Cross spread
   - ✅ Should work immediately
2. View birth chart
   - ✅ Should work
3. Save unlimited readings
   - ✅ No limits
4. Check ads
   - ✅ No ads should appear

---

## Test 11: Subscription Management

**Objective**: Verify users can manage their subscriptions

**Steps** (for Google Play users):
1. Make a purchase
2. Go to Settings in app
3. Find subscription management section
4. Click "Manage on Google Play"

**Expected Results**:
- Opens Google Play Store subscriptions page
- Shows Arcana subscription
- User can cancel or modify subscription

**Web Users** (Stripe):
1. Make a purchase on web
2. Click "Manage Subscription"
3. Should redirect to Stripe Customer Portal

**Pass Criteria**:
- ✅ Link opens correctly
- ✅ Shows correct subscription
- ✅ User can manage subscription

---

## Test 12: Price Consistency Check

**Objective**: Final verification that all prices match

**Checklist**:
1. ✅ RevenueCat Dashboard prices = $4.99, $24.99, $29.99
2. ✅ Google Play Console prices = same
3. ✅ Paywall displays = same
4. ✅ Fallback prices in code = same
5. ✅ Database records = same product IDs

**Files to verify**:
- `src/services/billing.ts` - lines 202-203, 211-212, 220-221 (NativeBillingService)
- `src/services/billing.ts` - lines 406-407, 415-416, 424-425 (WebBillingService)
- `src/components/premium/PaywallSheet.tsx` - lines 51-53 (FALLBACK_PRICES)

---

## Common Issues & Troubleshooting

### Issue: Products not loading
**Symptoms**: Paywall shows fallback prices with warning
**Solutions**:
1. Check RevenueCat API key in `.env`
2. Verify "Current" offering is set in RevenueCat Dashboard
3. Ensure products are added to the Current offering
4. Check device internet connection
5. Verify RevenueCat project is in production mode (not sandbox)

### Issue: Purchase fails immediately
**Symptoms**: Error toast appears without showing Google Play dialog
**Solutions**:
1. Check if `hasRcPackage` is `true` in console logs
2. Verify product IDs match exactly in RevenueCat
3. Check if user is already premium (database may have false positive)
4. Verify RevenueCat SDK is properly initialized

### Issue: Transaction ID is user ID
**Symptoms**: Console shows UUID instead of "GPA.xxxx"
**Solutions**:
1. Check RevenueCat purchase response structure
2. Verify using `result.transaction?.transactionIdentifier`
3. Ensure fallback to `result.productIdentifier` is appropriate
4. This was fixed in recent updates - check you're on latest code

### Issue: Billing guard blocks purchase
**Symptoms**: User can't purchase despite no active subscription
**Solutions**:
1. This should NOT happen - billing guard is advisory only
2. Check `preventDoubleBilling` function in `billingGuard.ts`
3. Verify it logs warning but doesn't block purchase
4. Check database `subscriptions` table for stale records

### Issue: Premium status not syncing
**Symptoms**: Purchase succeeds but features stay locked
**Solutions**:
1. Check `profiles` table - `is_premium` should be `true`
2. Check `subscriptions` table - should have active record
3. Verify `refreshProfile()` is called after purchase
4. Check for console errors during profile update
5. Log out and log back in to force refresh

---

## Success Criteria Summary

**All tests pass if**:
- ✅ Prices match everywhere ($4.99, $24.99, $29.99)
- ✅ Purchase flow completes successfully
- ✅ Transaction IDs are valid and unique
- ✅ Restore purchases works
- ✅ Cancellation handled gracefully
- ✅ Fallback prices display when needed
- ✅ Premium features unlock after purchase
- ✅ No crashes or blocking errors
- ✅ Clear user feedback for all actions
- ✅ Database records accurate

---

## Post-Testing Checklist

After completing all tests:
1. ✅ Document any issues found
2. ✅ Verify all three plans can be purchased
3. ✅ Test on both test and production accounts
4. ✅ Verify RevenueCat webhook is working (check dashboard)
5. ✅ Test subscription renewal (may need to wait or use test subscriptions)
6. ✅ Verify cancellation flow in Google Play
7. ✅ Check analytics/events are tracking purchases

---

## Contact & Support

If you encounter issues:
- Check RevenueCat documentation: https://docs.revenuecat.com/
- Review Google Play Billing documentation
- Check Supabase logs for edge function errors
- Review console logs for detailed error messages

---

**Last Updated**: 2026-02-05
**Pricing Version**: v2 (reduced pricing)
**Test Coverage**: Complete payment flow, edge cases, and integrations
