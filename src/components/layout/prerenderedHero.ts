/**
 * Keeps the prerendered landing hero on screen until the live landing can
 * take its place.
 *
 * The build writes the hero into #root of dist/index.html (scripts/seo-body.mjs
 * landingHeroBody) and its guard marks `<html data-prerendered="landing">`
 * when this visitor should see it. `createRoot().render()` replaced it on the
 * first commit, so a cold visitor saw the hero, then the boot screen, then
 * LandingPage's empty Suspense fallback, then the hero again: several seconds
 * of spinner and blank after the page was already readable.
 *
 * {@link holdPrerenderedHero} moves the hero out of #root before React mounts
 * and hides #root; React boots behind it. {@link releasePrerenderedHero} swaps
 * them back — LandingPage calls it from a layout effect (same frame as its
 * first paint), and App calls it as soon as it decides on any other screen
 * (signed in, the auth form, an error). A timeout releases it regardless, so a
 * landing chunk that never arrives cannot leave a dead hero up for good.
 */

const MARK = 'data-prerendered';
const HELD_ATTR = 'data-hero-held';

let held: HTMLElement | null = null;
let heldRoot: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export function holdPrerenderedHero(root: HTMLElement, maxMs = 10_000): boolean {
  if (held) return true;
  if (document.documentElement.getAttribute(MARK) !== 'landing') return false;
  const hero = root.querySelector<HTMLElement>('.seo-landing');
  if (!hero || !root.parentNode) return false;
  root.parentNode.insertBefore(hero, root);
  root.style.display = 'none';
  root.setAttribute(HELD_ATTR, '');
  held = hero;
  heldRoot = root;
  timer = setTimeout(releasePrerenderedHero, maxMs);
  return true;
}

export function releasePrerenderedHero(): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  if (held) held.remove();
  held = null;
  if (heldRoot) {
    heldRoot.style.display = '';
    heldRoot.removeAttribute(HELD_ATTR);
  }
  heldRoot = null;
}

export function isPrerenderedHeroHeld(): boolean {
  return held !== null;
}
