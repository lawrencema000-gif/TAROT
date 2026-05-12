# Celestial Map — Visual Design Plan

Generated 2026-05-12. Distills the reference Astroline astrocartography
map (their public `astrocartography-map.jpg` marketing asset) into design
principles, then translates each principle into Arcana's brand
vocabulary.

We are explicitly NOT pixel-copying Astroline's UI — that's both
brand-diluting and legally risky. We're lifting design *principles* and
applying them through our own gold + mystic palette + serif/sans
stack.

## Reference observations (from astrocartography-map.jpg)

| Element | What Astroline does |
|---|---|
| Projection | Equirectangular (rectangular, full world) |
| Ocean | Very dark navy (~#0a1628), nearly black |
| Continents | Desaturated teal-blue fill (~#3a5a7a) |
| Country borders | Subtle lighter lines inside continents (mid-opacity) |
| Continent labels | White-cream serif, all-caps, centered per continent |
| Planet lines | Distinct colours per planet (red, pink, amber, purple, cyan, blue, etc.) |
| Line style | Double-stroke "neon" — thin outer glow + bright inner core, ~2px stroke |
| Line opacity | High (~85%) — visible against the dark ocean |
| All 40 lines visible | Yes, without filtering — composition reads despite density |
| Mood | Premium, clinical, NASA-chart energy |
| Decorative elements | None — the lines + labels are the design |

## Arcana brand translation

Same principles, expressed through our existing palette and type system.

### Palette

| Layer | Arcana token | Hex |
|---|---|---|
| Ocean (deepest base) | `mystic-950` | `#0a0a0f` |
| Ocean gradient highlight (centre of map) | `mystic-900` 60% over `mystic-950` | (gradient) |
| Continent fill | `mystic-800` with subtle gold-tinted overlay | `#1f1f2e` + `rgba(212,175,55,0.06)` |
| Continent highlight (top edge) | `mystic-700` | `#2a2a3d` |
| Country border | `mystic-600` at 25% opacity | `rgba(60,60,80,0.25)` |
| Graticule (lat/lon every 30°) | `gold` at 6% | `rgba(212,175,55,0.06)` |
| Equator + Tropics graticule | `gold` at 14% | `rgba(212,175,55,0.14)` |
| Continent text label | `mystic-200` | `#bfbfd1` |
| Star background dots | `mystic-300` at 30% on top of ocean | (decorative) |

### Planet colours (already established in `CelestialMapView`)

Astroline uses generic neon colors; we use a refined "gold-family with hue shifts" palette so the chart reads as Arcana-branded but stays legible:

```
Sun:     #f4d668  (bright gold — the headliner)
Moon:    #e6e0ff  (pearl)
Mercury: #a8e8e0  (mint)
Venus:   #f0b8a0  (rose-gold)
Mars:    #e07a5f  (amber-red)
Jupiter: #d4af37  (warm gold)
Saturn:  #c2b280  (cool gold)
Uranus:  #80c8e8  (electric blue)
Neptune: #8e6eb5  (purple)
Pluto:   #a83253  (deep crimson)
```

Plus a SECOND outer-stroke glow layer per line:
- Outer stroke: same colour at 30% opacity, 4× width — gives the luminous halo
- Inner stroke: solid colour, 2× width — the visible line itself
- Filter: `<feGaussianBlur stdDeviation="1.5">` for a soft outer glow

### Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Continent label | Cormorant Garamond (display) | 16-22px (scales with continent area) | 400 |
| Coordinate readouts (debug / corners) | Inter (body sans) | 10px | 500 |
| No labels on lines themselves | — | — | — |

### Projection choice

**Equirectangular (Plate Carrée)** — same as Astroline. Reasons:
1. Standard astrocartography convention; AC/DC lines are smooth sine-curves on this projection
2. Map fills a 2:1 rectangle cleanly (we use 4:3 aspect; ocean fills the extra ⅓)
3. No projection distortion concerns since we're not measuring areas
4. `d3.geoEquirectangular()` ships in `d3-geo` (no extra dep)

We sacrifice the "looks like a real globe" Mercator/Robinson feel for cleaner line geometry — astrocartography users prefer it this way.

### Composition

```
┌─ outer frame: rounded-2xl, hairline gold border ─────────────────┐
│                                                                  │
│  ✦                                                          ✦   │  ← decorative stars
│                                                                  │
│           [continent shapes, gold-tinted dark fills]              │
│              [AC/DC sine curves drawn over]                       │
│              [MC/IC verticals drawn over]                         │
│                                                                  │
│  ✦                                                          ✦   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              ↑                            ↑
        decorative graticule         continent labels
        (gold lines @ 30°)        (Cormorant, mystic-200)
```

### Layering order (SVG `<g>` stack, back to front)

1. Background gradient (radial — slightly lighter centre)
2. Star-dot decoration (subtle, fixed positions, low opacity)
3. Graticule (lat/lon grid lines)
4. Continents — fill + border
5. Country sub-borders (within continents)
6. Continent labels (Cormorant)
7. **Planet lines — outer glow stroke layer**
8. **Planet lines — inner solid stroke layer**
9. Tap-target overlay (transparent, captures clicks)

### Animation choreography

On first render (and after birth-data changes):

1. **0 ms** — map + continents are visible (no transition; they're the canvas)
2. **0–600 ms** — graticule fades in
3. **600 ms** — first planet's lines begin drawing
4. **+250 ms per planet** — stagger each planet's 4 lines
5. **Each line draws in over 800 ms** using SVG `stroke-dasharray` + `stroke-dashoffset` interpolation
6. Lines start with a 0% draw, animate to 100%, then glow holds steady

This makes the map feel alive on first load without being precious about it. After the initial draw, filter changes (life-area selector) cross-fade the line opacity in 250 ms rather than redrawing.

### What we deliberately don't add

- Country names (too noisy at world scale)
- Latitude/longitude readouts on the map itself (clutters; show on tap instead)
- Time zones / day-night overlay (not relevant to astrocartography)
- Visible compass rose (would feel like a video game prop)
- Earth-texture continent fills (would clash with brand)

## Tech choices

- `d3-geo` (~30KB) — projection + path generation
- `topojson-client` (~5KB) — decode TopoJSON to GeoJSON
- `world-atlas` (~140KB world-110m.json, ~30KB gzipped) — the actual continent geometry
- Remove `mapbox-gl` (700KB) and `react-map-gl` (40KB) — net savings ~640KB
- Continue using `framer-motion` for the line-by-line draw stagger

## Out of scope (later)

- Self-hosted Nominatim for "tap → city name everywhere on earth" (vs. our 200-city curated list)
- Day/night terminator overlay (some users like it; can be a Premium-only toggle)
- Zoom + pan via `d3-zoom` (current first version is fixed-view; we can layer zoom in later)
