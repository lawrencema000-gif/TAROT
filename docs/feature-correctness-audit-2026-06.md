# Arcana — Feature-by-Feature Functional Correctness Audit

Date: 2026-06-12. Method: 8 parallel Fable 5 specialist agents (tarot,
western astrology, astrocartography, personality quizzes, eastern
systems, AI/content, economy/gamification, backend integrity) + lead
synthesis + independent spot-verification of the three most consequential
claims (all three CONFIRMED with numeric proof).

This audit checked whether each feature's **logic is actually correct** —
unlike the prior UX/design/perf audits. The answer: there is serious
correctness debt under the polish.

---

## Verdict

**The computational claims the app makes are frequently false.** The UI,
gating, persistence, and content pipelines are well-built — but the math
underneath is wrong in multiple independent, user-visible ways. Western
astrology is the worst (grade **D**): essentially every natal chart,
horoscope, synastry score, and the **paid** year-ahead report is wrong
today. The encouraging pattern: nearly every CRITICAL is a small fix in a
pure function (often the correct code already exists in the same file).
A focused sprint on the fix-list below + a golden-test suite moves the
product from "confidently wrong" to defensible.

## Cluster grades

| Cluster | Grade | CRIT | HIGH | MED | Incomplete |
|---|---|---|---|---|---|
| Tarot engine | B- | 0 | 2 | 4 | 3 |
| Western astrology | **D** | **5** | 3 | 4 | 3 |
| Astrocartography | C- | 2 | 1 | 4 | 5 |
| Personality quizzes | C | 1 | 4 | 4 | 5 |
| Eastern systems | C+ | 2 | 4 | 3 | 4 |
| AI / content | B- | 0 | 2 | 8 | 6 |
| Economy / gamification | C+ | 0 | 4 | 3 | 3 |
| Backend integrity | B- | 1 | 2 | 3 | 3 |

**11 CRITICAL · 22 HIGH bugs total.**

---

## CRITICAL bugs (ranked fix order)

### Independently verified by hand (numeric proof)

1. **All planet positions are HELIOCENTRIC, not geocentric.**
   `Astronomy.EclipticLongitude(body, date)` returns the planet as seen
   *from the Sun*. Verified live: Mercury today = app 203.3° (Libra) vs
   true geocentric 106.2° (Cancer); the app's value puts Mercury 121°
   from the Sun — physically impossible (max 28°). Poisons natal, daily,
   weekly, monthly, synastry, progressions, solar-return,
   transit-calendar, and the PAID year-ahead report.
   `supabase/functions/astrology-compute-natal/index.ts:173` + ~10
   sibling functions.
   **Fix:** `Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon`;
   then bump chart_version, recompute stored charts, flush horoscope cache.

2. **stripe-webhook 500s on every REAL (signed) webhook.**
   `_shared/handler.ts` unconditionally consumes the request body
   (`await req.text()`, no content-type check) before `run()`;
   stripe-webhook then calls `ctx.req.clone().text()` — `clone()` throws
   `TypeError: Body is unusable` once `bodyUsed===true`. Unsigned probes
   400 early at the signature-header check (why live probes looked
   healthy), but signed Stripe events reach the clone and 500; Stripe
   retries also 500. **Web premium purchases do not activate via
   webhook** — only the daily reconcile cron papers over it (up to 24h
   late). Verified by reading both files: the webhook's comment claiming
   the handler skips parsing is simply wrong.
   **Fix:** add `rawBody: true` opt-out on HandlerOptions (skip body
   parse) or expose `ctx.rawBody` and verify the HMAC against it.

3. **Moon phase inverted by half a cycle.** `moonPhases.ts:10` takes the
   canonical NEW-moon epoch (2000-01-06 18:14 UTC) and subtracts 14.77
   days, mislabeling it a "reference full moon". Home screen shows Full
   at New Moon — falsifiable by looking at the sky; the
   `full_moon_reading` achievement fires at new moons.
   **Fix:** use the epoch directly; fix `isFullMoon` to measure from age
   14.77d.

### Verified by the agents (file:line evidence quoted)

4. **Ascendant formula returns the Descendant (180° off)** — every rising
   sign and all 12 houses are opposite. Brute-force-verified across 10
   (RAMC, latitude) combos. `astrology-compute-natal` computeAscendant.
5. **Retrograde detection never fires** (heliocentric motion is always
   prograde) — no user ever sees Mercury retrograde. Fixed by #1.
6. **Transit/synastry/progressed/solar-return MOON is heliocentric** —
   stuck opposite the Sun, moves ~1°/day instead of 13°. Fix:
   `Astronomy.EclipticGeoMoon(date).lon` in the four functions.
7. **Astrocartography birth time treated as UTC** — no timezone pipeline
   exists anywhere (the helper that promises it is dead code). Every
   line/score/power-place/AI reading off by birth-tz × 15°/hr (135° for
   Japan). `CelestialMapPage.tsx:165`.
8. **MC/IC lines invisible to ALL proximity features** — meridians are
   2-point LineStrings ([lon,-85],[lon,85]); every consumer does
   point-to-VERTEX distance, so a city ON the Sun-MC line reports
   4,114 km (gate 700). Half the astrocartography product — the
   career lines — never scores. Fix: densify meridians to 1°-lat
   vertices (one function, fixes 4 consumers).
9. **Attachment quiz scored as Mood Check, then results screen crashes.**
   The earlier type-rename fix ('big-five'→'attachment') left the id
   check nested inside the now-unreachable big-five branch; type
   'attachment' falls to the calculateMoodCheck fallback, persists
   "Depleted", then `attachmentDescriptions[undefined].name` throws.
   Hits 100% of completions. `QuizzesPage.tsx:488-503`.
10. **Feng Shui Kua formula off-by-one for ALL pre-2000 births** (male
    `11−digitSum` should be `10−`, female `4+` should be `5+`) — the
    East/West group flips, every favourable direction becomes
    unfavourable. `fengShuiKua.ts:169-175`.
11. **Annual Flying Stars Lo Shu square is 180°-flipped** — every star
    lands in the opposite palace (verified vs published charts:
    Five Yellow 2024 → code E, published W). `fengShuiAnnual.ts:44-48`.

---

## HIGH bugs (22 — abbreviated; full detail in the workflow output)

**Money / revenue leaks (economy cluster):**
- Free-user Moonstone balance can go NEGATIVE (spend RPC is
  read-then-write, no DB guard).
- Self-refund exploit — free users can mint unlimited free AI readings.
- Rewarded-ad credit mintable directly (no server-side ad verification).
- Paid Moonstone credit permanently lost on transient ledger failure
  (webhook ordering).
- generate-reading cache hit returns the wrong envelope → client shows
  empty AI interpretation, Moonstones debited, no refund; cached readings
  skip history/limits.

**Wrong results for large segments:**
- drawSeededCards uses the biased `sort()` shuffle its own docs warn
  against — 5.5× spread between most/least-likely daily cards (The Fool
  2.86× expected), and engine-dependent across browsers.
- getZodiacSign mis-assigns cusp-day sun signs in all UTC-negative
  timezones (the Americas) — feeds 20+ call sites.
- Cancer & Capricorn (and Taurus & Libra) receive byte-IDENTICAL daily
  horoscopes — charCode-sum seed collision.
- Big Five / attachment / MBTI-Quick all share a "neutral=60 vs
  threshold=50" miscalibration — disagree-leaning users get HIGH-trait
  results; all-neutral → ESTJ / fearful-avoidant.
- PHQ-2-style Mood Screener can understate risk (max-mean typing with
  ties resolving less-severe) — safety-relevant.
- Solar return & progressions append `Z` to local birth time (timezone
  column selected then ignored).
- Daily card keyed to UTC date, not local midnight — card flips at
  4-7 PM for US users.
- Human Design gate wheel offset 0.25° → wrong profile line ~27% of the
  time; type derivation ignores indirect motor-to-Throat connections.
- BaZi Kong Wang computed from a bogus sexagenary index.
- KUA_DIRECTIONS inauspicious directions wrong for 6 of 8 Kua numbers.
- Journal Insights computed from only the first 20 entries; past-day
  entries saved dated today.
- ai_usage_ledger writes failing since 2026-06-01 (no June partition, no
  maintenance cron); cost ledger blind to the primary provider (gpt-5).
- Localized card names written into achievements + saved readings —
  card achievements never unlock for ja/ko/zh users.
- Astrocartography silently defaults missing birth time to noon while
  charging 250 Moonstones for Find-Your-Place on a near-random chart.

---

## Incomplete features (shipped but don't fully work — top 12 by visibility)

1. "Personalized" horoscope prose is canned element+RNG templates — incl.
   a literally fake "planetary transit" line chosen at random.
2. Custom Spread Builder — full CRUD, but no reading flow can ever load a
   custom spread.
3. Free-tier "Growth" celestial filter renders an EMPTY map ({Jupiter,
   Uranus, Pluto} ∩ {Sun, Moon} = ∅); promised paywall hint never built.
4. Love Language "Compare" — permanently disabled lock button, no flow.
5. Love Tree result never persisted (the app's best attachment scorer!).
6. Share links: decode shipped (`/reading/:token` works), encode orphaned
   — the viral loop cannot fire.
7. MC never computed → paid year-ahead declares MC targets that silently
   never appear.
8. Progressed ASC/MC documented, never returned.
9. I-Ching changing-line guidance declared, populated for ZERO hexagrams.
10. Personalization service is entirely dead code (nothing imports it).
11. Companion tier message limits enforced client-side only.
12. Line-tap on the celestial map: hit-testing fully wired, page handler
    is `void planet; void angle;`.

Also notable: zero test coverage on ANY of the pure math (shuffle,
ascendant trig, moon epoch, meridian geometry, every quiz scorer) — the
cheapest code to test and the source of every CRITICAL.

---

## Cross-cutting themes

1. **Static content masquerading as computed personalization.**
2. **Local time treated as UTC — five independent implementations.** No
   canonical "birth instant" or "user's today" exists.
3. **Neutral≠threshold miscalibration** across quiz scorers (neutral=60,
   bands assume 50).
4. **Doc comments describing behavior the code doesn't implement** — and
   they actively mislead fixes (the attachment crash was caused by
   trusting one).
5. **Parallel stale sources of truth** (EN vs localized names, dead
   correct-shuffle vs live biased one, spreadTypes vs spreadConfigs).
6. **Money/limits enforced client-side only** — exactly the things users
   have incentive to game.
7. **Silent fallbacks converting errors into wrong answers** (else →
   MoodCheck; noon default; nearest-city for ocean taps).
8. **Pure functions, zero tests.**

---

## Recommended fix order

**Sprint A — the money + math core (1-2 days):**
1. Shared `geoLongitude()` helper in `_shared` → fixes CRITICALs #1,
   #4-6 in one file. + chart_version bump, recompute, cache flush.
2. stripe-webhook rawBody fix (#2) — web payments activate again.
3. Ascendant negation (#4), moon epoch (#3), Lo Shu + Kua formulas
   (#10-11), attachment dispatcher branch (#9).
4. MC/IC meridian densify (#8). Quiz normalization helper (HIGHs 11-14).
5. Economy server-side guards: balance CHECK constraint, spend
   atomicity, refund verification, ledger partition + cron.

**Sprint B — birth-instant pipeline + honesty:**
6. Geocode birthplace → IANA tz → persisted birthUtc (kills theme #2).
7. Local-midnight date keys for daily card/pick/counters.
8. Honest copy for missing birth time + gate the paid reveal.

**Sprint C — finish the 90%-built:**
9. Wire share encode, persist Love Tree + aiInterpretation, fix
   last-result chips, custom spreads in the reading flow, free-tier
   filter paywall hint.

**Sprint T (parallel) — golden-fixture CI suite:** ephemeris charts vs
AstroSeek, quiz scorer answer-vectors, point-on-MC-line ≈ 0 km, card-name
cross-reference. Would have caught every CRITICAL pre-launch.
