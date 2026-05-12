# Astroline Astrocartography Funnel — Reverse-Engineering Report

Scrape date: 2026-05-12. URL: https://sub.astroline.today/quiz-pp?mode=astrocartography

This doc captures every page, every API call, and the backend
architecture behind Astroline's astrocartography quiz funnel — the
direct competitor whose design we're paralleling in Arcana's Celestial
Map feature.

## 1. The 14-step funnel

| Step | Screen | What's collected | UX trick |
|------|--------|------------------|----------|
| 1/14 | Gender picker | Female / Male / Non-binary | Single-tap (auto-advance) |
| 2/14 | Birthday | Zodiac-sign grid + Month/Day/Year picker | Sign picker auto-fills date range |
| 3/14 | Birth time | 12h:mm AM/PM scroller + "I don't remember" escape hatch | Soft-required — escape goes to noon default |
| 4/14 | Birth place | Autocomplete textbox (suggests reverse-geocoded current location) | Pre-fills based on `/api/v1/approximate-location` |
| 5a/14 | "Mapping your birth chart..." loader | (none) | Lists 11 aspects being analyzed: 🔮 Inner self, 💓 Emotional, 👤 Outer, 🧠 Intellect, ❤ Love, 💪 Strengths, 🚀 Changes, 🧩 Challenges, 🧭 Approach, 🦋 Transformations, 🌙 Intuition |
| 5b/14 | "Your chart shows a **rare spark**" reveal | (none — reveal of Moon/Sun/Ascendant) | Universal compliment ("rare spark" for everyone) + show 3 personality cards |
| 6/14 | Forecast accuracy **34%** | (none — just Continue) | Progress-bar hook: "Share a bit more to reveal what's driving you" |
| 7/14 | Relationship status | 7 options: In a relationship / Just broke up / Engaged / Married / Looking for a soulmate / Single / It's complicated | Auto-advance on tap |
| 8/14 | Future goals | 8 options: Family / Career / Health / Marriage / Travel / Education / Friends / Children | Multi-select with Continue |
| 9/14 | Color preference | 6 colors: Red / Yellow / Blue / Orange / Green / Violet | "Important for better personalization" (Barnum framing) |
| 10/14 | Element preference | 4 elements: Earth / Water / Fire / Air | Same framing |
| 11/14 | "You" personality card | (none — display) | Shows: Gender + Sun sign + Element + Modality + Polarity + 3 sign cards |
| 12/14 | Forecast accuracy **67%** | (none — just Continue) | Second progress hook: "You're close to a big reveal!" |
| 13/14 | **Palm photo upload** | Image of left palm (ML-validated) | "Privacy is a priority — we only process non-identifiable data" — actually hits a real palm-detection ML endpoint |
| 14/14 | (Behind palm gate) Subscription paywall | Email + payment | We didn't reach it — palm ML rejected our test image. Magnus config reveals the paywall is product `astrocartography_ultra` with a 5-min `readyTimer` urgency countdown and a price-slider view |

### Funnel design takeaways

- **Two fake progress bars** (34% → 67% → 100%). Neither corresponds to actual algorithmic progress; pure anticipation building.
- **"Rare spark" universal compliment** — every user gets the same emotional hook. The card layout shifts based on actual Sun/Moon/Asc, but the framing is identical.
- **Color + Element preferences** are pure Barnum — they don't affect the astrocartography compute (we confirmed by reading the birth-chart request body).
- **Palm photo is a commitment device**, not just data. The funnel is ~50% complete when the user uploads — sunk-cost makes them more likely to pay. ML validation rejects junk uploads, forcing engagement.
- **Self-hosted Nominatim** for geocoding → no Mapbox/Google bill.
- **`mode=astrocartography` URL param** routes them through the astrocartography-flavoured copy + paywall. Other modes (palmistry, compatibility, etc.) reuse the same React app.

## 2. Backend architecture

Five distinct services power the funnel:

### `astrology.astroline.app` — main API
- `POST /api/v1/auth` — anonymous JWT session on first load
- `GET /api/v1/approximate-location` — IP → coarse lat/lon for birth-place autofill
- `PUT /api/v1/profile` — body: `{ name, gender, marital_status, birthdate, email, is_unsubscriber }`
- `POST /api/v1/profile/set-profile-params` — body includes `time_format`, `is_enable_lang`, `time_zone`, `mode: 'astrocartography'`, `geo_country`, `partition: 'quiz-pp'`, email/billing config flags
- `POST /api/v1/goals/save` — body: `{ goals: ['Traveling'] }`

### `bcs-htz.astroline.app` — Birth Chart Service (stateless compute)
- `POST /api/birthchart`
  - Request: `{ birth: { date, time, location: { lat, lon } } }`
  - Response: full natal chart — 10 planets with signs+houses+dms360 degrees, ascendant, north/south nodes, 12 natal houses with cusps, `zodiacByDate` rollup, error array if input was rejected
  - **Critically: this does NOT return astrocartography line coordinates.** The natal data is computed server-side, but the actual astrocartography lines must be drawn client-side from the planet RA/Dec data. (Same architecture we use — our `astrocartography.ts` does it client-side too.)

### `hand-detection.astroline.today` — palmistry ML
- `POST /lines/` (multipart/form-data with image)
  - Returns 400 "Palm not found" if no hand detected
  - On success: presumably returns palm line geometry + interpretations
  - **This is a real ML model**, not a placeholder. They invested in compute for the funnel gate.

### `nominatim.astroline.app` — self-hosted OpenStreetMap geocoder
- `GET /nominatim/reverse?lat=...&lon=...&format=json`
  - Standard Nominatim API — they're hosting their own instance instead of paying Mapbox/Google geocoding fees
  - This is the path we should copy: zero ongoing cost, full data ownership

### `mutator.magnus.ms` — A/B testing + remote config
- `GET /api/v2.0/config?campaign_id&country&idfm=...&source&with=experiments_stratification,active_experiments,session_first`
  - Returns a **970KB** config blob with:
    - 100+ experiments
    - Per-mode pricing variants (astrocartography_ultra, astrocartography_smoke, astrocartography_cfs, astrocartography_tt, astrocartography_wr — all separate test variants)
    - Active vs. notActive (anchor) prices for every locale
    - Feature-flag-style toggles for funnel steps

## 3. Pricing intelligence

From the Magnus config:

- **Active prices observed**: €9.99 / €13.99 / €19.99 / €25.99 / €27.99 / €29.99
- **Anchor (crossed-out) prices**: €49.99 / €69.99 (≈2.3× active)
- **Periods**: 1-week and 3-month (mentioned in `name` fields)
- **Cents-based variants**: 1500 / 3200 / 4700 (likely for non-EUR markets)
- **Product**: `astrocartography_ultra` (the upsell SKU for this funnel)
- **Urgency**: `readyTimer: 300` (5-minute countdown on the paywall)
- **Layout**: `view: "WITH_SLIDER"` (price-slider component, not radio buttons)

## 4. What Arcana doesn't yet have (vs. Astroline)

After this scrape, the gaps in our Celestial Map MVP:

| Astroline feature | Arcana state | Should we add? |
|-------------------|--------------|----------------|
| 14-step pre-purchase quiz | We use existing Profile data | **No** — we already have a paying user; no need for a re-acquisition funnel |
| Fake progress bars (34%, 67%) | None | **Maybe** — could add a one-time "first open" intro reveal |
| "Rare spark" universal compliment | None | **Maybe** — could surface as the first reveal card |
| Palm photo step (ML detection) | None | **Out of scope** — would need a hand-detection model and is a different feature class |
| 5-min countdown urgency on offer | None | **No** — we don't use scarcity urgency in Arcana (brand voice) |
| Anchor-priced subscription offer | We have PaywallSheet | **Already covered** |
| Color + Element preference Barnum | None | **No** — feels manipulative; brand voice rejects this |
| Loading animations between steps | None on Celestial Map | **Yes** — Stage G should add a "drawing your map…" loader before first render |
| Reverse-geocoding (city name from tap) | Hand-curated 200-city dataset | **Maybe** — could self-host Nominatim for full coverage; current dataset misses small cities |
| Server-side birth-chart compute | Client-side (astronomy-engine) | **Already covered** — our compute is local; faster, no roundtrip |
| Astrocartography line compute | Client-side (our `astrocartography.ts`) | **Same architecture as Astroline** — confirmed they also compute lines client-side |
| Separate sale of the astrocartography feature | Bundled in Premium + 250 Moonstones one-shot | **Different model** — ours feels better; theirs is single-purchase locked |

## 5. Actionable recommendations

Things worth pulling into our Celestial Map (Stage G polish):

1. **"Drawing your celestial map…" loader** with stage-aware copy (matches step 5a's energy: name the 10 planets being mapped as they appear)
2. **First-open reveal modal** — one-time "What are these lines?" overlay with 3 cards, dismissable; addresses the cold-start UX problem
3. **Self-hosted Nominatim** (optional, later) — replace our 200-city hand-curated list with global coverage at zero ongoing cost
4. **Universal positive framing card** — first time the user opens the map, surface a "rare alignment" card based on their actual chart, not a manipulative universal compliment. The trick is to find one *genuinely* notable thing per chart (closest stellium, exact angle, etc.) and lead with it.

Things to deliberately NOT copy:
- The two fake progress bars (manipulative)
- The Barnum color/element steps (feel cheap)
- The palm-photo commitment gate (different feature class, dilutes focus)
- The 5-min countdown urgency (off-brand)
- The Color/Element Barnum prompts (off-brand)

## 6. Raw artifacts

Screenshots saved to repo root (cleanup pending):
- `astroline-01-gender.png` through `astroline-13-palm-photo.png`

Network captures + request bodies:
- `astroline-network.log` — full network log (988+ requests including trackers)
- `req-birthchart.json`, `resp-birthchart.json` — birth-chart compute round-trip
- `req-profile-params.json`, `req-profile-put.json` — profile saves
- `req-goals.json` — goals save
- `palm-req-hdr.txt`, `palm-resp.txt` — palm-detection request/response
- `resp-magnus-config.json` — full 970KB Magnus A/B config

Recommend gitignoring the screenshot + json artifacts unless we want them in version control.
