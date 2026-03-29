Deep audit done on the repo/build/backend structure for **TAROT LIFE**. I did code + schema + build/test review with special focus on **Google ads**, auth/admin, backend wiring, and the likely causes of the "janky" feel.

## Executive summary

The app is **real and fairly substantial**, not mockware. It has:
- real Capacitor mobile plumbing
- Supabase auth/storage/functions/migrations
- RevenueCat billing
- AdMob integration
- tests and a successful production build

But it also has some clear quality gaps that explain why production can feel rough:

### Overall verdict
- **Architecture:** decent base
- **Production readiness:** usable, but not polished enough for a high-quality Play Store feel
- **Biggest weak area:** **ads + premium flow consistency**
- **Biggest UX issue:** **main-thread heaviness / oversized bundles / too much work on load**
- **Biggest engineering smell:** **some important flows compile/build, but type safety and system coherence are broken**

---

# What I audited

## 1) Build / test / code quality
I ran:
- `npm test` → **passed**
- `npm run build` → **passed**
- `npm run typecheck` → **failed**
- `npm audit` → **11 vulnerabilities** reported, including several high severity dependency issues

### Important conclusion
This project **builds successfully but does not typecheck cleanly**. That usually means:
- regressions are slipping through
- CI likely isn't blocking quality strongly enough
- runtime edge-case bugs can survive release

That alone is a production quality warning.

---

# Key findings

## A. High-priority issues

### 1) Typecheck is failing in production code
This is not cosmetic. It means the codebase has correctness debt.

Notable failures include:
- OAuth listener typing mismatch in `AuthContext`
- invalid status values like `"cancelled"` passed where only `"success" | "failure"` are allowed
- suspicious impossible comparisons
- unsafe indexing
- unused state/variables showing churn and unfinished cleanup

### Why this matters
When a mobile app feels "janky," one common root cause is not just rendering performance — it's **logic instability**:
- state races
- async callback inconsistencies
- unhandled branches
- weakly enforced contracts between modules

This codebase shows signs of exactly that.

---

### 2) Ads system is fragmented and internally inconsistent
This is the biggest audit concern around your Google ads section.

You have **two different ad data models** living side by side:

#### Client currently does:
- direct inserts into `ad_impressions`
- direct inserts into `rewarded_ad_unlocks`
- local ad cooldown and daily rewarded cap in app storage

#### Backend also has:
- `ad-config` edge function
- `ad-events` edge function
- DB RPCs `get_ad_config`, `record_ad_impression`, `get_user_daily_ad_stats`
- analytics daily rollups and ad config tables

### Root issue
The app is **not fully using the backend ad platform abstraction that already exists**.

That causes several problems:
- analytics can become incomplete or inconsistent
- local device state can diverge from server truth
- rewarded limits are enforced locally, not authoritatively
- app behavior depends on env vars instead of centralized server config
- admin analytics may not reflect actual ad lifecycle quality

### Example
`src/services/ads.ts` uses env-based ad unit IDs directly.

But Supabase already has:
- `ad_units`
- `get_ad_config()`
- `ad-events`
- `ad-config`

So there are effectively **two ad systems**:
1. env-configured app ads
2. backend-configured ad platform

That duplication is a real root-cause problem.

---

### 3) Ad analytics are not high-fidelity enough for optimization
Current tracking is too simplistic for serious monetization tuning.

Examples:
- app tracks banner/interstitial impressions directly, but not with consistent full lifecycle event ingestion
- `showInterstitial()` tracks impression **before** showing the ad
- app open ad tracking calls `trackImpression('banner', 'appopen')`, which is semantically wrong
- click/dismiss/completion details are underused relative to the backend schema
- estimated revenue is synthetic formula-based, not trustworthy enough for real optimization

### Root issue
The ads stack looks halfway between:
- MVP instrumentation
- real production ad observability

That's why it likely feels hard to trust or tune.

---

### 4) Premium purchase flow is likely brittle
The paywall currently gates purchase by whether RevenueCat product objects include `rcPackage`. That's good in principle.

But the overall purchase state handling is still fragile:

- mobile/web billing logic is split
- profile `isPremium` is updated client-side after purchase/restore
- webhook also updates premium state server-side
- there is a billing guard, but state authority is spread across:
  - RevenueCat
  - Supabase subscriptions
  - profiles.is_premium
  - app session/profile refresh

### Root issue
There is **more than one source of truth** for premium state.

That leads to classic jank:
- purchase succeeded but UI doesn't reflect it immediately
- restore works but paywall still appears briefly
- premium toggles feel delayed or inconsistent
- app can temporarily look broken even when backend is correct

---

## B. User-level UX / performance issues causing "jank"

### 5) Bundle sizes are heavy
Build output shows large chunks, including one around **593 kB minified** plus several other large chunks.

Notable heavy areas:
- main index chunk
- large vendor chunk
- large tarot data bundle
- large quizzes/readings bundles
- huge icons/vendor chunks

### Why this matters
On mobile, especially mid-range Android devices:
- longer JS parse/execute time
- slower route transitions
- delayed interaction readiness
- animation/frame drops
- "feels janky" even if technically functional

### Root issue
The app is partially code-split, but **not aggressively enough for mobile**.

---

### 6) Too much initialization work on app load
`App.tsx` + auth flows do a lot early:
- status bar setup
- billing init
- ads init
- splash hide
- auth session work
- onboarding checks
- achievement init
- profile refresh logic
- app open ad logic
- background image handling

### Why it feels janky
Cold-start UX likely suffers from:
- too many async systems starting together
- auth/profile and monetization work competing at app boot
- potential layout shifts once profile/background loads
- ad preload and billing init on startup

### Root issue
Too much "important but non-critical" work is on the critical path.

---

### 7) Home screen does multiple network/data tasks at once
`HomePage.tsx` is doing a lot:
- cached ritual read
- Supabase ritual fetch
- saves fetch
- ritual count fetch
- horoscope import
- tarot card load + draw
- image preloading
- level threshold load
- XP progress work

### Why this matters
Even if each task is small, together they create:
- UI state churn
- multiple rerenders
- possible loading flicker
- delayed responsiveness

### Root issue
The home screen is trying to be both:
- the emotional landing page
- a data orchestration hub

That's usually where "janky" starts.

---

### 8) Background image rendering can add visual sluggishness
When a user has a custom background, the app renders:
- full-screen cover image
- dark gradient overlay
- blur layer

This can look nice, but on Android WebView/Capacitor it may cost:
- extra compositing
- scrolling softness
- transition lag
- poorer battery/frame pacing

### Root issue
Visual polish effects are being used without enough performance budgeting.

---

## C. Admin/API/backend findings

### 9) Admin authorization is better than before, but still smells layered
Good:
- there's a server-side RPC `check_is_admin`
- comments indicate migration toward unified admin authorization

But:
- client still has hardcoded admin email heuristic for optimistic rendering
- some DB policies historically also used email logic
- admin identity model feels evolved rather than cleanly designed from day 1

### Risk
Mostly not catastrophic, but it's a maintainability/security smell:
- authz logic should be singular and authoritative
- client-side optimistic admin rendering should be visually harmless only

---

### 10) Ad config backend exists but app isn't truly consuming it
This is worth repeating because it's the clearest system design problem.

Backend has:
- `ad_units`
- production/test switching model
- RPC config resolution
- daily per-user ad stats

But client still depends on:
- `VITE_ADMOB_*` env variables directly

### Root issue
The backend ad control plane exists, but the app is bypassing it.

### Consequences
- turning ad units on/off centrally is limited
- test/prod rollout becomes messy
- ad experiments are harder
- analytics and delivery don't share one source of truth

---

### 11) Rewarded ad daily limit is device-local, not server-authoritative
In `rewardedAds.ts`, daily count is tracked in local storage.

That means a user could potentially:
- reinstall
- clear app storage
- change device
- get desynced from intended server limits

There is server-side unlock tracking, but the **gate itself is not enforced centrally**.

### Root issue
The app uses client state for a monetization control.

That's weak for production.

---

### 12) Analytics naming / product identity drift exists
There are visible naming leftovers:
- `Arcana`
- `Tarot Life`
- `stellara_*` cache keys
- `com.arcana.app`
- `arcana_*` auth/ad storage keys

### Why this matters
This kind of drift causes:
- confusing telemetry
- harder debugging
- migration mistakes
- wrong assumptions during future development

It's also a sign the app has been iterated quickly without enough consolidation.

---

## D. Security / dependency findings

### 13) Dependency vulnerabilities need cleanup
`npm audit` found high-severity issues in transitive dependencies including:
- `@capacitor/cli`
- `rollup`
- `undici`
- `tar`
- `minimatch`
- `picomatch`
- `flatted`

### Context
Some are build/dev chain, not necessarily direct app-runtime exposure on device.
But for a production pipeline, this still matters.

### Root issue
Dependency maintenance is lagging behind active development.

---

# Google Ads section audit specifically

## What's good
- ads are conditionally disabled for premium/ad-free users
- interstitial cooldown exists
- rewarded ads support one-time unlocks
- there is an admin analytics surface
- there is backend groundwork for proper ad configuration and tracking

## What's weak
- app open ad tracking is semantically sloppy
- impression tracking is incomplete / not authoritative
- local caps are easy to desync
- backend ad-config system is underused
- admin "revenue analytics" are synthetic and may create false confidence
- banner logic can retry and hide/remove repeatedly, which may contribute to awkward layout/ad behavior

## Most likely real-world symptoms
- ads sometimes appear inconsistently
- rewarded availability may feel flaky
- analytics may not match actual ad behavior
- premium/ad-free users may still briefly see ad-related state churn
- tuning ads for better UX/revenue is harder than it should be

---

# Admin-level audit

## Strengths
- admin page is functional and broad
- content/image management is real
- ad analytics panel exists
- blog manager exists
- storage integration is real

## Weaknesses
- admin panel appears overloaded into one page
- ad analytics shown are not reliable enough for serious business decisions
- some storage listing logic is chatty/serial and may become slow
- admin functionality depends heavily on direct client Supabase calls, so UX will degrade with dataset growth

### Root issue
Admin is workable, but still feels like a **power-user tool**, not a hardened production ops console.

---

# User-level audit

## Strengths
- product concept is coherent
- onboarding/auth/premium/ritual loop are all present
- offline/cache thought exists
- personalization/profile/astrology/tarot layers are real

## Weaknesses
- startup and main screen feel heavy
- premium state transitions can feel laggy
- ad behavior not fully predictable
- visual effects can drag performance on lower-end devices

---

# Additional findings

## 14. Paywall / premium UI has a logic mismatch
In `PaywallSheet`, after purchase success it does:
- `await updateProfile({ isPremium: true })`
- then `await refreshProfile()`

But in `AuthContext`, `isPremium` is explicitly excluded from client-writable fields.

### Root issue
The UI is trying to set a **server-managed field** through a client update path that intentionally ignores it.

### Why this matters
That can create confusing behavior like:
- purchase succeeds but premium badge lags
- restore appears flaky
- UI depends on webhook/profile refresh timing instead of deterministic state transition

### Best fix
After purchase:
- trust RevenueCat / backend entitlement sync
- fetch authoritative subscription/profile state
- do not attempt to locally "set premium" through profile editing paths

---

## 15. Rewarded unlock logic is functionally okay, but product-quality weak
Rewarded unlocks are inserted into `rewarded_ad_unlocks` and consumed later. That's a real backend flow.

But:
- `grantTemporaryAccess()` increments daily count in local storage, not DB-authoritatively
- unlock availability is checked from DB for unused rows
- daily cap is checked locally
- there's no strong server-side anti-abuse enforcement in the app path itself

### Root issue
The rewarded system is **split-brain**:
- entitlement use = server-backed
- entitlement quota = device-backed

That's the wrong split for production monetization.

---

## 16. Admin analytics are probably giving you false confidence
The admin page shows:
- total impressions
- clicks
- estimated revenue
- CTR
- trigger counts

But the underlying analytics are not good enough to support real optimization decisions.

### Why
The schema uses a synthetic revenue formula:
- impression count × fixed amount
- click count × fixed amount

That is not real ad revenue.

### Root issue
The dashboard is presenting **pseudo-business metrics as if they are business metrics**.

### Risk
You may think:
- ads are performing well
- a placement change helped
- Android/iOS monetization is improving

…when really the numbers are only rough internal proxies.

---

## 17. Some backend ad work exists but seems partially abandoned
There's a surprising amount of backend ad infrastructure:
- `ad-config`
- `ad-events`
- `ad_units`
- `get_ad_config`
- `record_ad_impression`
- `get_user_daily_ad_stats`

But the app code mostly doesn't lean on it.

### Root issue
This looks like a **half-migrated system**:
- someone started building the correct architecture
- but the client still runs mostly on direct env IDs and direct table inserts

This usually happens when feature pressure outruns cleanup.

### Recommendation
Either:
- fully adopt the backend ad platform, or
- delete the unused indirection and simplify

Right now you're paying complexity cost without getting full benefit.

---

## 18. There are signs of product renaming / codebase drift
I saw references to:
- Arcana
- Tarot Life
- Stellara-style storage keys
- `com.arcana.app`
- `arcana_*` storage/auth keys

### Root issue
This usually means repeated rebranding or codebase reuse without a consolidation pass.

### Why it matters
It creates hidden problems:
- analytics confusion
- harder debugging
- migration/key mismatch bugs
- onboarding/auth/reset/deep-link issues after future product changes

This isn't the main jank cause, but it's maintenance debt.

---

# Detailed performance diagnosis

## 19. Main bundle composition suggests parse/execute pressure on Android
Build output includes several large chunks:
- `vendor-mMK17bdx.js` ~593 kB minified
- `vendor-icons` ~459 kB
- `tarotDeck` ~284 kB
- `index` ~234 kB
- `QuizzesPage` ~202 kB
- `vendor-react` ~167 kB
- `vendor-supabase` ~164 kB
- `ReadingsPage` ~142 kB

### What that means in practice
On Play Store target devices:
- cold start feels heavy
- tab/page transitions may feel delayed
- animation smoothness suffers
- first interaction may feel sticky
- WebView can hitch during parsing or hydration-like transitions

### Root issue
Too much logic/data is still shipped too early or in too-large chunks.

---

## 20. Large static content payloads are likely hurting responsiveness
The app ships large content sets for:
- tarot deck
- horoscopes
- quizzes/personality content
- zodiac/astrology data
- image mapping

### Root issue
A lot of "content" is embedded as code/data inside the app runtime rather than being strategically segmented.

### Impact
Even if network is not the bottleneck:
- JS bundle size rises
- memory pressure rises
- parsing time rises
- transitions worsen

---

## 21. Framer Motion usage is probably not the main cause, but it contributes
`AnimatePresence` + route fades are fine by themselves.

But when layered with:
- heavy page bundles
- background images
- blur overlays
- dynamic data loading
- big icon bundles

…you get the feeling of softness/lag.

### Root issue
Not "bad animation," but **animation on top of a too-heavy render path**.

---

## 22. Home page state updates likely cause unnecessary rerenders
`HomePage` maintains many independent pieces of state and fires several async operations.

This pattern often causes:
- partial content popping in
- saved status lag
- ritual progress feeling inconsistent
- visual instability during first seconds

### Root issue
The page is doing orchestration in a component instead of a cleaner aggregated loader/state model.

---

# Auth / onboarding / account findings

## 23. Auth system is thoughtful, but too complex for full confidence
The OAuth flow is actually more sophisticated than average:
- correlation IDs
- diagnostics
- callback analysis
- fallback handling
- native + browser support
- timeout/cancel UI

That's a good sign.

But it also means the auth layer has become complex enough that **small regressions are likely**.

The typecheck errors inside `AuthContext` reinforce that.

### Root issue
Auth complexity has outgrown its current code hygiene.

### Likely user-facing symptoms
- occasional weird sign-in edge cases
- delayed post-login state updates
- callback duplication/race quirks
- inconsistent native/browser OAuth behavior under edge conditions

---

## 24. Sign-out path is defensive, which is good
The sign-out flow clears Supabase first, then UI state, then native Google auth, then RevenueCat logout.

That ordering is smart.

### But
It's another sign that the system has enough moving parts that auth state can go weird unless carefully sequenced.

---

# Admin-level file/storage observations

## 25. Admin page storage listing is likely to get slower as content grows
Admin page loads:
- tarot cards
- card backs
- backgrounds
- custom icons
- ad analytics
- blog posts

And some storage listing is folder-by-folder serial.

### Root issue
The admin panel is fine for a small-medium asset library, but it won't scale elegantly.

### Symptoms
- slow refresh
- inconsistent feel in asset management
- longer waiting when more content is uploaded

---

## 26. Admin page is too monolithic
One page is doing:
- content upload
- icon config
- backgrounds
- ad analytics
- blog management

### Root issue
Everything-admin-in-one-screen architecture.

### Why it matters
This contributes to:
- slower loads
- harder maintainability
- more rerender cost
- more chance one broken section degrades the whole admin experience

---

# Database / schema observations

## 27. Migration history shows repeated security patching
I saw multiple migrations with names like:
- fix security/performance issues
- fix remaining security issues
- fix final security issues
- unify admin authorization
- protect profile server fields
- fix admin authorization security

### Interpretation
This is actually better than ignoring issues — but it also shows the project has been patched repeatedly after discovering design weaknesses.

### Root issue
The app has evolved fast, and security/business rules were stabilized incrementally.

That's okay for startup velocity, but it means you should assume there are still "unknown unknowns."

---

## 28. Analytics are being stored in `content_interactions`
The analytics service appears to insert generic analytics events into `content_interactions`.

### Root issue
That's a convenience design, but it can become muddy:
- product analytics mixed with content interaction analytics
- harder querying
- harder dashboarding
- noisy semantics

This is not urgent, but it's another signal of a system growing sideways.

---

# What I think is happening in production right now

If I model the real user experience, I'd expect some combination of:

- cold start sometimes feels heavier than it should
- some screens feel smooth, some feel sticky
- premium/paywall state may occasionally feel delayed or inconsistent
- ad behavior may work "most of the time" but not feel tightly controlled
- admin analytics probably look useful but are not fully decision-grade
- app works, but the whole thing doesn't yet feel "crisp"

That matches your description of **"a bit janky."**

---

# Severity-ranked issue list

## Critical / near-critical
1. **Ads architecture split between env config and backend config**
2. **Premium state handled through too many overlapping sources**
3. **Typecheck failing in production code**
4. **Rewarded cap enforced locally instead of authoritatively**

## High
5. **Oversized bundles causing mobile performance drag**
6. **Too much startup initialization work**
7. **Analytics/revenue dashboard not trustworthy enough for optimization**
8. **Ad event semantics inconsistent**
9. **Main home screen orchestrates too many async responsibilities**

## Medium
10. **Naming drift / old product identity leftovers**
11. **Admin page too monolithic**
12. **Storage listing/admin ops may slow with scale**
13. **Dependency vulnerability backlog**
14. **Auth layer complexity higher than current hygiene supports**

## Low but worth cleaning
15. **Unused code / state / impossible comparisons**
16. **Some instrumentation not aligned with real business meaning**
17. **General codebase consolidation needed**

---

# My strongest recommendations, in exact order

## Phase 1: Stability
1. Fix all typecheck errors
2. Make CI fail on typecheck
3. stop using client profile update paths for premium flags
4. unify premium entitlement refresh after purchase/restore

## Phase 2: Ads
5. migrate app to use backend `ad-config` / `ad-events`
6. make rewarded limits server-authoritative
7. fix ad event semantics:
- app open tracked as app open
- impression only after true display event
- completion/click/dismiss tracked consistently

## Phase 3: Performance
8. reduce startup work
9. split giant bundles more aggressively
10. move large data/content out of critical path
11. profile Android rendering with background/blur effects turned on

## Phase 4: Product quality
12. clean naming drift
13. separate real monetization analytics from proxy analytics
14. break admin panel into sections/routes
15. refresh vulnerable dependencies

---

# Honest final assessment

## Is the backend real?
Yes.

## Is the app real and production-grade enough to be on Play Store?
Yes, in the sense that it's clearly a real production app.

## Is it high-quality enough yet for a "VERY polished" feeling?
Not yet.

## Is the "jank" likely caused by one bug?
No.

## Real root cause?
A combination of:
- **too much client-side work**
- **too many overlapping subsystems**
- **ads/premium not fully unified**
- **insufficient cleanup after rapid iteration**
