/**
 * Motion preference for imperative code.
 *
 * The global `@media (prefers-reduced-motion: reduce)` block in index.css
 * cannot reach two things:
 *
 *   1. `scroll-behavior: auto !important` loses to an explicit
 *      `behavior: 'smooth'` in a scrollTo/scrollIntoView/scrollBy call. Per
 *      the CSSOM-View spec the dictionary member wins over the computed
 *      style — it is not a specificity contest the stylesheet can win.
 *   2. Anything animated from JS: rAF loops, setInterval count-ups, canvas,
 *      d3 transitions, three.js.
 *
 * framer's `useReducedMotion()` covers components during render. This covers
 * the rest — event handlers and effects, where a hook cannot be called.
 */

/** True when the user has asked for reduced motion. Safe during SSR/tests. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Scroll behaviour honouring the preference. Pass this instead of the string
 * literal `'smooth'`:
 *
 *   el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
 *
 * The scroll still happens — the destination is not motion, the journey is.
 */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Duration for a JS-driven animation, in ms. Returns 0 when the user has
 * asked for reduced motion, so callers can jump straight to the end value
 * rather than branching at every call site.
 */
export function motionDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}
