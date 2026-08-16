# Arcana — Whole-System UX / Product / Competitive Audit

Date: 2026-06-08. Method: 9-agent parallel analysis (UX flows, competitive
benchmark, accessibility, visual design, onboarding, mobile, content/i18n,
backend/perf, + lead-reviewer synthesis) **plus** a live real-user
walkthrough of tarotlife.app at 390×844 (mobile) with real
performance-telemetry capture.

---

## Verdict

**Not yet "clearly best-in-class" — but uniquely positioned to get there
faster than anyone.** Arcana is the broadest app in the category and
genuinely *leads* on three axes no competitor matches:

- **Widest feature surface** — the only credible "mystic OS" (tarot +
  horoscopes + natal charts + astrocartography + 20 personality quizzes +
  journaling + AI companions + I-Ching + runes + numerology).
- **Astrocartography (Celestial Map + Find-Your-Place AI)** — a genuine
  moat Co-Star / Chani / The Pattern simply don't ship.
- **20+ personality quizzes** — a viral wedge AND the raw material for a
  compatibility/AI-context advantage rivals structurally cannot replicate.

But it loses the *specific duel* each leader picks: trails **Co-Star** on
social virality + signature daily voice, **Chani** on trust/provenance +
contrast polish, **Labyrinthos** on structured learning — and carries
real execution-rigor debt plus three unaudited risk dimensions that could
each trigger a 1-star review or store-policy event.

The **three things** standing between Arcana and "clearly best-in-class":
1. **Trust made visible** — accuracy provenance, honest billing, privacy
   controls, safe-content handling.
2. **Depth on the breadth** — a social/compatibility layer + a chart-aware
   AI-with-memory that converts "wide" into a context-fusion moat.
3. **Ruthless craft enforcement** — shared primitives, fixed contrast,
   teaser-before-paywall, a 4-tab IA so 10 mystic systems feel like one
   coherent, readable product.

---

## Scorecard

| Dimension | Grade | Headline |
|---|---|---|
| UX flows & friction | B | Core loop best-in-class; 14-tab Readings overwhelms; broken share deep-links |
| Competitive position | B | Wins on breadth; loses on social + trust + learning |
| Accessibility | C+ | `text-mystic-400` (used 589×) fails contrast; unnamed close buttons; small targets |
| Visual design | B- | A-tier vision; phantom `cosmic-violet` token in 27 files renders nothing |
| Onboarding | B- | Email signup can dead-end at "check your email"; native = no try-before-signup |
| Mobile/responsive | B- | Map traps page scroll in flat mode; no `@capacitor/keyboard`; safe-area gaps |
| Content/copy/i18n | B- | **Entire Celestial Map is EN-only** — ja/ko/zh see English |
| Backend/perf | B- | Critical-path bundle leaks → **4.8s cold LCP** |

---

## Live real-user findings (measured on tarotlife.app, not in code)

- 🔴 **Cold-load LCP = 4,820 ms (POOR)** · FCP 2,188 ms · TTFB 918 ms.
  Warm SPA navigation is fine (712 ms FCP) — the problem is specifically
  the cold first paint of the home/landing route. Root cause confirmed by
  the backend agent: 283KB tarot deck + full lucide-react (~1500 icons,
  not tree-shaken) + data-horoscopes chunk bundling the entire EN i18n
  catalog, all on the critical path (~1.0–1.1 MB first-paint JS gzipped).
- 🔴 **CSP blocks Google Ads conversion tracking.** `script-src` allows
  `googleadservices.com` + `googletagmanager.com` but NOT
  `googleads.g.doubleclick.net` — every conversion beacon + web-vital
  report is blocked. Paid-acquisition ROAS is currently unmeasurable.
  Also `worker-src` is unset, so a Sentry worker is CSP-blocked. Both are
  one-line `netlify.toml` / CSP header fixes.
- 🟠 **Paywall fires full-screen on cold app-open**, covering the home
  ("Your ritual is ready" greyed out behind it) before the user sees any
  value. (TrialReminderModal.) Earn the paywall after delivering value.
- 🟡 Duplicate "Readings" title (app Header + page h1 both say "Readings").

---

## The 5 cross-cutting themes (one fix pays off across many dimensions)

1. **Dead-ends instead of teasers.** Every lock/paywall/empty surface
   should preview value, not strand the user. A reusable `LockedPreview`
   fixes conversion + first-run clarity + perceived polish at once.
2. **Inconsistent system primitives.** Excellent exemplars
   (HomePageSkeleton, Sheet.tsx, Button focus ring) were never promoted to
   enforced shared components → inconsistent skeletons, focus rings,
   dialogs, tokens, motion. Extract `IconButton` (required label), `Modal`,
   `EmptyState`, `LockedPreview`, one token source, one motion file.
3. **i18n leaks at the highest-anxiety moments** — auth, loading, and the
   entire Celestial Map are English-only even in JP/KR/ZH.
4. **IA overload** — 40+ routes, a 14-tab Readings strip, Journal/Profile
   buried in "More". Amplifies every downstream confusion.
5. **Trust under-signaled** — the category is won on visible
   accuracy/provenance/honest-billing/privacy; Arcana competes on breadth.

---

## Full prioritized backlog (27 items)

Ranked by severity × leverage × competitive necessity.
**Beat?** = moves Arcana *past* the top competitor (vs merely matching).

| # | Item | Solves | Sev | Effort | Beat? |
|---|---|---|---|---|---|
| 1 | Audit & harden crisis/safety + duty-of-care disclaimers | Harmful/fatalistic readings; legal/store exposure | P0 | M | Table-stakes |
| 2 | Fix broken share deep-links → route to actual card/reading | Recipients land on empty tab; kills only viral loop | P0 | M | Beat |
| 3 | Ship social/friend-chart + quiz-fused compatibility layer | No word-of-mouth engine; loses to Co-Star's moat | P0 | L | **Beat** |
| 4 | Make AI companion chart-aware with persistent memory | Generic chatbot = behind the whole-market trend | P0 | L | **Beat** |
| 5 | Visible accuracy provenance (Swiss Ephemeris) + "why this reading" | "AI-slop" perception; Chani's no-AI attack lands | P0 | L | **Beat** |
| 6 | Fix `text-mystic-400` / placeholder / destructive contrast | 589 unreadable text uses; fails axe/Lighthouse | P0 | L | Table-stakes |
| 7 | Reusable `LockedPreview` — teaser-before-paywall everywhere | Premium taps dead-end to a bounce | P1 | M | Beat |
| 8 | Collapse 14-tab Readings → ~4 + "More systems"; promote Journal in nav | Newcomers can't form a mental model | P1 | M | Beat |
| 9 | Anti-dark-pattern billing + market it ("cancel in 2 taps, no tricks") | Category-wide billing distrust | P1 | M | **Beat** |
| 10 | Quiz progress persistence + per-question back + discard-guard | 50-q test lost to a misfire tap/backgrounding | P1 | M | Beat |
| 11 | Notification system: priming, signature daily voice, freq cap, deep-links | Weak daily hook vs Co-Star push | P1 | M | **Beat** |
| 12 | Extract shared primitives (IconButton/Modal/EmptyState/tokens/motion) | Inconsistent focus rings, undialoged overlays, phantom token | P1 | L | Table-stakes |
| 13 | Standardize loading on branded skeletons + i18n auth/loading/section copy | English "Loading…" flashes in JP/KR/ZH | P1 | S | Table-stakes |
| 14 | Privacy program: data export/delete, journal-storage promise, AI-retention | Most-sensitive data with no user control | P1 | M | Beat |
| 15 | Moonstones clarity: legible value, earn/spend ledger, no loot-box optics | Currency confusion → "scam" reviews | P1 | M | Beat |
| 16 | First-run "recommended next" on Readings/Quizzes + More coachmark | Fresh users self-navigate 40+ routes blind | P1 | M | Beat |
| 17 | Error-recovery + offline pass (mid-reading loss; paid-but-locked limbo) | App breaks on the subway | P1 | M | Table-stakes |
| 18 | Structured "Academy" learning track across all systems, gamified | No growth path → churn to Labyrinthos | P1 | L | **Beat** |
| 19 | Touch-target 44×44 floor + shared focus ring + label 5 close buttons + dialog-ify celebrations | Small targets; unannounced modals for SR users | P2 | M | Table-stakes |
| 20 | Skippable/shortened tarot shuffle after first reading | Forced 2s wait every reading | P2 | S | Beat |
| 21 | Replace native confirm()/silent-clipboard share with styled Sheet + artifact | OS dialogs shatter theme; no share artifact on desktop | P2 | M | Table-stakes |
| 22 | Token-discipline sweep (313 raw hex, 105+ arbitrary px) + CI guard | "Hand-assembled" smell; phantom tokens re-ship | P2 | L | Beat |
| 23 | Emoji-as-hero → SVG; curb gold "casino" stackups | text-5xl moon emoji reads "placeholder/AI" | P2 | M | Beat |
| 24 | Perf/battery pass on ambient-animation stack (low-end Android-webview) | Jank/battery drain on stated platform | P2 | M | Table-stakes |
| 25 | Wire journaling into the data flywheel (AI context + sentiment-over-transits) | Journal is a dead notepad | P2 | M | **Beat** |
| 26 | Make Saved highlights tappable w/ preview; wire/remove disabled Compare button | Hollow Save payoff; dead button erodes trust | P3 | M | Table-stakes |
| 27 | Thin human-reader upsell on top of AI (AI pre-briefs the human) | Cedes Sanctuary/Nebula high-ARPU segment | P2 | L | Beat |

---

## ⚠ Unaudited risk dimensions (the synthesis flagged these as un-owned)

Nobody on the 8-panel audit owned these, and each can produce a 1-star
review or a store-policy event. Recommend a dedicated pass on each:

1. **Trust & Safety / crisis handling** — Is crisis detection reliable?
   Are tarot/horoscope outputs ever fatalistic/harmful? Is there a
   duty-of-care "for entertainment / not medical advice" disclaimer?
   (P0 product-and-legal.)
2. **Privacy & data sensitivity** — birth date/time/place + mood +
   journal + personality results = among the most sensitive consumer data
   classes. No audit of GDPR/CCPA export/delete, AI-retention, on-device
   vs server journal storage, or a privacy promise on the paywall.
3. **Notification UX as a system** — permission-priming timing, opt-in
   rate, frequency capping, quiet hours, push deep-link correctness, the
   re-engagement ladder. (#1 retention lever in the category.)
4. **Virtual-currency clarity (Moonstones)** — value legibility,
   earn/spend transparency, grind-wall frustration, loot-box/gambling
   optics + regulatory exposure.
5. **Error recovery & offline** — network loss mid-reading, AI timeout,
   purchase-succeeded-but-unlock-failed reconciliation, offline story.
6. **Retention loop instrumentation** — D1/D7/D30 hooks, streak-recovery
   grace, win-back for lapsed users, the "empty next day after the ritual"
   problem.
7. **Share/virality artifact fidelity** — does the shared card look good
   in an iMessage/Instagram-story preview? OG tags? branded watermark
   driving install? (Determines K-factor.)
8. **Runtime perf / battery of the ambient-animation stack** — particle
   fields, aurora, 60s loops, 280 SVG city nodes on low-end Android-webview.
9. **Content accuracy as a testable property** — is the *current* natal
   chart math actually correct? A wrong chart is a silent, reputation-
   destroying defect no polish offsets.

---

## What's already best-in-class (don't break these)

- **Home daily-ritual loop** — dedicated first-time empty state, 3-dot
  progress, optimistic cached hydration, branded HomePageSkeleton.
- **Web cold-visitor funnel** — no-signup FreeReadingDemo before the auth
  wall; signup correctly deferred until "Get Started".
- **PaywallSheet robustness** — loading/error/not-available states, retry,
  optimistic flip + poll, Restore Purchases.
- **Astrocartography moat** — Celestial Map + Find-Your-Place is genuinely
  differentiated; renders richly; works.
- **Brand foundation** — 11-step mystic ramp, gold layers, Cormorant+Inter
  with full CJK fallback chains, heading-display clamp() serif scale,
  hairline-gold utilities. A-tier vision for the vertical.
- **A11y scaffolding** — Sheet.tsx is a model dialog (role/aria/Escape/
  focus-trap); global `prefers-reduced-motion` + `prefers-contrast:high`
  blocks; real `env(safe-area-inset)` system; `100dvh`.
- **Backend hygiene** — well-designed AI cache (sha256 key, 7-day TTL,
  kill-switch), churn-free realtime (exactly 2 channels), ~45 routes
  code-split, Sentry dynamic-imported post-paint.
- **Payments + LLM** — (separately audited) immediate on mobile,
  fast-and-automatic on web, all keys live, fallback hardened.

---

## Suggested execution order (when ready)

**Sprint 1 — Quick wins (all S/M, low-risk, no product decisions):**
CSP fix (#unblock ads + worker) · LCP bundle fixes (lazy tarot deck,
tree-shake lucide, split i18n) · phantom `cosmic-violet` token · a11y
contrast floor + 5 unnamed buttons (#6, #13, #19) · branded loading
skeletons (#13).

**Sprint 2 — UX dead-ends + IA (#2, #7, #8, #16):** LockedPreview,
share deep-links, 4-tab Readings, first-run guidance.

**Sprint 3 — Trust program (#5, #9, #14) + the 9 unaudited risks** —
especially safety (#1) and content-accuracy verification.

**Strategic (product decisions, multi-day each):** social layer (#3),
chart-aware AI memory (#4), Academy (#18), human-reader upsell (#27).
