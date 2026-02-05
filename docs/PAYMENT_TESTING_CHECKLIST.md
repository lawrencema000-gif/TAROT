# Payment Testing Checklist

Quick reference checklist for testing the Arcana payment system.

## Pre-Test Setup
- [ ] RevenueCat Dashboard configured with products
- [ ] "Current" offering set with all 3 products
- [ ] `.env` file has `VITE_REVENUECAT_API_KEY`
- [ ] App built and synced: `npm run cap:sync`
- [ ] Test device/emulator with Google Play

## Current Pricing (Verify These)
- [ ] Monthly: $4.99 USD
- [ ] Yearly: $24.99 USD
- [ ] Lifetime: $29.99 USD

---

## Visual Tests

### Paywall Display
- [ ] Opens without errors
- [ ] Shows 3 subscription options
- [ ] Monthly displays "$4.99/month"
- [ ] Yearly displays "$24.99/year" with "Best Value" badge
- [ ] Lifetime displays "$29.99 one-time" with "Forever Access" badge
- [ ] Yearly is pre-selected by default
- [ ] Loading spinner appears briefly then shows prices
- [ ] No error banners (unless intentional test)

### UI Elements
- [ ] Radio buttons work for plan selection
- [ ] "Subscribe Now" button enabled (when products loaded)
- [ ] "Restore Purchase" button visible
- [ ] Close button (X) works
- [ ] Premium feature list shows correctly
- [ ] Gradient background displays properly

---

## Purchase Flow Tests

### Successful Purchase
- [ ] Select a plan
- [ ] Click "Subscribe Now"
- [ ] Google Play dialog appears with correct price
- [ ] Complete purchase
- [ ] Toast: "Welcome to Premium!" appears
- [ ] Paywall closes automatically
- [ ] Premium badge appears in profile
- [ ] Premium features unlock immediately

### Cancelled Purchase
- [ ] Select a plan
- [ ] Click "Subscribe Now"
- [ ] Cancel Google Play dialog
- [ ] Toast: "Purchase cancelled" appears
- [ ] Paywall stays open
- [ ] No charge occurs

### Restore Purchase
- [ ] Click "Restore Purchase"
- [ ] Toast: "Purchases restored!" (if has purchase)
- [ ] Toast: "No purchases found" (if no purchase)
- [ ] Premium status updates correctly

---

## Console Log Verification

### Initialization
```
✅ [RevenueCat] Initialized with user ID: <uuid>
✅ [Billing] Detected provider: google
```

### Product Loading
```
✅ [RevenueCat] Available packages: [3 items with correct prices]
✅ [Paywall] Loaded products: [hasRcPackage: true for each]
✅ [Paywall] Built display plans: [3 plans]
```

### Purchase Result
```
✅ [RevenueCat] Purchase result: {
     isPremium: true,
     transactionId: "GPA.xxxx...",  // NOT a UUID!
     entitlements: ["premium"]
   }
```

### Transaction ID Validation
- [ ] Transaction ID starts with "GPA." (Google Play)
- [ ] Transaction ID is NOT a UUID
- [ ] Transaction ID is NOT the user ID
- [ ] Different for each purchase attempt

### Billing Guard
```
✅ [RevenueCat] DB billing guard warning (purchase succeeded): ...
   (This is OK - it's advisory only)
```

---

## Database Verification

### Supabase: profiles table
- [ ] Find user record by email/id
- [ ] `is_premium = true` after purchase
- [ ] `is_premium = false` for free users

### Supabase: subscriptions table
- [ ] Record exists for user after purchase
- [ ] `provider = 'google'`
- [ ] `status = 'active'`
- [ ] `product_id = 'arcana_premium_[monthly|yearly|lifetime]'`
- [ ] Timestamps populated correctly

---

## Feature Access Tests

### Free User (Before Purchase)
- [ ] Celtic Cross spread shows paywall
- [ ] Birth chart shows paywall
- [ ] Hitting save limit shows paywall
- [ ] Ads appear (if configured)
- [ ] Basic 3-card spread works

### Premium User (After Purchase)
- [ ] Celtic Cross spread accessible
- [ ] Birth chart accessible
- [ ] Unlimited saves work
- [ ] No ads appear
- [ ] All premium features unlocked
- [ ] Premium badge visible

---

## Edge Cases

### No Internet
- [ ] Paywall opens
- [ ] Shows fallback prices ($4.99, $24.99, $29.99)
- [ ] Amber warning: "Premium Not Available"
- [ ] Purchase button disabled
- [ ] No crash

### RevenueCat Not Configured
- [ ] Shows fallback prices
- [ ] Amber warning displayed
- [ ] Purchase button disabled
- [ ] Console warning logged
- [ ] App doesn't crash

### Product ID Suffixes
- [ ] Handles `:base-plan` suffix correctly
- [ ] Products match despite suffix
- [ ] Purchase works normally
- [ ] No "Product not found" errors

### Already Premium
- [ ] Can still open paywall
- [ ] Billing guard shows advisory warning
- [ ] Purchase can proceed (not blocked)
- [ ] RevenueCat handles correctly

---

## Price Consistency Check

### All Locations Match
- [ ] RevenueCat Dashboard
- [ ] Google Play Console
- [ ] App paywall display
- [ ] Google Play purchase dialog
- [ ] Console logs
- [ ] Database records
- [ ] Fallback prices in code

### Code Verification
- [ ] `src/services/billing.ts` line 202: `'$4.99'`
- [ ] `src/services/billing.ts` line 211: `'$24.99'`
- [ ] `src/services/billing.ts` line 220: `'$29.99'`
- [ ] `src/services/billing.ts` line 406: `'$4.99'`
- [ ] `src/services/billing.ts` line 415: `'$24.99'`
- [ ] `src/services/billing.ts` line 424: `'$29.99'`
- [ ] `src/components/premium/PaywallSheet.tsx` line 51: `'$4.99'`
- [ ] `src/components/premium/PaywallSheet.tsx` line 52: `'$24.99'`
- [ ] `src/components/premium/PaywallSheet.tsx` line 53: `'$29.99'`

---

## Subscription Management

### Google Play
- [ ] Can access subscription in Google Play
- [ ] "Manage on Google Play" button works
- [ ] Can view subscription details
- [ ] Can cancel subscription
- [ ] Can modify subscription

### In-App
- [ ] Settings shows "Premium Active"
- [ ] Green checkmark visible
- [ ] "Sync Subscription Status" works
- [ ] Correct subscription tier displayed

---

## Error Handling

### User-Facing Errors
- [ ] Errors have friendly messages
- [ ] No technical jargon
- [ ] Clear next steps provided
- [ ] Retry options available where appropriate

### Developer Errors (Console)
- [ ] Detailed error logs present
- [ ] Error stack traces captured
- [ ] Context information included
- [ ] Product IDs logged for debugging

---

## Performance

### Loading Times
- [ ] Paywall opens quickly (<1s)
- [ ] Product loading <3s on good connection
- [ ] Purchase completes in reasonable time
- [ ] No UI freezing during operations

### Smoothness
- [ ] Animations smooth
- [ ] No visual glitches
- [ ] Transitions clean
- [ ] Responsive to touches

---

## Final Verification

### All Plans Tested
- [ ] Monthly purchase tested
- [ ] Yearly purchase tested
- [ ] Lifetime purchase tested
- [ ] All complete successfully

### Documentation
- [ ] Screenshots taken of paywall
- [ ] Console logs captured for each test
- [ ] Database state verified
- [ ] Issues documented if found

### Sign-Off
- [ ] All critical tests pass
- [ ] No blocking issues found
- [ ] Prices verified correct everywhere
- [ ] Ready for production testing

---

## Quick Issue Resolution

| Issue | Quick Fix |
|-------|----------|
| Old prices showing | Clear cache, rebuild app |
| Purchase button disabled | Check RevenueCat "Current" offering |
| "Premium Not Available" | Add products to RevenueCat offering |
| Transaction ID is UUID | Check code is using latest fix |
| Products not loading | Verify API key in `.env` |
| Restore not working | Check Google account has purchase |

---

**Total Checkpoints**: 100+
**Estimated Testing Time**: 45-60 minutes for full suite
**Critical Tests**: Price display, Purchase flow, Transaction ID format

Print this checklist and check off items as you test!
