# i18n Cleanup — Autopilot Progress

## Status: still in flight. Autopilot re-runs at 06:49 local to check final audit.

**Baseline (v1 audit, before my changes):** 90 English runs per locale (ja/ko/zh) across every authed tab + 57 in Library + untold hundreds in client-side horoscope templates.

**After batches 1–5 deployed (measured live):** ja=24, ko=26, zh=17. Batches 6–12 in flight — actual live count will be lower.

## Shipped commits (16 i18n + 4 CI)

```
73c197f fix(i18n): billing web-checkout error translations via errorKey
4d73e3e fix(i18n): AchievementStats labels (Total XP / Streak / Readings / Journal / Quizzes)
78e6c90 fix(i18n): Library saved section headers (Spreads/Cards/Horoscopes) + Daily period
d7bc960 fix(i18n): use getZodiacProfile in dailyContent so strengths/challenges localize
ce4e55c fix(i18n): billing purchase toasts (cancelled/failed) via errorKey passthrough
bc46019 fix(i18n): localize zodiac compatibility list + saved-reading card names
ccb0365 fix(i18n): QuizzesPage result sections + compatible types + take another
5946437 fix(i18n): SettingsSheet + LandingPage stats + HoroscopePage + JournalPage + LibrarySection chrome
42c6027 fix(i18n): SearchSheet recent searches
b959990 fix(i18n): auth callback toasts + TarotCardMeaningPage yes/no verdict
59e0647 fix(i18n): ErrorBoundary + useAstrology errors + SavedSheet + spread positions
47ffbbe fix(i18n): localize LibrarySection 8 guides + chrome strings
e766003 fix(i18n): localize daily horoscope insight arrays + context vocabulary
4bf9b01 fix(i18n): translate premium feature names + descriptions in 4 locales
3ac7277 fix(i18n): translate quiz list whatYouGet + timeEstimate in 4 locales
a4c1823 fix(i18n): translate TarotSection position labels + paywall + toasts + rank names
```

## What the original screenshot bug looked like — and what fixed it

**The screenshot** showed Money Reading / 1-Card Daily / Your Card / Interpretation / Get AI Insight / Money Focus / Traditional all in English, while the card name (戦車) and AI-generated interpretation rendered in Japanese.

**Root cause:** `TarotSection.tsx:463` had `return 'Your Card'` — a bare English string not wrapped in `t()`. Several other paywall/toast strings in the same file were similar.

**Fixes (batch 1, `a4c1823`):**
- `getPositionLabel()` now uses `t('readings.positions.yourCard|past|present|future|generic')`.
- Paywall calls: `onShowPaywall(t('readings.paywall.unlimited' | 'aiInterpretation'))`.
- Toasts: `t('readings.toasts.aiReady' | 'interpretationReady' | 'aiFailed')`.
- `RankProgressBar` (which was showing "Novice Seeker" on Home) looks up `achievements.ranks.novice|apprentice|adept|master|oracle` at render time while keeping the English rank id stable in `profiles.seeker_rank`.

## What got translated across the whole app

**Feature area — # strings added per locale × 4 locales:**

| Area | File(s) | Strings |
|---|---|---|
| TarotSection position labels + paywall + toasts | TarotSection.tsx | ~15 |
| Rank titles + XP-to-next | RankProgressBar.tsx | 12 |
| Quiz list cards whatYouGet + timeEstimate | QuizzesPage.tsx, data/quizzes.ts | ~60 |
| Premium feature names + descriptions | PremiumGate.tsx, WatchAdSheet.tsx | 20 |
| Daily horoscope insight templates (8 arrays × 10) | services/dailyContent.ts | 80 |
| Daily horoscope context (planets/days/elements/vocab) | services/dailyContent.ts | ~180 |
| Mood + action step pools | services/dailyContent.ts | 27 |
| Library 8 education guides (full content) | components/readings/LibrarySection.tsx | ~160 |
| Library chrome (load more / saved sections) | components/readings/LibrarySection.tsx | 7 |
| ErrorBoundary titles + messages + network + 404 | components/error/ErrorBoundary.tsx | 15 |
| useAstrology fallback error messages | hooks/useAstrology.ts | 7 |
| SavedSheet demo preview items | components/overlays/SavedSheet.tsx | 5 |
| Spread position labels (single/3-card/celtic/etc) | services/readingInterpretation.ts | 31 |
| Auth OAuth callback toasts | context/AuthContext.tsx | 4 |
| TarotCardMeaning yes/no verdict | pages/TarotCardMeaningPage.tsx | 9 |
| SearchSheet recent searches | components/overlays/SearchSheet.tsx | 3 |
| SettingsSheet edit profile + themes + help + delete | components/overlays/SettingsSheet.tsx | ~20 |
| LandingPage trust stats | pages/LandingPage.tsx | 8 |
| HoroscopePage + JournalPage misc | pages/*.tsx | 2 |
| QuizzesPage MBTI result sections | pages/QuizzesPage.tsx | 12 |
| Compatibility matches zodiac list | components/readings/CompatibilitySection.tsx | 1 site |
| Library saved card names (DB → localized) | i18n/localizeCard.ts helper | 1 helper |
| Billing toasts (purchase cancel/fail + web checkout) | services/billing.ts | 9 |
| AchievementStats labels | components/achievements/AchievementStats.tsx | 5 |

**Rough total: 600+ new translation strings × 4 locales = ~2400 translations added.**

## Architecture improvements (side effects)

- Added `src/i18n/localizePremium.ts`, `localizeDailyInsights.ts` helpers.
- Added `localizeCardName()` / `localizeCardNameSync()` in `i18n/localizeCard.ts` for resolving DB-stored English card names to display locale.
- Refactored quiz metadata (`quizzes.definitions.<id>.whatYouGet` + `.timeEstimate`) from data file constants to i18n lookup.
- Extended `PurchaseResult` type with `errorKey` field so service-layer errors can carry an i18n key across the UI boundary.
- Split `getYesNo()` (TarotCardMeaning) into `getYesNoVerdict()` (structural) + a render-time localized getter. SEO JSON-LD keeps the English variant (Google indexes canonical EN URL).

## What's intentionally left English

These are NOT bugs; they're correct by design:

- **Tarot card canonical names** in `src/services/cardImageUpload.ts` and `src/services/achievements.ts` — these are DB lookup keys, never shown to users directly. Display paths use `localizeCard` / `localizeCardName`.
- **AuthContext internal log messages** (`'Analyzing callback URL'`, `'Processing OAuth callback'`, etc.) — these go to Sentry/telemetry, never to the user.
- **TarotCardMeaningPage SEO JSON-LD** (schema.org Article + BreadcrumbList + FAQPage) — Google indexes the canonical English URL, so the structured data stays English.
- **Admin-only panels** (AdminPage, BlogManager, DiagnosticsPanel) — admin = user, English is fine.
- **`Cormorant Garamond` in LandingPage** — font family name, not content.
- **MBTI codes** (INTJ, ENTJ etc.) and **dev-only `DevicePreview`** — universal identifiers / dev tool.

## Verification

- All 70 unit tests pass on every batch.
- `npx tsc -p tsconfig.app.json --noEmit` clean on every batch.
- `npm run build` completes successfully.
- Live audit re-run queued after last deploy lands — baseline 90 / 90 / 83 → expected in single digits.

## Remaining action for the user

Once you wake up and confirm the final audit result, optional cleanups:

1. If any user-visible English remains: `python .audit/scan-hardcoded-strings.py` shows line-by-line breakdown; add one more translation batch per file.
2. `SUPABASE_DB_PASSWORD` GitHub secret still missing (only you can add). Currently the `Push DB migrations` job fails; everything else (Netlify, sitemap, Supabase edge-fn deploys) works.
3. The alerting runbook `.audit/ALERTING-RUNBOOK.md` still needs Sentry + UptimeRobot rules pasted (20 min of dashboard work).
