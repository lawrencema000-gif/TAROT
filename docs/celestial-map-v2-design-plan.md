# Celestial Map v2 — Interactive Redesign Plan

Generated 2026-05-27. The v1 map (shipped 2026-05-12) is a static
equirectangular SVG with stagger-drawn lines. Users want it
interactive: drag-to-pan, pinch-to-zoom, globe-vs-flat toggle, 3D
parallax depth, richer hover/tap interactions.

This plan keeps the existing brand language (mystic-950 ocean,
gold-tinted continents, Cormorant labels, planet-color line glow)
and adds the interactivity layer on top.

## Goals (in priority order)

1. **Pan + zoom** — drag-to-pan, pinch/wheel-to-zoom. Foundation of
   every other interaction.
2. **Globe ↔ Flat toggle** — switch between equirectangular (flat
   world) and orthographic (3D globe). Smooth animated transition.
3. **Drag-to-rotate** in globe mode. Like a desk globe.
4. **Richer city tap** — visible pin where you tap, ripple animation,
   smoother CityInsightPanel entrance.
5. **Hover states on planet lines** — brighten + thicken on hover so
   the user can identify each line before tapping.
6. **Parallax depth** — mouse-position-tracked star layer drift on
   desktop; subtle gyroscope tilt on supported mobile.
7. **Tactile micro-interactions** — momentum-decay pan/zoom, snap-back
   on edge over-pan, easing on toggle.

## Tech additions

| Package | Why | Size |
|---|---|---|
| `d3-zoom` | Pan + zoom transforms on the SVG | ~6KB gzipped |
| `d3-drag` | Drag-to-rotate the globe | ~3KB gzipped |
| `d3-selection` | d3-zoom + d3-drag need it for the .call() pattern | ~5KB gzipped |
| `d3-interpolate` | Smooth projection transitions (flat ↔ globe) | ~3KB gzipped |
| `d3-ease` | Custom easing curves on the projection transition | ~1KB gzipped |

Net add: ~18KB gzipped. Worth it for the UX upgrade.

## Architecture

### `CelestialMapView` → split into two pieces

**Before**: One giant component that owns projection + rendering +
hit-test + animation.

**After**:
- `useCelestialMapEngine.ts` — hook that owns projection state, zoom
  transform, drag-to-rotate state, mouse/touch handlers, and exposes
  the projection function + current transform.
- `CelestialMapView.tsx` — pure render — takes the projected paths +
  current transform as props, renders SVG, attaches the engine's
  handlers via ref.

This is the v2 architecture cleanup that makes the new features
maintainable without bloating the render function.

### State the engine owns

```
{
  mode: 'flat' | 'globe',           // active projection
  rotation: [λ, φ, γ],              // globe rotation (only in globe mode)
  transform: { x, y, k },           // zoom transform (d3.zoomTransform)
  hovered: { planet, angle } | null,
  tapPin: { lon, lat } | null,      // visible pin on map after tap
  isAnimating: boolean,             // for mode transitions
}
```

### Projection transition (flat ↔ globe)

When the user toggles modes:
1. Capture current projection's center + rotation as start state
2. Compute target projection's equivalent state
3. Over 800ms, animate using `d3.geoInterpolate` for the spherical
   path and a custom tween for the projection function blending
4. During animation, lock interactions; release after

### Globe drag-to-rotate

In globe mode:
1. On `mousedown` / `touchstart`, capture the [x,y] pointer position +
   current rotation
2. On `mousemove` / `touchmove`, convert delta-pixels to delta-degrees
   (scaled by projection.scale())
3. Apply the new rotation as `[λ + dx, φ + dy, γ]` clamped so the
   poles can't flip through
4. Snap-back inertia on release using a simple exponential decay loop

### Zoom (both modes)

`d3.zoom().scaleExtent([0.8, 8])` attached to the SVG.
- Min 0.8 so the user can zoom out slightly past 1× (gives breathing
  room before the elastic edge)
- Max 8 so a phone-sized user can zoom in to read city names
- `.translateExtent` constrains pan to keep the world in view (in flat
  mode); free in globe mode (rotation handles it)

In globe mode, zoom only scales the projection — pan is disabled
because rotation is the equivalent.

### Hover effects

For each planet line, the wrapping `<g>` gets `onMouseEnter` /
`onMouseLeave`. On hover:
- Outer halo opacity 25% → 60%
- Inner core stroke-width × 1.6
- Other lines fade to 0.3 opacity (the hovered line is the focus)
- Tooltip near cursor showing "Sun MC" + the line's micro-description

Touch devices: skip hover; first tap shows the tooltip, second tap
opens the insight panel.

### Parallax stars (desktop only)

The decorative star layer moves opposite to cursor position by ±8 px
max. Uses `useEffect` with `mousemove` listener throttled via
`requestAnimationFrame`. Disabled when `prefers-reduced-motion`.

### Gyroscope tilt (supported mobile only)

`window.DeviceOrientationEvent` if granted. Tilts the SVG container by
±2° on the alpha/beta axes. Subtle; disabled when reduced-motion.

iOS 13+ requires user permission for orientation events. Show a
one-time tooltip "Allow motion access for a 3D feel" with Yes/Skip;
skip persists in localStorage.

## Visual upgrades

### Continent fill — depth gradient

Today: solid `#1f1f2e` fill.
Plan: gradient from `#262638` (top) to `#16162a` (bottom) with a
subtle `feGaussianBlur` rim light at the eastern edge of each
continent. Sells "lit from above" without being heavy.

### Ocean — radial glow + animated noise

Today: solid `#0a0a0f` rect.
Plan:
- Radial gradient `from-mystic-900 at center → mystic-950 at corners`
  (subtle, ~12% delta)
- SVG `<filter>` with `feTurbulence` + low-opacity overlay for a
  faint nebula texture
- Performance: render once to an off-screen pattern, reuse

### Star layer — three depth planes

Today: 17 hand-placed stars.
Plan:
- ~80 stars across three depth planes (`r: 0.4`, `0.8`, `1.2`)
- Each plane parallaxes at a different rate (0.3×, 0.6×, 1.0× of
  cursor delta)
- Random twinkle: each star gets a `<animate>` on opacity with random
  duration 3-8s + random offset

### Line interaction polish

- Hover: smooth stroke-width transition (200ms) + outer-glow boost
- Active (during tap): brief 1.3× scale on a ring at the tap point
- Selected (after tap, panel open): one specific line gets a "selected"
  brighter treatment until panel closes

### Tap pin

When the user taps the map, render a small gold pin at the projected
coords:
- Animated entrance (drop + bounce)
- Pulsing ring around it (subtle)
- Stays visible while the panel is open
- Disappears with a fade when the panel closes

### Controls overlay (top-right of map)

A small group of buttons floating over the top-right of the map:
- **Globe / Flat toggle** (current mode highlighted)
- **Zoom in / Zoom out** (+/-)
- **Reset view** (returns to default center + zoom + rotation)
- **Find me** (if user has birth location, jump to it with a special
  marker — premium-only)

Frosted glass background (`backdrop-blur-md bg-mystic-900/70
hairline-gold-soft`), only renders when not animating.

### "How to use" first-open tip

Animated thin gold arrow + "Drag to pan · Pinch to zoom · Tap a place
for insight" caption that fades after 5 seconds. Persisted via
localStorage so it shows once per device.

## What we deliberately do NOT add

- **WebGL / Three.js** — overkill for this scale and would 5× the
  bundle. SVG with d3 is fine for our line count.
- **3D mountains / terrain elevation** — doesn't aid astrocartography
  (lines are flat-earth angular). Adds noise.
- **Day/night terminator** — possible Premium-only future feature, but
  not in v2.
- **Animated background nebulae** — performance hit for unclear gain.

## Animation budget

- Mode transition: 800ms, easing `d3.easeCubicInOut`
- Hover/tap micro-interactions: 200-300ms
- Star twinkle: 3-8s individual loops (background)
- Pin entrance: 600ms with bounce
- Tooltip: 150ms in, 100ms out

Total motion is calm — the user is reading a map, not playing a game.

## Accessibility

- All buttons in controls overlay have `aria-label`s
- Keyboard nav: Tab focuses controls; arrow keys pan; +/- zoom; G to
  toggle globe; R to reset
- `prefers-reduced-motion`: disables parallax, gyro, star twinkle,
  mode-transition (instant swap), pin bounce (instant placement)
- Touch targets ≥ 44pt for all controls

## Out of scope (v3 candidates)

- Saving custom views ("my favourite places")
- Sharing a deep-linked view ("here's the spot I'm considering")
- Comparing two natal charts on one map (synastry-cartography)
- Day/night terminator + transit overlays
