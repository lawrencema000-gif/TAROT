# Monetization Refactor — 2026-04-25

This doc captures the business-model change and the external-account cleanup
that must be performed in RevenueCat, Google Play Console, the Apple App Store
(once iOS is live) and Stripe after this commit ships.

## Summary

**Before** — rewarded ads granted single-use feature unlocks (one reading,
one spread). Per-report one-offs (`$6.99` Career, `$9.99` Natal, `$12.99`
Year Ahead) sat next to a subscription and a Moonstones currency. Four
ways to pay for one outcome. Confusing.

**After** — two transactional items, that's it:

| Item | What it does |
|------|--------------|
| Premium subscription | Unlocks every feature. No ads. |
| Moonstones (packs) | Universal in-app currency. Spend on any report / unlock. |

Every completed rewarded ad credits **+50 Moonstones** (universal), not a
per-feature grant. Ads are unlimited per day.

**Removed from the client:** per-report Stripe checkouts
(`$6.99` / `$9.99` / `$12.99`). The `create-report-checkout` edge fn + its
`startReportCheckout` client wrapper stay in the repo for deprecated
backward-compat on any in-flight payment links but are NOT called from any
UI path anymore.

---

## Files changed in this commit

- `supabase/migrations/20260601000000_monetization_refactor.sql`
  — adds `rewarded-ad` kind to client-insert policy, partial unique index
  for idempotency, `moonstone_credit_for_ad(ad_event_id, amount)` RPC
- `src/services/rewardedAds.ts` — rewritten to credit +50 Moonstones via
  the RPC. Legacy `hasTemporaryAccess` / `consumeTemporaryAccess` kept as
  stubs returning `false`.
- `src/components/premium/WatchAdSheet.tsx` — "Earn 50 Moonstones" UX.
  `feature` / `spreadType` / `onUnlocked` props deprecated but still
  accepted for backward compat.
- `src/pages/NatalChartReportPage.tsx`
- `src/pages/YearAheadReportPage.tsx`
- `src/pages/CareerReportPage.tsx`
  — all three paywall sections rewritten: PRIMARY = Upgrade to Premium,
    SECONDARY = Unlock with Moonstones, zero-balance helper offers the
    Watch-Ad-to-earn CTA.
- `src/dal/moonstones.ts` — `rewarded-ad` added to the `TransactionKind`
  union.

---

## External-account cleanup — DO AFTER DEPLOY

These are manual steps that must happen in external admin consoles. None
of them can be done from code. Do them **after** the new client is live,
so users on the old client still see valid products until they update.

### Google Play Console

URL: https://play.google.com/console → Arcana (`com.arcana.app`) → Monetize
→ Products

1. **In-app products** — deactivate (do NOT delete — existing receipts
   must remain validatable):
   - `arcana.career_report_unlock`
   - `arcana.natal_chart_report_unlock`
   - `arcana.year_ahead_report_unlock`

   Set status → `Inactive`. Google won't serve them in billing flows but
   prior purchases still resolve.

2. **Subscriptions** — no change. Premium monthly / annual stay as-is.

3. **In-app products (Moonstone packs)** — no change. These are the
   consumable products backing the MoonstoneTopUpSheet and are still
   active:
   - `arcana.moonstones_small` (100)
   - `arcana.moonstones_medium` (300)
   - `arcana.moonstones_large` (1000)

### Apple App Store Connect (once iOS ships)

Mirror the Play Console steps:
- Mark per-report one-off IAPs as `Removed from Sale`.
- Keep Moonstone consumables + Premium subscription.

### RevenueCat

URL: https://app.revenuecat.com → Arcana project → Entitlements / Offerings

1. **Offerings → Paywalls** — the paywalls shown in the SubscriptionSheet
   should not reference per-report products. Audit the currently-serving
   offering and remove any package pointing at the three deactivated Play
   products listed above.

2. **Products tab** — mark the three one-off products as `Archived` so
   they don't appear in new offering UIs. Existing purchases still
   validate.

3. **Entitlements** — one entitlement: `premium`. It already gates
   everything in code via `profile.isPremium`. No changes needed.

### Stripe

URL: https://dashboard.stripe.com → Products

The `create-report-checkout` edge fn references Stripe Price IDs for the
three one-offs. After 60 days of no traffic on those prices, archive them:

1. Products → filter by name:
   - "Career Archetype Deep Report"
   - "Natal Chart Deep Report"
   - "Year Ahead Forecast"
2. For each → Archive product. Existing refunds still work on archived
   products.

**Do NOT archive** — these stay active:
- Moonstone pack products (small / medium / large)
- Premium monthly / annual subscription products

### Feature flags (optional, for a clean rollout)

If you want a killswitch in case of UX regression:

```sql
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('new-paywall-flow', true, 'Use Premium-primary paywall (2026-04-25). Set false to revert to per-report Stripe flow.')
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;
```

Then wrap the new paywall buttons in `useFeatureFlag('new-paywall-flow')`
with an `else` branch that renders the old Stripe CTA. **Not wired up in
this commit** — add it only if a regression is observed post-deploy. Code
is simpler without the flag.

---

## Verification checklist (post-deploy)

- [ ] Visit `/career` while logged out → paywall shows Premium-primary +
      Moonstones-secondary, no Stripe $price button.
- [ ] Same for `/natal-chart` and `/year-ahead`.
- [ ] Tap "Upgrade to Premium" → `SubscriptionSheet` opens.
- [ ] Tap "Earn 50 Moonstones — watch ad" (zero-balance case) → the
      `WatchAdSheet` opens.
- [ ] On Android, watch an ad to completion → balance increments by 50
      in the home widget within 2s.
- [ ] Supabase `moonstone_transactions` table: one row per ad, `kind =
      'rewarded-ad'`, `reference = ad_<ts>_<rand>`, `amount = 50`.
- [ ] Replay the same `ad_event_id` via the RPC directly → returns
      `already_credited = true`, `amount_credited = 0`. No double credit.

---

## Rollback plan

If a critical bug surfaces:

1. Revert this commit (the code change).
2. The SQL migration is idempotent and additive — no rollback needed.
   The `moonstone_credit_for_ad` function and idempotency index can stay
   in place harmlessly.
3. Re-activate the three one-off IAPs in Play Console (they're
   deactivated, not deleted — one click to restore).
