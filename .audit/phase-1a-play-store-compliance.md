# Phase 1A — Play Store Billing Compliance Audit

**Branch:** `feature/iching`
**Verdict:** 🔴 **NOT COMPLIANT for Play Store release.** Multiple P0 issues.

---

## Policy baseline (Google Play Billing, Nov 2024 / Jan 2025 enforcement)

Play Store requires the app to use **Google Play's billing library** for:
- Digital content consumed in-app
- In-app purchases including virtual currency
- Subscriptions
- Tipping / donations that confer in-app benefit

Apps in violation of this policy are subject to takedown from the Play Store. The [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738) specifically calls out "in-app purchases of content like virtual goods, currencies, upgrades, unlocks."

Stripe / third-party web billing is allowed **only** for:
- Services consumed outside the app (e.g., a physical object shipped, a consulting session held in-person)
- Cases where the Google DMA Article 5/6 alternative billing path applies (EU only, with approval)

Our pay-per-reports, Moonstones, subscriptions, and advisor-session bookings all qualify as "digital content consumed in-app." They must route through Google Play IAP on Android.

---

## Findings

### F1 🔴 P0 — Pay-per-report Stripe CTAs render unconditionally on native
**Where:**
- [src/pages/CareerReportPage.tsx](../src/pages/CareerReportPage.tsx) — "Or pay $X.XX with card" button
- [src/pages/YearAheadReportPage.tsx](../src/pages/YearAheadReportPage.tsx) — same pattern
- [src/pages/NatalChartReportPage.tsx](../src/pages/NatalChartReportPage.tsx) — same pattern

**Risk:** An Android user installs the APK, opens any report page, taps "pay with card" → hits Stripe Checkout outside Google Play → **policy violation**. Automatic store takedown risk.

**Grep confirmation:** none of the three files import `isNative`, `isAndroid`, or `Capacitor`. The Stripe button is always rendered once the user doesn't have Moonstones.

### F2 🔴 P0 — Advisor payouts dashboard exposes Stripe Connect onboarding on native
**Where:** [src/pages/AdvisorDashboardPage.tsx](../src/pages/AdvisorDashboardPage.tsx) `startOnboarding()` invokes the `advisor-stripe-onboard` edge function.

**Nuance:** This one is *actually* fine under Google's policy — advisors are *receiving* money, not spending. Stripe Connect Express is for payouts, which is permitted. However, the card currently sits behind the `advisor-payouts` flag (default OFF), so this is low-priority; just keep the flag OFF on mobile until we confirm with legal.

**Action:** Hide the entire payouts card on native (`isNative()`) anyway — simplest safe path.

### F3 🔴 P0 — Moonstones have no top-up path at all
**Gap:** Every surface that lets users SPEND Moonstones (advisor booking, report unlock, tip, replay unlock) was shipped. Zero surfaces let users **BUY** Moonstones. `PRODUCT_IDS` in [billing.ts](../src/services/billing.ts) only has `arcana_premium_{monthly,yearly,lifetime}`.

**Impact:** Moonstones can be earned (daily check-in = 5/day, referrals = 100, quiz complete = 2) but cannot be purchased. The first user to hit a 300-Moonstone Year-Ahead paywall is stuck.

**Play Store implication:** Even when we build Moonstone packs, they MUST be configured as Play Store in-app products on Android. We cannot use Stripe for them on Android.

### F4 🟡 P1 — Stripe report-checkout webhook path has no defence-in-depth against native clients
**Where:** [supabase/functions/create-report-checkout/index.ts](../supabase/functions/create-report-checkout/index.ts) happily mints a Stripe session regardless of which client is calling.

**Risk:** If a determined native user intercepts the client and calls this function directly, they'd get a Stripe session URL and could pay outside the store. Probability low, but defence-in-depth matters for policy audits.

**Fix option A:** have the client pass a `clientPlatform` header/body field, edge function refuses if `android`.
**Fix option B:** do not block — server continues to accept (web users still need Stripe), and we rely on UI gating. This is what most apps do.

### F5 🟡 P1 — Subscription webhook doesn't credit Moonstones, and neither does RevenueCat webhook
**Where:** Neither [stripe-webhook](../supabase/functions/stripe-webhook/index.ts) nor [revenuecat-webhook](../supabase/functions/revenuecat-webhook/index.ts) writes to `moonstone_transactions`.

**Impact:** Once we add Moonstone packs to RevenueCat, the purchase flow won't credit the ledger. The `purchase` kind exists on the moonstone_transactions CHECK constraint but is never inserted.

**Also: subscribers don't get any complimentary Moonstones.** The roadmap's "Arcana+ = 50 free Moonstones/mo" idea hasn't been wired.

### F6 🟡 P1 — Deep-link parser hasn't been updated for Sessions A–G routes
**Where:** [src/services/deepLink.ts](../src/services/deepLink.ts) only handles `/reading`, `/card`, `/horoscope`. Host is `arcana.app`.

**Missing:**
- `/invite/:code` (compat invites) — written to link to `tarotlife.app`, parser doesn't handle this host OR this path
- `/reports/career`, `/reports/year-ahead`, `/reports/natal-chart`
- `/live-rooms`, `/live-rooms/:id`
- `/ai/quick`, `/ai/tarot`
- `/advisors/:slug/book`, `/advisors/session/:id`, `/advisors/verify`, `/advisors/dashboard`
- `/sandbox`

**Impact:** Any share surface that generates a URL for SMS / WhatsApp / email will fail to open the correct tab inside the native app. User taps link → lands on home screen.

### F7 🟢 Informational — Domain mismatch between code and marketing
Compat invite & referral links hardcode `https://tarotlife.app/` but the deep-link parser checks `arcana.app`. The app listing is `com.arcana.app`. Decide on ONE canonical domain for native deep-links and update both sides.

### F8 🟢 Informational — Existing Stripe subscription path on web is correctly gated
[services/billing.ts](../src/services/billing.ts) correctly dispatches to `NativeBillingService` or `WebBillingService` based on `isNative()`. Only the web path hits `create-checkout-session`. This part is already compliant. The new Stripe paths added in Sessions E–F bypass this dispatch and that's the bug.

---

## Proposed fix plan (Phase 2A — details)

### Fix F1 — hide Stripe buttons on native
Add a helper:
```ts
// src/utils/platform.ts
export function canPayWithCard(): boolean {
  return !isNative();
}
```
Gate all three "Or pay with card" links in the report pages behind `canPayWithCard()`.

### Fix F2 — hide advisor payouts on native (defensive)
`payoutsEnabled && !isNative()` wraps the payouts card in `AdvisorDashboardPage`.

### Fix F3 — ship Moonstone packs
1. Add Moonstone pack IDs to `PRODUCT_IDS`:
   ```ts
   MOONSTONES_SMALL: 'arcana_moonstones_100',   // $2.99 → 100 Moonstones
   MOONSTONES_MEDIUM: 'arcana_moonstones_300',  // $7.99 → 300
   MOONSTONES_LARGE: 'arcana_moonstones_750',   // $16.99 → 750
   MOONSTONES_XL: 'arcana_moonstones_2000',     // $39.99 → 2000
   ```
2. Configure matching products in Play Console + RevenueCat dashboard (*OPS task, not code*).
3. Ship a `MoonstoneTopUpSheet` component that:
   - On native: shows the four RevenueCat packages
   - On web: shows the same four via `create-checkout-session` with a new `purchase_type='moonstones'` metadata
4. Extend revenuecat-webhook + stripe-webhook to recognize `moonstones` product IDs and insert `moonstone_transactions (user_id, amount, kind='purchase', reference=<txn_id>)`.
5. Wire a "Top up" button into `MoonstoneWidget` and anywhere a user could run out (low-balance UI on report unlock, advisor booking).

### Fix F4 — server-side platform guard (optional hardening)
Add a `platform` field to `create-report-checkout` request schema; reject when `'android'`. Helps during policy audits. Keep it silent in the UI — client never sends `android` anyway because Fix F1 hides the button.

### Fix F5 — webhook credits the Moonstone ledger
- revenuecat-webhook: on `INITIAL_PURCHASE` for a moonstones SKU → insert ledger row with correct amount.
- stripe-webhook: on `checkout.session.completed` with `metadata.purchase_type='moonstones'` → same.
- Subscribers receive a monthly grant via a new `moonstone_subscriber_grant` Postgres scheduled function (separate follow-up).

### Fix F6 + F7 — deep-link parser rebuild
Rewrite `parseDeepLink` to cover every Session A–G route and accept BOTH `arcana.app` and `tarotlife.app` hosts. The native URL handler in App.tsx also needs to route `invite` / `reports/*` / `live-rooms` / etc. to the right tab.

---

## Summary for Phase 2 priority

| ID | Priority | Blocks Play release? | Effort |
|----|----------|----------------------|--------|
| F1 | P0 | YES — immediate takedown risk if any user pays via card on Android | S |
| F2 | P0 (defensive) | unlikely but trivial to do | XS |
| F3 | P0 | YES — can't charge for anything on Android without this | M |
| F4 | P1 | No | XS |
| F5 | P1 | No, but first Moonstone sale fails without this | S |
| F6 | P1 | Breaks viral loop on native | S |
| F7 | P2 | Annoyance | XS |

**Recommendation:** Phase 2A must address F1, F2, F3, F5, F6 before flipping any paid-feature flag ON for Android users. F4 and F7 are nice-to-haves.
