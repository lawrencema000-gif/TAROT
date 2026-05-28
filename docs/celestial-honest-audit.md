# Celestial Map — honest audit of what shipped vs what's actually working

Generated 2026-05-28, in response to user feedback that "nothing has
changed." Doing a real audit instead of claiming success based on
bundle-hash diffs.

## User's three asks

1. **Globe is rotatable** — drag the round globe to see all sides.
2. **A function that takes user details and tells them EXACTLY where
   the best place to live is.** With fancy graphics on the map. With
   a big description of why.
3. **Phase planning so the result is production-ready.**

## What I actually shipped (verified in live bundle)

| Piece | In bundle | Actually works | Notes |
|---|---|---|---|
| d3-zoom filter rejecting drag in globe mode | ✅ | **❓ likely broken** | Filter only fires on `<svg>` or `.celestial-drag-surface` target. On a globe, almost every pixel covers a `<path>` or `<line>`, so the filter rejects drag on those — drag only fires on truly empty space. |
| `FindYourPlace` button + modal | ✅ | ✅ | Component renders; algorithm runs locally. |
| Scoring algorithm | ✅ | ✅ | Math is correct; 40-entry weight table. |
| AI "best-place" reading | ✅ | ✅ | Edge function `celestial-travel-reading` accepts `mode: 'best-place'`, returns richer payload. |
| Reveal modal animation | ✅ | ✅ | Computing → reading → done phases work. |
| Destined-place persistence | ✅ | ✅ | Migration applied; column reads/writes. |
| Revisit banner on map | ✅ | ✅ | Shows when profile.destinedPlace set. |
| **"Fancy graphics on the map" for the destined place** | ❌ | ❌ | I added animations to the MODAL. The MAP itself shows the destined city as a regular tap-pin — same as any other city. No beacon, no rays, no constellation lines to contributing planets. **This is a real gap.** |
| **Globe rotation that actually works** | ❌ | ❌ | The filter logic I shipped is wrong (see above). Need to rewrite with raw pointer handlers. **This is the main complaint.** |

## Root causes

### Globe rotation

```ts
// What I shipped (engine, drag setup):
const dragBehavior = drag<SVGSVGElement, unknown>()
  .filter((event) => {
    const target = event.target as Element | null;
    return !!(target?.tagName === 'svg' || target?.classList.contains('celestial-drag-surface'));
  })
```

On a real globe view, the SVG is dense with continent paths, country
borders, planet lines, city dots, and graticule lines. The `target` of
a `mousedown` is the topmost element under the cursor — which is
almost always one of those children, NOT the SVG itself. The filter
rejects, drag never fires.

The d3-zoom filter that I added (rejecting mousedown in globe mode)
correctly stops d3-zoom from pan-handling the event, but the
subsequent drag handler also rejects via its own filter. **So
nothing handles the drag.** Globe stays still.

### Fancy graphics gap

The user said "fancy graphics to support the feature on the map." I
added:
- Hero animation in the modal ✓
- Flag emoji + city name ✓
- Glowing planet chips in the modal ✓

What I DIDN'T add:
- Anything visual on the map itself when a destined place is set or
  revealed.
- The map looks identical to before; the modal sits on top.

That's the visual punchline of the feature. The map should show the
user: "**THIS city, with these lines pointing to it, is your place.**"
Right now it just drops the same small pin you get from any tap.

## What "production-ready" means here

| Gate | Criterion | Current state |
|---|---|---|
| **Functional** | All three user asks demonstrably work | ❌ globe + map graphics fail |
| **Visual** | Map celebrates the destined place | ❌ no beacon, no rays |
| **Auth** | Premium / Moonstones gating coherent | ✅ |
| **Errors** | Reading failure shows retry, doesn't crash | ✅ |
| **Persistence** | Save/clear flow round-trips through Supabase | ✅ |
| **Cache** | Reading cached so re-runs are free | ✅ |
| **Cross-browser** | Works on iOS Safari + Android WebView | ❓ untested |
| **Reduced motion** | Respects `prefers-reduced-motion` | ✅ |
| **No regressions** | Other Celestial Map flows still work | ✅ |

Production-ready gate that's currently red: **functional + visual.**

## Phase plan to actually deliver

### Phase A — Rewrite globe interaction (real fix)

Replace d3-drag with raw pointer event handlers attached directly to
the SVG. d3-zoom's filter already rejects mousedown in globe mode, so
no library competes for the event.

Pointer-event flow:
- `pointerdown` on SVG → capture starting pointer + rotation
- `pointermove` → if delta > 5px from start, mark as drag; update
  rotation [λ + dx·sensitivity, φ + dy·sensitivity, 0]
- `pointerup` → release; if the move was a real drag, swallow the
  subsequent `click` event to prevent the tap-to-open-panel from
  firing
- Touch: use `pointer-events: none` on decorative children inside the
  zoom group so the drag passes through to the root SVG; the city
  dots + line click targets re-enable pointer-events explicitly

### Phase B — Real on-map visuals for the destined place

New layer rendered inside the zoom group when a destined place exists
OR is being revealed:

1. **Destined beacon** — Large gold dot (4× normal pin radius) with a
   triple-ring pulsing halo, animated via SVG `<animate>` so it
   doesn't tax React.
2. **Constellation lines** — Thin gold paths from each contributing
   planet's nearest line-sample to the destined city. Drawn with
   stroke-dashoffset animation so they appear to "draw in" toward
   the city when the reveal opens.
3. **Radiant rays** — 6-8 thin lines emanating from the city at
   varying angles, with reduced-motion-safe rotation animation.
4. **City name label always visible** — Cormorant Garamond, larger
   than other city labels, gold colour.

Component: `CelestialDestinedBeacon.tsx`. Driven by a `destinedPlace`
prop on `CelestialMapView`.

### Phase C — Wire + ship

- `CelestialMapPage` passes `profile.destinedPlace` to the map view
- `CelestialMapView` renders the beacon layer inside the zoom group
- The reveal modal's `onReveal` also passes the place to the map (so
  the beacon shows during the reveal, not just after Save)

### Phase D — Test against the user's actual asks

For each ask, do a real interaction test, not just a bundle-grep:

1. ✅ Open `/celestial-map`, toggle to Globe → drag → globe rotates
2. ✅ Tap "Find your destined place" → modal appears → city revealed
3. ✅ Map shows beacon at the city, rays animating, lines drawn in
4. ✅ Reading appears with verdict + 5-7 sentence body + planet
   citations + practice + closing
5. ✅ Save → banner appears on next page open → beacon persists on map

### Phase E — Ship + verify

Manual deploy + verify each numbered item above. No "bundle hash
changed = done" claims.
