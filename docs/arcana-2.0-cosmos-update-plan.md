# Arcana 2.0 — "The Cosmos Update" master plan

**Date:** 2026-06-14 · **Inspiration:** Cece (測測, com.lingocc.cc5) + competitive set (Astroscope, CUE, Labyrinthos)
**Goal:** transform Arcana from a daily-ritual app into a full astrology *platform*: chart anyone, ask AI anything, gorgeous immersive design, deep content.

## What Cece has that we don't (scraped 2026-06-14)

| Cece feature | Arcana today | Plan |
|---|---|---|
| Chart OTHER people (friends/family) + one-click compatibility | Only your own chart; partner synastry is ad-hoc (not saved) | **Phase 2: People** |
| 20 birth-chart types, visual chart wheels | Placements list only — no wheel graphic at all | **Phase 3: Graphs** |
| AI Q&A across stars/tarot/charts, 3-sec answers, suggested questions | AI companion exists but is not chart-aware | **Phase 4: AI** |
| Deep interpretation reports free to view | Thin: sign-level only; no planet-in-house, no aspect meanings | **Phase 5: Content** |
| Personality tests social layer | 34 quizzes exist (parity ✓) | — |

## Phase 1 — Design overhaul: "scroll-stop" immersive art
- Landing: full-viewport `scroll-snap` sections; each section gets its own ambient
  animated background layer (pure CSS/SVG — zero image weight): starfield drift,
  aurora gradient mesh, constellation lines, nebula glow, gold-dust particles.
- In-app: per-tab ambient backgrounds (subtle), section-reveal animations,
  richer glassmorphism cards, zodiac-glyph watermarks.
- Constraints: GPU-cheap (transform/opacity only), `prefers-reduced-motion`
  respected, no bundle bloat (no image backgrounds).

## Phase 2 — People (the Cece headline feature)
- **DB** (`people` table): id, user_id, name, relationship (self/partner/family/friend/other),
  birth_date, birth_time, birth_tz, birth_place, birth_lat, birth_lon,
  birth_utc (trigger-computed, reusing the profiles trigger pattern), notes, created_at.
  RLS: owner-only CRUD. Cap 50 people/user (constraint trigger).
- **Edge fn** `astrology-person-chart`: computes a full natal chart (planets,
  ascendant, equal houses, aspects) for arbitrary birth data — the math already
  exists in astrology-compute-natal + partner-synastry-adhoc; extracted to `_shared/natal.ts`.
  Free (pure compute, no LLM). Chart JSON cached in `people.chart` jsonb column.
- **UI**: `/people` list page (zodiac avatar cards, add/edit/delete),
  `/people/:id` detail (wheel + placements + balance graphs + AI reading + synastry launcher).
  Uses tz-lookup on birth-place geocode like ProfilePage (Sprint B pipeline).
- **Synastry**: "Compare" action between you and any person (or two people) —
  reuses partner-synastry-adhoc with both charts.

## Phase 3 — Graphs
- **NatalWheel** SVG component: zodiac ring (12 glyphs), house spokes, planet
  glyphs positioned at ecliptic longitudes, aspect lines colored by type
  (conjunction gold, trine/sextile teal, square/opposition rose). Deterministic
  from chart JSON, ~zero deps, animatable.
- **ElementBalance + ModalityBalance**: distribution bars (fire/earth/air/water,
  cardinal/fixed/mutable) computed from placements.
- **AspectGrid**: classic triangular synastry/natal aspect matrix.
- Used on: own chart page, person detail, synastry results.

## Phase 4 — AI everywhere
- **Person-aware AI reading**: new edge fn `ai-person-reading` (LLM, moonstone-gated
  via the Sprint-D server-authoritative spend) — generates a personal chart
  interpretation for any saved person, grounded in their computed placements.
- **Chart-aware companion**: pass active person's placements as context to
  ai-companion-chat ("Ask about Mom's chart").
- **Suggested questions** (Cece's "guess what you ask"): static per-context
  question chips (free, no LLM).

## Phase 5 — Content database expansion (the "ALOT of new information")
New lazy-loaded interpretation libraries (TypeScript data modules, written by
parallel agents against a strict schema, each 2-4 sentences per entry, tone-matched):
- `planetInSign.ts` — 10 planets × 12 signs = **120 entries**
- `planetInHouse.ts` — 10 planets × 12 houses = **120 entries**
- `houseMeanings.ts` — 12 deep house descriptions
- `aspectMeanings.ts` — 5 major aspects × 45 planet pairs = **225 composed entries**
  (per-aspect essence + per-pair dynamics, composed at render)
- `signCompatibility.ts` — 78 sign pairings with love/friendship/work facets
- **Total: ~560 new interpretation entries** powering person pages, own chart,
  synastry, and the AI grounding context.
- DB side: `people` + chart cache jsonb (user data belongs in DB; read-only
  interpretation content ships as code-split data modules — faster + free).

## Phase 6 — Multi-agent scan fixes
Six scanners (UX flows, design system, performance, half-built features,
content depth, retention/monetization) + prioritization judge are running.
Top quick-wins get folded in; the rest land in the backlog doc.

## Execution order (parallelized)
1. Plan doc (this) ✅
2. **Parallel:** People server core (me) ⟂ content-library workflow (agents)
3. People UI + graphs (me, with agent assists)
4. Design overhaul (me for coherence; foundations then per-page polish)
5. AI person reading + companion context
6. Scan quick-wins → gates (typecheck/tests/build) → deploy (migration, edge fns,
   web, cap sync android) → commit per phase

## Non-goals (this update)
- Community/social feed parity with Cece (WeChat-graph dependent; separate effort)
- New tarot decks / paid art assets
- iOS build
