# Arcana QA Punch List — 2026-04-24

Consolidated findings from 3 parallel live-test agents + 1 competitive-scrape agent against
preview `https://audit-smoke--arcana-ritual-app.netlify.app`.

**Meta-note on test isolation:** the Playwright MCP browser context is shared across parallel
agents. One cross-contamination finding ("email was mutated on signup") is a test-isolation
artifact and is NOT a real bug. Everything else below reproduces independently.

---

## 🔴 P0 — SHIP BLOCKERS (must fix before any other QA is meaningful)

### 1. Global single-letter hotkeys hijack navigation on every keystroke
- **Impact:** catastrophic. Users cannot type in text inputs, cannot reach most routes, and the
  "redirect through advisors → verify → live-rooms → companion" pattern Agent B saw is this
  hotkey firing during page transitions from a focused body element.
- **Where:** bundled code at `vendor-react-e-hhefBg.js:8:59847 → index-CsoLWz1x.js:33:37442`
- **Repro:** sign in, press `a` with body focused → pushes `/readings`. `h` → `/horoscope`,
  `l` → `/live-rooms`, `m` → More drawer, `s` → `/sandbox`, `p` → profile, etc. Same thing
  fires when you try to type in the Companion chat textarea.
- **Fix:** guard the hotkey handler with `event.target.tagName !== 'INPUT|TEXTAREA|SELECT'` AND
  require a modifier key (e.g. `g`+letter Gmail-style) OR remove the single-letter global
  hotkey system entirely.

### 2. Supabase edge functions return CORS for localhost only
- **Impact:** `ad-config`, `astrology-geocode`, `account-export`, and likely every other edge
  function is blocked on the Netlify preview origin. Breaks geocoding, ad config, data export,
  and probably more.
- **Observed:** `Access-Control-Allow-Origin: http://localhost:5173` returned to every non-dev
  origin. Browser blocks with `net::ERR_FAILED` / `net::ERR_ABORTED`.
- **Fix:** shared CORS helper must either (a) set ACAO to `*` (safe since requests are
  already auth-gated), or (b) reflect the origin from the request headers, or (c) allowlist
  all `*.netlify.app` + production domain.

### 3. `/ai/quick` and `/ai/tarot` routes are broken
- `/ai/quick` → redirects to `/blog/complete-tarot-guide` (wrong target).
- `/ai/tarot` → redirects to `/` AND wipes the Supabase session from localStorage (silent logout).
- **Fix:** check the SPA route table in `src/App.tsx` / router config. These routes are listed in
  the feature test guide but don't map to their components.

### 4. "Forgot password" silently fails
- **Repro:** sign-in modal → "Forgot password?" → enter email → click "Send reset link".
- **Observed:** no `POST /auth/v1/recover` request fires; UI redirects to
  `/tarot-meanings/the-fool` (likely a hotkey or link handler misfire; see #1).
- **Fix:** wire the form submit handler to `supabase.auth.resetPasswordForEmail()`. Investigate
  whether #1 is the actual root cause.

### 5. Home screen widgets are missing
- **Spec** (WEB-FEATURE-TEST-GUIDE.md): Moonstone balance, daily wisdom, tonight's moon phase,
  3-sec reading tile, tarot companion tile — **all flag-gated**.
- **Observed:** only "Your ritual is ready" CTA is visible. `scrollHeight == clientHeight`, so
  it's not a lazy-load issue — the widgets are truly absent from the DOM.
- **Likely cause:** feature flags `moonstones` / `daily-wisdom` / `moon-phases` / `ai-quick-reading`
  / `ai-tarot-companion` are not enabled for regular users (only for the admin). Since the user
  wants to test as a real user, flags need a 100% rollout on the audit-smoke branch.

### 6. Deep-link routes for entire feature clusters silently redirect
- Community (`/community`, Whispering Well, crisis banner, moderation)
- Referral (`/profile` → "Invite friends", compat invite)
- Advisor marketplace (`/advisors/verify`, `/advisors/dashboard`)
- Live rooms (`/live-rooms/:id`)
- Sandbox (`/sandbox`)
- Blog detail (`/blog/<slug>`)
- Tarot meaning detail (`/tarot-meanings/<slug>` — partial — the card renders but clicking
  a card from the index redirects to `/`)
- **Fix:** verify router config includes these routes with correct lazy-loaded components.
  Some (community, advisors, live-rooms) are feature-flagged and may correctly fall through to
  `/` for flag-off users, but the fallback should be a 404 or "coming soon" — not a silent
  redirect.

### 7. Session token disappears spontaneously from localStorage
- **Impact:** users get silently logged out mid-session. Session persistence is broken.
- **Possible causes:** navigation to a broken route (#3) wiping auth, a `signOut()` called from
  an error handler, or StrictMode double-mount race.
- **Fix:** add logging around `supabase.auth.signOut()` calls; check for any `removeItem` on
  the Supabase auth key.

---

## 🟡 P1 — HIGH-PRIORITY BUGS

### 8. CSP `connect-src` blocks Sentry
- **Impact:** error telemetry is dead. None of the bugs above are being captured in Sentry.
- **Console:** `Refused to connect to 'https://o4511252427702272.ingest.us.sentry.io/...'
  because it violates the following Content Security Policy directive: connect-src ...`
- **Fix:** add `https://*.ingest.sentry.io https://*.sentry.io` to CSP connect-src OR configure
  Sentry tunnel.

### 9. CSP `connect-src` blocks Nominatim (OSM geocoding fallback)
- **Impact:** the fallback path for birth-city geocoding is blocked, and since #2 also breaks
  the Supabase geocode path, **birth-place lookup is entirely non-functional**. Onboarding
  still advances without a valid location.
- **Fix:** add `https://nominatim.openstreetmap.org` to CSP + fix #2.

### 10. Landing page "Get Started Free" CTA opens Google Play
- **Cause:** Play Store badge has higher stacking context than the CTA button, so clicks land
  on the badge's `<a>` instead of the sign-up button.
- **Fix:** z-index / positioning audit of landing hero.

### 11. Landing-page stat counters stuck at 0
- "0 Tarot Cards / 0 Spread Types / 0 Personality Tests / 0 Zodiac Signs"
- **Fix:** either the IntersectionObserver trigger for the count-up animation isn't firing, or
  the base numbers are `0` in data.

### 12. Settings dialog opens spontaneously on `/horoscope` and `/readings`
- **Likely cause:** hotkey `s` firing during route transition (see #1).

### 13. Horoscope tab is 100% paywall for free users
- **Spec conflict:** landing markets "Free with daily horoscopes" but `/horoscope` renders only
  "Unlock Premium Access".
- **Fix:** free tier should see their own sign's daily horoscope. Weekly/monthly can stay paywalled.

### 14. AskOracle button missing on tarot-meanings detail pages for signed-in users
- **Spec:** "AskOracle on Tarot card page" was listed in WEB-FEATURE-TEST-GUIDE.md.
- **Observed:** button is absent from the DOM on `/tarot-meanings/the-fool` even when signed in.
- **Likely:** feature flag not enabled, or conditional render mis-keyed.

### 15. Welcome header uses generated internal username instead of email/name
- "Welcome, arcana-qa-auth-1776994003021!" — ugly internal ID shown to users.
- **Fix:** fall back to email local-part or "friend" instead of the random username.

### 16. Onboarding: "I already have an account" button redirects to `/blog/complete-tarot-guide`
- Should open the sign-in modal. Likely #1 (keypress mid-click) or stale href.

### 17. Onboarding "Love" intent pre-activated even when user clicks "Career"
- Visual selection state lags the real state. Users can't tell what's selected.

### 18. Tarot card "newsletter" email field auto-prefilled with the signed-in user's email
- Mild privacy surprise. If the user didn't mean to subscribe, they can easily click a
  pre-filled form accidentally.

---

## 🟠 P2 — MEDIUM

### 19. Delete Account has no confirmation dialog — opens paywall instead
- **Repro:** Settings → Privacy → "Delete Account" → paywall modal opens.
- **Fix:** must be a "Are you absolutely sure? Type DELETE to confirm" step. No paywall.

### 20. RevenueCat offerings not configured
- Paywalls show "Premium Not Available — RevenueCat offerings need to be configured.
  Purchases are disabled until setup is complete." CTA button disabled.
- **Fix:** configure offerings in RevenueCat dashboard; add the Stripe products for web.

### 21. PWA manifest icon 404 for `/icons/icon-144x144.png`
- Console warning on every page.

### 22. Invalid birth location silently accepted
- `Zzzzzxyyy999` advances past the location step. (Related to #9 — geocode is broken.)

### 23. Companion daily limit UI confusing
- Shows "0 / 20 today" — should read "20 messages remaining" or "0 used / 20 today".

### 24. Title tag flaps between two values mid-navigation
- Alternates between "Arcana - Know yourself. One ritual a day." and "Daily Tarot Readings,
  Horoscope & Astrology Journal | Arcana".
- Minor SEO + polish issue.

### 25. Language picker offers only 4 languages (EN/JA/KO/ZH)
- Fine for now — marketing may imply broader support. Not a bug, a scope note.

---

## 🟢 Verified working (not every feature, but the happy paths the agents could reach)

- Signup form + email/password auth + JWT returned with `email_verified: true`
- Full onboarding flow (language → goals → birth info → tone → reminder → complete)
- Home CTA "Start Today's Ritual" (when reachable)
- Settings drawer (Account / Preferences / Privacy / Support sections, card-back designs,
  custom backgrounds)
- Language switcher round-trip EN → JA → ZH → KO → EN with nav + headings translating
- Advisors / Live rooms index pages (graceful empty state, no crash)
- `/blog` and `/tarot-meanings` landing pages (full content, nice formatting)
- Bottom nav rendering on every signed-in page

---

## Fix order (engineer's perspective)

1. **#1 — hotkey hijack** (ONE change — probably 10 lines). Unblocks #3, #4, #7, #12, #16, #17.
2. **#2 — CORS** (edge-function shared helper). Unblocks #9, #13 (partial), and probably
   half of "features look broken".
3. **#6 + #3 — router audit**. Check `App.tsx` route table for all missing paths, add explicit
   routes for sandbox, community, advisors/*, live-rooms/*, blog/*, tarot-meanings/*.
4. **#5 — feature flags**. 100% rollout on audit-smoke branch for moonstones / daily-wisdom /
   moon-phases / ai-quick-reading / ai-tarot-companion / sandbox / community / advisor-* /
   live-rooms / referral / compat-invite / runes / dice / iching / bazi / human-design /
   feng-shui / dream-interpreter / mood-diary / partner-compat. The admin grant migration
   `20260521010000_mark_owner_admin.sql` only sets `allowed_user_ids` — it does not bump
   `rollout_percent` to 100.
5. **#8 + #9 — CSP**. One change in headers / meta.
6. **#19 — Delete Account confirm.** Simple UI change.
7. After first re-QA pass: #11, #13, #14, #15, #18, #20–25.

---

## Competitive scrape — see [CECE-MISSING-FEATURES-2026-04-24.md](CECE-MISSING-FEATURES-2026-04-24.md)

Top gaps (separate from bugs):
- P0: AI Mood Town wrapper, quiz-result discussion threads, intro-price subscription,
  polish dual-MBTI compat invite, entry-tier coin packs
- P1: Destiny Index synastry score, Lucky Map, yearly Jan-1 drop, proactive AI push,
  OCR screenshot emotion extraction
- Moat we keep: tarot depth (cece has none), Apple-platform integrations (widgets, Siri,
  Watch, Live Activities)
