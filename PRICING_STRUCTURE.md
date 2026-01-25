# Pricing Structure & Double Billing Prevention

## 💰 Pricing Overview

Your app uses a **lifetime-first** pricing model with optional recurring subscriptions:

| Plan | Price | Type | Description |
|------|-------|------|-------------|
| **Premium Lifetime** | **$9.99** | One-time | Unlock everything + remove ads forever |
| Premium Monthly | $2.99 | Recurring | Monthly subscription (optional) |
| Premium Yearly | $19.99 | Recurring | Yearly subscription - best value (optional) |

### Why This Structure?

1. **Primary Option: Lifetime ($9.99)**
   - One-time purchase, no recurring charges
   - Users get full access forever
   - Removes ads permanently
   - Better user experience (no subscription fatigue)
   - Higher lifetime value per user

2. **Optional Subscriptions**
   - Monthly and yearly options available
   - For users who prefer subscriptions
   - Provides flexibility

## 🎯 Free vs Premium

### Free Version (with Ads)
- Daily tarot readings
- Daily horoscopes
- Journal entries (limited)
- Basic personality quizzes
- **Shows ads after certain actions**

### Premium Version
- ✅ Everything in free
- ✅ **No ads**
- ✅ Unlimited journal entries
- ✅ Advanced personality quizzes
- ✅ Detailed tarot interpretations
- ✅ Reading history access
- ✅ Custom card backs & backgrounds
- ✅ Priority support

## 🔒 Double Billing Prevention System

### The Problem

Your app supports payments on **two platforms**:
- **Web**: Stripe payments (97% revenue)
- **Mobile**: Google Play Billing via RevenueCat (70% revenue)

Without safeguards, users could accidentally pay twice!

### The Solution

We've implemented a **comprehensive double billing prevention system**:

#### 1. Database Tracking

The `subscriptions` table tracks:
```sql
- user_id: Who purchased
- provider: 'stripe' or 'google'
- product_id: What they purchased
- status: 'active', 'cancelled', etc.
```

#### 2. Pre-Purchase Checks

Before ANY purchase, the system checks:

```typescript
// In billing service
const billingCheck = await preventDoubleBilling(userId, platform);
if (!billingCheck.allowed) {
  return {
    success: false,
    error: 'You already have premium via [platform]'
  };
}
```

#### 3. Platform Detection

The app automatically detects where it's running:

```typescript
// src/utils/platform.ts
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Billing service auto-selects:
if (isNative()) {
  // Use RevenueCat → Google Play
} else {
  // Use Stripe → Web payments
}
```

#### 4. User Warnings

When users try to purchase on wrong platform:

**Scenario A**: User purchased on web, opens mobile app
```
⚠️ You already purchased premium on the web.
You don't need to purchase again in the app.
```

**Scenario B**: User purchased in mobile app, visits web
```
⚠️ You already purchased premium in the mobile app.
You don't need to purchase again on web.
```

### How It Works

```
┌─────────────┐
│ User clicks │
│  Purchase   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Check Database  │ ◄── Query subscriptions table
│ for existing    │     WHERE user_id = X
│ purchase        │     AND status = 'active'
└──────┬──────────┘
       │
       ▼
   Has Premium?
       │
   ┌───┴───┐
   │       │
  YES     NO
   │       │
   │       └──► Allow Purchase
   │
   ▼
Check provider
   │
   ├─► Same platform? → "Already purchased"
   │
   └─► Different platform? → "Already have premium via [other platform]"
```

## 🛡️ Safeguards in Code

### 1. BillingGuard Service

`src/services/billingGuard.ts` provides:

```typescript
// Check if user can purchase
export async function preventDoubleBilling(
  userId: string,
  attemptingPlatform: 'web' | 'mobile'
): Promise<{ allowed: boolean; reason?: string }>

// Get detailed purchase status
export async function checkPurchaseStatus(
  userId: string
): Promise<PurchaseInfo>

// Get user-friendly warning
export function getPlatformWarning(
  currentPlatform: 'web' | 'mobile',
  purchasePlatform: 'stripe' | 'google' | 'web'
): string | null
```

### 2. Integrated into Billing Services

**NativeBillingService** (Mobile/RevenueCat):
```typescript
async purchase(productId: string): Promise<PurchaseResult> {
  // CHECK BEFORE PURCHASE
  const billingCheck = await preventDoubleBilling(this.userId, 'mobile');
  if (!billingCheck.allowed) {
    return { success: false, error: billingCheck.reason };
  }

  // Continue with RevenueCat purchase...
}
```

**WebBillingService** (Web/Stripe):
```typescript
async purchase(productId: string): Promise<PurchaseResult> {
  // CHECK BEFORE PURCHASE
  const billingCheck = await preventDoubleBilling(this.userId, 'web');
  if (!billingCheck.allowed) {
    return { success: false, error: billingCheck.reason };
  }

  // Continue with Stripe purchase...
}
```

### 3. Single Source of Truth

Both platforms update the SAME database flag:

```sql
profiles.is_premium = true
```

When user signs in:
1. Check `profiles.is_premium`
2. If `true`, grant access (regardless of platform)
3. No platform-specific checks needed in UI

## 📊 Database Schema

```sql
subscriptions
├── id (uuid)
├── user_id (uuid) → profiles.id
├── provider ('stripe' | 'google' | 'samsung' | 'apple' | 'web')
├── product_id (text) → 'arcana_premium_lifetime', etc.
├── status ('active' | 'cancelled' | 'expired' | 'trial')
├── period ('lifetime' | 'monthly' | 'yearly')
├── started_at (timestamptz)
├── expires_at (timestamptz) → NULL for lifetime
├── transaction_id (text) → Stripe sub ID or Google purchase token
└── created_at (timestamptz)
```

## 🧪 Testing Double Billing Prevention

### Test Case 1: Purchase on Web First

1. Open web version
2. Purchase lifetime ($9.99)
3. Verify `is_premium = true` in database
4. Open mobile app
5. Try to purchase
6. ✅ Should show: "Already have premium via web purchase"

### Test Case 2: Purchase in App First

1. Open mobile app
2. Purchase lifetime ($9.99)
3. Verify `is_premium = true` in database
4. Open web version
5. Try to purchase
6. ✅ Should show: "Already have premium via mobile app purchase"

### Test Case 3: New User

1. Open app (web or mobile)
2. No existing subscription
3. ✅ Should allow purchase

### Test Case 4: Expired Subscription

1. User had subscription
2. Cancelled and expired
3. `status = 'expired'`, `is_premium = false`
4. ✅ Should allow new purchase

## 🔄 Subscription Management

### Web Users (Stripe)

Users can manage via Customer Portal:

```typescript
// In your settings page
const billingService = getBillingService();
if (billingService.provider === 'web') {
  await (billingService as any).openCustomerPortal();
  // Opens Stripe's hosted portal
}
```

Portal allows:
- View subscription status
- Change payment method
- Cancel subscription
- View invoices

### Mobile Users (RevenueCat/Google Play)

Direct them to Google Play:

```typescript
// Show message
"Manage your subscription in the Google Play Store app"

// Or open Play Store
window.open('https://play.google.com/store/account/subscriptions');
```

## 💡 Edge Cases Handled

### 1. Lifetime Purchase

```javascript
{
  period: 'lifetime',
  expires_at: null,  // Never expires
  status: 'active'   // Always active
}
```

### 2. Trial Period (if enabled)

```javascript
{
  status: 'trial',
  started_at: '2024-01-01',
  expires_at: '2024-01-04'  // 3 days later
}
```

When trial ends → webhook updates to `active` or `expired`

### 3. Grace Period (Failed Payment)

```javascript
{
  status: 'grace_period',
  is_premium: true  // Still has access
}
```

User has ~7 days to update payment

### 4. Platform Migration

User wants to switch platforms:

```javascript
// Scenario: User has web subscription, wants to use mobile instead

// Current:
{ provider: 'stripe', status: 'active' }

// Solution: Cancel Stripe first, then purchase on mobile
// System will allow purchase once status = 'cancelled'
```

## 🎨 UI/UX Considerations

### Show Platform Warning

```typescript
import { checkPurchaseStatus } from './services/billingGuard';

const status = await checkPurchaseStatus(userId);
if (status.warning) {
  // Show warning banner
  <div className="warning">
    {status.warning}
  </div>
}
```

### Disable Purchase Button

```typescript
<Button
  disabled={!status.canPurchase}
  onClick={handlePurchase}
>
  {status.isPremium ? 'Already Premium' : 'Purchase'}
</Button>
```

### Show Manage Subscription

```typescript
{status.isPremium && status.provider === 'stripe' && (
  <Button onClick={openCustomerPortal}>
    Manage Subscription
  </Button>
)}

{status.isPremium && status.provider === 'google' && (
  <p>Manage in Google Play Store</p>
)}
```

## 📈 Revenue Optimization

### Why Dual Platform Approach?

| Platform | Fee | You Keep | User Experience |
|----------|-----|----------|-----------------|
| Web (Stripe) | 2.9% | **97.1%** | Direct checkout, instant |
| Mobile (Google Play) | 30% | 70% | Required by policy, familiar |

### Strategy

1. **Encourage web purchases** when possible (higher revenue)
2. **Support mobile purchases** (required for app stores)
3. **Same premium experience** regardless of platform
4. **No double charging** maintains trust

## ✅ Setup Checklist

- [ ] Stripe products created ($9.99 lifetime, $2.99 monthly, $19.99 yearly)
- [ ] Price IDs added to `.env`
- [ ] RevenueCat configured with same products
- [ ] Webhook endpoint configured
- [ ] Database subscriptions table exists
- [ ] BillingGuard service integrated
- [ ] Tested web purchase flow
- [ ] Tested mobile purchase flow
- [ ] Tested double billing prevention
- [ ] UI shows appropriate warnings

## 🆘 Troubleshooting

**Issue**: User says they were charged twice

**Solution**:
1. Check `subscriptions` table for duplicate entries
2. Check both Stripe and Google Play for transactions
3. If double charge confirmed, refund one platform
4. Verify `preventDoubleBilling()` is called in both services

**Issue**: User can't purchase after cancelling

**Solution**:
1. Check `subscriptions.status` is 'cancelled' or 'expired'
2. Check `profiles.is_premium` is `false`
3. If stuck as `true`, manually set to `false`

**Issue**: Premium not working after purchase

**Solution**:
1. Check webhook fired successfully (Edge Function logs)
2. Verify `profiles.is_premium = true` in database
3. Check `subscriptions` table has active entry
4. Clear app cache and restart

---

## 📚 Related Files

- `src/services/billing.ts` - Main billing service
- `src/services/billingGuard.ts` - Double billing prevention
- `src/utils/platform.ts` - Platform detection
- `supabase/migrations/20260101111354_add_quiz_definitions_subscriptions_audit.sql` - Subscriptions table
- `supabase/functions/stripe-webhook/index.ts` - Stripe webhook handler

---

**Remember**: The goal is to maximize revenue while maintaining trust. Users should NEVER be charged twice!
