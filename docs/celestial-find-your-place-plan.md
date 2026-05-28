# "Find Your Place" — Phase Plan

Generated 2026-05-28. New flagship feature inside the Celestial Map: a
button that, in one tap, runs the user's full birth chart against every
city in our dataset, scores each by life-area fit, and reveals the
single best place to live + a long-form AI reading explaining why.

This is the "killer demo" feature for the Celestial Map. It turns a
tactile-but-inert map into a personal oracle.

## Success criteria

1. **One-tap reveal** — single button, no extra inputs (we already have
   the user's chart + their current life-area filter).
2. **Specific result** — not "Asia is good for you," but "**Lisbon,
   Portugal** is your strongest match for Career."
3. **Defended result** — the reading explains WHY in terms a non-
   astrologer can follow ("your Jupiter MC passes within 80km of the
   centre of Lisbon — the line of public recognition is loud here").
4. **Cinematic UI** — the map animates to the city; a beacon drops;
   the planet lines responsible glow; a reading sheet rises.
5. **Production-ready** — premium-gated cleanly, error-handled, cached,
   rate-limited, and reversible (user can re-roll if they don't like
   the answer).

## Phases

### Phase 1 — Globe drag fix ✅ DONE THIS TURN

Bug: d3-zoom captured mousedown, blocking d3-drag rotation. Fixed via
d3-zoom filter that rejects pointer-down events while in globe mode.

### Phase 2 — Scoring algorithm (THIS TURN)

New utility: `src/utils/celestialScoring.ts`. For each city, compute:

```
score = Σ over planet-lines passing within 700km of city:
  (lifeAreaWeight[planet][angle] × distanceFactor(km))

where:
  lifeAreaWeight maps (planet, angle, intent) → multiplier (0..1)
  distanceFactor(km) = max(0, 1 - km/700)  (closer = stronger)
```

Tiebreaker: city population (recognisable destinations win narrow ties).

Returns: ranked array of `{city, score, contributingLines}` for the
top N.

### Phase 3 — UI shell + reveal animation (THIS TURN)

New component: `src/components/celestial/FindYourPlaceButton.tsx`. A
prominent CTA above the map: "**Find your destined place**". Premium
icon + gold gradient. Tap behavior:

1. **Free user**: opens paywall sheet (or the Moonstones spend sheet —
   250 Moonstones for the one-shot).
2. **Premium user**: confirm + run.

On run:
1. Show a 3-second loader inside a modal overlaying the map, with
   planet glyphs staggering in (mirrors the existing intro loader).
2. Run scoring locally (<10ms).
3. Animate `flyTo(top.lon, top.lat)` on the map below — globe rotates,
   the city becomes centred.
4. Drop a special golden beacon pin at the city (bigger + brighter
   than the regular tap pin, with a constellation of light from the
   contributing planet lines).
5. Open a slide-up sheet with: hero (city name + flag + score badge),
   reading body (Phase 4 fills this).

### Phase 4 — AI personalized reading (THIS TURN)

Extend the existing `celestial-travel-reading` edge function with a
new endpoint mode `intent: 'best-place-reading'` that takes:

```
{
  city: { name, country, lat, lon, pop },
  intent: LifeIntent,
  contributingLines: [{ planet, angle, distanceKm }],
  birth: { utc, sign?, mbti? },
  userContext: { locale, displayName? }
}
```

Returns a richer 6-section reading:

```
{
  verdict: "Lisbon is your most aligned place for career."
  whyHere: "...3-4 sentences..."
  contributingPlanets: [
    { planet, angle, distanceKm, note: "..." }
  ],
  firstMonth: "...practical practice...",
  watchFor: "...one honest caution...",
  closingBlessing: "...short poetic line..."
}
```

System prompt anchored on Jim Lewis tradition + Arcana's voice
("mystical but grounded, gold not garish, sophisticated tarot app for
adults").

Cached by (intent, city.lat to 2dp, city.lon to 2dp, planet+angle
signature, locale) so re-rolls for the same user+intent+city are free.

Rate limit: 4 reads / minute / user (more permissive than the regular
travel reading because this is the headline feature).

### Phase 5 — Persistence + reversibility + production polish

New profile column: `destined_place` JSON `{ city, intent, savedAt }`.

On reveal:
1. After the reading shows, "Save as my destined place" CTA → writes
   to profile.
2. Banner on next Celestial Map visit: "Your destined place: Lisbon ✨"
3. User can run "Find another" up to 3 times per day (free Moonstones-
   adjusted limit) — the algorithm picks #2, #3, etc. from the ranked
   list and surfaces them as alternates.

Error states:
- Network fail on AI reading → keep the city reveal, show "Could not
  generate the reading. Try again" with retry button. The city + score
  are still useful even if the AI is down.
- Empty contributingLines (no lines within 700km of the top city) →
  shouldn't happen because the scorer requires non-zero score, but
  defensively: show "No strong place found for this intent — try a
  different life area."

Migration: `supabase/migrations/[timestamp]_destined_place_column.sql`
adds the column with no constraints (free-text JSON).

## Edge function deployment + secrets

The `celestial-travel-reading` edge function already exists and is
deployed. Phase 4 just extends its schema to accept the new intent.
No new secrets needed — OPENAI_API_KEY + GEMINI_API_KEY already power
the chain.

## Premium / Moonstones gating

- **Free user**: tapping "Find your place" opens the paywall.
- **Premium**: free use, unlimited re-rolls (but daily cap of 3 to
  protect AI cost).
- **Moonstones**: 250 Moonstones for one-shot reading (same as the
  existing travel-reading flow). After the one-shot, user sees the
  reading + can save the result; subsequent re-rolls are 250
  Moonstones each.

## What we don't do this phase

- **Synastry-cartography** (compare two birth charts) — separate v3.
- **Day-by-day transit timing** ("best to arrive in Lisbon March 14")
  — separate Premium-only future feature.
- **Booking integrations** (flights, accommodation) — out of scope.
- **Saving multiple destined places** — start with one; v3 expands to
  a "shortlist" if usage data warrants it.

## Rollout

All five phases ship in this turn under feature flag
`celestial-find-your-place` (rollout 100% to premium, 0% to free —
free users see the paywall variant of the button). Flip the free flag
to 100% once we want to enable the Moonstones path for everyone.

After ship: monitor edge function invocation count for 48h, watch
Sentry for any new errors, then bump version to 1.1.11 and tag.
