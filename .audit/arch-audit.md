# Frontend Architecture Audit

Scope: `src/` of the TAROT app (Vite + React + TS + Supabase client). Read-only. Focused on fragility as features grow. DB, edge functions, and CI are explicitly out of scope.

---

## Critical (will cause production bugs at scale)

### C1. Layering is not enforced — pages bypass the service layer and call Supabase directly

- Files (pages): `src/pages/HomePage.tsx:18`, `src/pages/JournalPage.tsx:31`, `src/pages/QuizzesPage.tsx:41`, `src/pages/ProfilePage.tsx:23`, `src/pages/AuthPage.tsx:6`, `src/pages/OAuthOnboardingPage.tsx:20`, `src/pages/OnboardingPage.tsx:13`, `src/pages/AchievementsPage.tsx:24`, `src/pages/AdminPage.tsx:6`.
- Files (components): `src/components/readings/TarotSection.tsx:25`, `src/components/readings/HoroscopePage.tsx not-applicable`, `src/components/readings/HoroscopeSection.tsx:24`, `src/components/readings/LibrarySection.tsx:16`, `src/components/overlays/SettingsSheet.tsx:34`, `src/components/admin/BlogManager.tsx:4`.
- Problem: 14 files import `supabase` directly; 21 `supabase.from(...)` call sites are scattered across pages, components, context, and services. There is no repository/DAL. The same table gets queried with different columns in different files (e.g. `journal_entries` in `JournalPage.tsx:161` and again in `services/storage.ts`; `profiles` from `AuthContext.tsx:210` and `QuizzesPage.tsx:221`; `tarot_readings` in both `HomePage.tsx` and `JournalPage.tsx:197`).
- Concrete example: `JournalPage.tsx:155-173` (`loadEntries`) does a raw `supabase.from('journal_entries').select('*')` with no error handling — `error` is destructured away. Any RLS/schema change silently empties the journal UI. Same pattern in `QuizzesPage.tsx:127-136` (`loadPastResults`).
- Fix: Create `src/services/journal.ts`, `src/services/quizzes.ts`, `src/services/tarotReadings.ts`. Move all `supabase.from('<table>')` calls into the matching service. Lint rule (or `eslint no-restricted-imports`) forbidding `lib/supabase` imports outside `src/services/**` and `src/context/AuthContext.tsx` (the only legit consumer for auth).

### C2. Eager-imports bloat the main chunk — `index-*.js` is 817 KB

- File: `src/App.tsx:23-27` — `HomePage`, `OnboardingPage`, `OAuthOnboardingPage`, `AuthPage`, `LandingPage` all imported eagerly.
- Built artifacts (`dist/assets/*.js`): `index-B-JOB8qZ.js` = 817 KB. Compare the lazy peers: `HoroscopePage` 50 KB, `QuizzesPage` 40 KB, `JournalPage` 40 KB.
- Problem: `LandingPage` (534 lines, only rendered for anonymous web visitors) ships to every authenticated Android user too. `OAuthOnboardingPage` (477 lines) only shows once, post-OAuth, but is always in the first chunk. Five pages totaling ~2,200 lines live in the critical path.
- Concrete example: A returning authed Android user downloads ~500 KB of code they will never hit (`LandingPage` + `OnboardingPage` + `OAuthOnboardingPage` components, their `useReveal` hooks, zodiac wheel SVG, FAQ list, demo component). First paint is gated on this.
- Fix: Only `HomePage` needs eager status (logged-in start route). Move `LandingPage`, `OnboardingPage`, `OAuthOnboardingPage`, `AuthPage` to `lazy(() => import(...))` identical to the other 11 pages. Wrap the branches in `<Suspense>` which already exists further down.

### C3. `DailyContent` client type drifts from `astrology-daily` edge function response

- Client type: `src/types/astrology.ts:58-71`.
- Server payload: `supabase/functions/astrology-daily/index.ts:439-450` returns `moonSignLocalized` (among other fields) that the client type does not declare.
- Problem: No validation, no schema sharing. `hooks/useAstrology.ts:229` does `callFn<DailyContent>('astrology-daily', ...)` — an unchecked cast. If the edge function drops or renames a field (e.g. `powerMove` → `powerPlay`), TypeScript will not catch it; `TodayForYou.tsx:149` will silently render `undefined`.
- Fix: Move `DailyContent` (and siblings `WeeklyContent`, `MonthlyContent`, `NatalChart`) into a shared package consumable by both Deno and browser (`src/shared/contracts/` re-exported for edge functions via import-map) and validate at the response boundary with zod (zod is not currently installed — see H4).

### C4. Error handling is re-invented at every call site; many errors swallowed

- Silent-catch count: 83 `catch {...}` or empty `.catch(() => {})` across 38 files (service files, context, pages). Hot spots: `src/services/rewardedAds.ts` (9), `src/context/AuthContext.tsx` (6), `src/services/offline.ts` (4), `src/App.tsx` (4), `src/services/ads.ts` (3).
- `captureException` wrapper exists in `src/utils/telemetry.ts:244-264` but is only used in 4 files total (`AuthContext`, `ErrorBoundary`, `main.tsx`, `telemetry.ts`). Every other service uses raw `console.warn` / `console.log` / silent `catch {}`.
- Problem: Failures in ads init, billing, achievements, offline cache, background profile writes disappear. Sentry only sees render errors + OAuth errors. Production bug-hunting depends on user reports.
- Concrete example: `AuthContext.tsx:238` writes locale back to `profiles` without `await` / `.catch()`; in `AuthContext.tsx:252-257` the streak update has no `.catch`. A single offline failure corrupts client state because the optimistic update at line 258 is never rolled back.
- Fix: All services must call `captureException('service.method', err, {context})` in catches (not `console.warn`). Any `await supabase.from(...)` that returns `{ error }` must surface through `normalizeSupabaseError` (already exists in `src/utils/authErrors.ts`) and report via toast + Sentry.

---

## High (will cause velocity drag)

### H1. Two huge page files mix data-fetch, business logic, UI, and subviews

- `src/pages/QuizzesPage.tsx` = 1,412 lines. `src/pages/JournalPage.tsx` = 1,179 lines. `src/pages/AdminPage.tsx` = 789 lines. `src/components/readings/TarotSection.tsx` = 1,166 lines. `src/components/overlays/SettingsSheet.tsx` = 1,166 lines.
- QuizzesPage holds: quiz list, quiz runner, every result view (MBTI / Love Language / Big Five / Enneagram / Attachment / Mood), plus direct `supabase.from('quiz_results')` read/write, plus XP/ads/rate-prompt/achievement side effects.
- Inline component defined inside render: `QuizzesPage.tsx:502-533` — `CollapsibleSection` is created every render of the MBTI result view → React remounts its subtree on every state change (loses scroll, focus, animation state).
- Fix: Extract `<QuizRunner>`, `<QuizList>`, and one results component per quiz type. Move persistence into `src/services/quizzes.ts`. Move `CollapsibleSection` to module scope.

### H2. Duplicated AdMob plugin loading

- `src/services/ads.ts:28-43` defines `let AdMob` + `loadAdMobPlugin()`.
- `src/services/rewardedAds.ts:13-27` defines its own `let AdMob` + `loadAdMobPlugin()` — near-identical code, separate singleton state.
- Problem: Two modules each cache their own `AdMob` reference + call `AdMob.initialize` implicitly through different lifecycles. Timing bugs (reward ad tries to show before `ads.ts` has initialized the SDK) are easy to introduce.
- Fix: One `src/services/admob.ts` with a single `getAdMob()` / `ensureInitialized()`. Consumers (`ads.ts`, `rewardedAds.ts`) import from it.

### H3. State/cache strategy is inconsistent across features

- `src/hooks/useAstrology.ts:10-20` has a hand-rolled in-memory 5-min cache keyed by string for chart/daily/weekly/monthly/transits.
- `src/services/offline.ts` does Capacitor-Preferences-backed caching for rituals.
- `src/pages/HomePage.tsx:85-101` runs `Promise.all` supabase queries on every mount, no caching.
- `src/pages/JournalPage.tsx:161`, `QuizzesPage.tsx:127` refetch on every mount with no stale-while-revalidate.
- `AuthContext.tsx:164` plus `RitualContext.tsx:25` both hold `streak` independently (`profile.streak` from auth, plus a standalone `streak` state in ritual).
- Problem: Pages feel slow because they re-hit the network on every tab change; the duplicated streak state has already caused mismatch bugs (see commit history).
- Fix: Pick one cache layer. Options: (a) drop in TanStack Query — minimum change, zero net new code since in-memory-cache logic is already half-built; (b) continue hand-rolling but standardise on a single module `src/services/cache.ts` and use it from every `loadX()`.

### H4. No runtime validation of API responses; `zod` is not a dep

- `package.json:27-51` — no `zod`, no `valibot`, no JSON schema runtime.
- Every `callFn<T>` / `supabase.functions.invoke` / `supabase.from` result is cast blindly. 13 `as unknown as` escapes exist (benign ones like `SUPPORTED_LOCALES as unknown as string[]` but also load-bearing ones like `src/services/search.ts:67,174,231` casting user-generated content into typed rows).
- Fix: Add `zod`. Define response schemas next to each service function. Parse at the boundary.

### H5. Prop drilling on `onShowPaywall` / `refreshProfile` / `openOverlay`

- `onShowPaywall` flow: `ReadingsPage.tsx:71,75,79` → `TarotSection.tsx:104` → nested spread UI at `TarotSection.tsx:1153` (3 levels). Also appears in `components/premium/PremiumGate.tsx:81` and `components/premium/WatchAdSheet.tsx:14`.
- `refreshProfile` is destructured in HomePage, JournalPage, QuizzesPage, TarotSection, HoroscopeSection — always from `useAuth`, just to be called after an XP award.
- Fix: Paywall sheet is already a global singleton candidate; move to `UIContext` (`activeOverlay` already supports this pattern) with a `showPaywall(feature: string)` action. Refreshing profile after XP should be pushed into `services/levelSystem.ts` → emit through `GamificationContext`.

### H6. Mixed locale helper usage

- Canonical: `getLocale()` from `src/i18n/config.ts:136`.
- Violations (direct `i18n.language`):
  - `src/pages/BlogPostPage.tsx:62`
  - `src/pages/BlogPage.tsx:55`
- Problem: `DATE_LOCALES[i18n.language]` returns undefined for `'ja-JP'` (not normalised); falls back to English on blog date rendering.
- Fix: Replace with `DATE_LOCALES[getLocale()]`.

---

## Medium (polish)

### M1. `useApp()` back-compat hook composes three contexts and merges them

- `src/context/AppContext.tsx:31-41` — `useApp` calls `useUI()`, `useRitual()`, `useGamification()` then spreads them. Any consumer that uses the merged object subscribes to all three contexts (defeating the split in `AppContext.tsx:14-24`).
- Count surviving `useApp()` callers: worth grepping — they should migrate to the granular hook.

### M2. `streak` lives in two places

- `AuthContext.tsx:162` (profile.streak from DB).
- `RitualContext.tsx:25` (local `streak` state).
- `HomePage.tsx:41` uses `streak` from `useRitual`, but the DB value is in `profile` from `useAuth`. No single source of truth.

### M3. 21 `supabase.storage` calls concentrated in `AdminPage.tsx`

- `AdminPage.tsx:142, 150, 158, 178, 186, 194, 264, 273, 306, 331, 356, 365, 446` — bucket listing + URL building + upload + delete all inlined.
- Fix: `src/services/adminStorage.ts` wrapping `listBucket()`, `uploadFile()`, `getPublicUrl()`, `deleteFile()` — reused by `BlogManager.tsx` too.

### M4. 13 `as unknown as` casts — mostly benign but 3 are load-bearing

- `src/services/search.ts:67,174,231` — casting typed domain objects to `Record<string, unknown>` to satisfy a search index signature. That signature should accept `unknown` (or a proper `Indexable` interface).

### M5. Tab → route table is duplicated conceptually

- `src/context/UIContext.tsx:7-21` defines `TAB_ROUTES` + reverse.
- `src/App.tsx:80` defines `PAGE_TITLE_KEYS` — overlapping concept.
- `src/App.tsx:386-397` — `<Routes>` redeclares every path.
- Consolidate into a single `routes.ts` with `{ tab, path, titleKey, component, lazy }`.

### M6. Sign-up locale propagation does not hit `signIn` / magic link

- `AuthContext.tsx:743-753` adds `?lang=` to signup redirect.
- `AuthContext.tsx:910-911` adds `?lang=` to web OAuth.
- `signIn` (line 772) does not — fine for password auth but inconsistent if magic-link is added later.

---

## Positive findings

- Context was deliberately split (`AppContext.tsx:14`) into UI / Ritual / Gamification — avoids the whole-tree-rerender trap. Good foundation.
- `ErrorBoundary` (`src/components/error/ErrorBoundary.tsx`) wraps every rendered tree in `App.tsx:264-334`, correlation IDs route to Sentry through `captureException`.
- `getLocale()` is canonical and honoured in 95 % of call sites (all `src/i18n/localize*.ts` files, all service calls, all edge-function request bodies).
- Manual chunks in `vite.config.ts:17-40` split vendor, data, and motion/sentry/icons cleanly. `data-astrology` (423 KB) and `vendor-icons` (459 KB) are large but correctly isolated off the critical path.
- `appStorage` (`src/lib/appStorage.ts`) abstracts web localStorage vs Capacitor Preferences — not leaking platform details into pages.
- `PROFILE_WRITABLE_FIELDS` allowlist in `AuthContext.tsx:127-149` is a good defence-in-depth pattern.
- tsconfig is strict (`tsconfig.app.json:18-21`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Zero `as any` in the codebase.

---

## Proposed target architecture

```
UI (pages/ + components/)
    └── use*()            hooks in src/hooks (UI concerns: preload, progressive images)
Context (src/context)
    └── consumes services, exposes state + actions only — never raw supabase
Services (src/services)
    └── owns all supabase, functions.invoke, storage, AdMob, RevenueCat
    └── returns validated domain objects (zod-parsed)
    └── routes errors through src/utils/telemetry.captureException
lib/ (src/lib)
    └── supabase client, appStorage, platform shims — no business logic
contracts/ (new, shared with supabase/functions/)
    └── zod schemas + inferred TS types for every edge function response
```

Invariants to enforce (`eslint no-restricted-imports`):

1. `../lib/supabase` is importable only from `src/services/**` and `src/context/AuthContext.tsx`.
2. `@capacitor-community/admob` is importable only from `src/services/admob.ts`.
3. `@revenuecat/purchases-capacitor` only from `src/services/billing.ts` (already true).
4. `src/data/**` may not import from `src/services/**` or `src/context/**` (already true — keep it that way).
5. Any file over 500 lines requires an issue to split it — set `max-lines` in ESLint to warn.

Migration order (smallest PRs first):

1. Wrap the 5 eager pages in `lazy()` — one-line fix, biggest bundle win (C2).
2. Add zod + `DailyContent` schema — blocks future drift (C3 + H4).
3. Create `services/journal.ts`, `services/quizzes.ts`, `services/tarotReadings.ts`; move the direct supabase calls out of pages (C1).
4. Unify AdMob plugin loader (H2).
5. Add eslint `no-restricted-imports` to prevent regressions.
