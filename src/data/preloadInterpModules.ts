// Singleton preloader — caches dynamic imports so they resolve instantly on second access.
// Called once when the horoscope page mounts; subsequent imports hit the browser module cache.

let preloaded = false;

export function preloadInterpModules() {
  if (preloaded) return;
  preloaded = true;
  // Fire-and-forget — these populate the browser's module cache
  import('./planetInSign');
  import('./planetInHouse');
  import('./aspects');
  import('./transits');
}
