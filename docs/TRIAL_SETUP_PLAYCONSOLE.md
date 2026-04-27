# Set up the 3-day free trial on Google Play

Web (Stripe) is wired automatically — every yearly checkout session created
by `create-checkout-session` gets `trial_period_days: 3`. No Stripe dashboard
work needed.

Android side is where you have to flip a switch in Play Console. Once done,
RevenueCat auto-syncs and the app starts offering the trial.

## Steps

1. Open https://play.google.com/console and pick the Arcana app
2. Left nav: **Monetize → Subscriptions**
3. Click **arcana_premium_yearly** (the existing yearly product — should
   already exist from when RevenueCat was set up)
4. Find the **Base plan** for it
5. Click **Add offer** (or "Manage offers" if any exist) → **Free trial**
6. Configure:
   - **Offer ID:** `yearly-3day-trial` (or any unique ID)
   - **Duration:** 3 days
   - **Eligibility:** "Users who have not previously had this offer" (default — prevents trial abuse)
   - **Countries:** All available
7. Save the offer
8. Activate the offer (it ships in DRAFT until you flip it active)

## Verify in RevenueCat

1. https://app.revenuecat.com → Arcana project → Products
2. The `arcana_premium_yearly` product should show the new offer under **"Offers"**
3. Sometimes RevenueCat takes 5-15 min to pick up Play Console changes — if
   nothing appears, hit the "Refresh products" button in the RevenueCat UI

## Verify in the app

1. Install a fresh build (or clear app data on a test device)
2. Open the paywall
3. The yearly plan should now show "3-day free trial — cancel anytime before charge"
4. Tap it → Play Store sheet should say "Try 3 days for free, then $24.99/year"

## What this changes for users

- **First-time buyers** of the yearly plan get 3 days free, then auto-charge
- **Returning buyers** (who used the trial before, then cancelled) are NOT
  eligible — they pay immediately. This is enforced by Google, not us.
- **Monthly + Lifetime** are unchanged — no trial.

## Cancellation behavior

If a user cancels DURING the trial window:
- Google: subscription auto-ends at trial expiry, no charge
- RevenueCat: webhook fires `cancellation` event, `is_premium` flips to false at trial-end (NOT immediately — they keep premium for the remaining trial days)
- Stripe: same behavior — `trial_will_end` and `customer.subscription.deleted` events fire, our webhook handles both

If they cancel AFTER the trial converts to paid:
- They keep premium until the period end (annual)
- After period end, `is_premium` flips off via `customer.subscription.deleted` webhook

## Telemetry

The Stripe webhook records `status: "trial"` in the `subscriptions` table when a user is in the trial window vs `status: "active"` after conversion. You can query for trial-conversion rate:

```sql
SELECT
  date_trunc('day', started_at) AS day,
  count(*) FILTER (WHERE status = 'trial') AS trials_started,
  count(*) FILTER (WHERE status = 'active') AS trials_converted
FROM subscriptions
WHERE provider = 'stripe' AND product_id LIKE '%yearly%'
GROUP BY day ORDER BY day DESC;
```

Same for RevenueCat (provider = 'google').
