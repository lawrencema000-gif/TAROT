/**
 * Side-effect polyfills for older Android WebViews / iOS Safari < 15.4.
 *
 * Capacitor on older Android system WebViews (Android 9 and below) ships
 * with a JS engine that lacks `Array.prototype.at` and `String.prototype.at`
 * (ES2022). Vite's `target: 'esnext'` doesn't down-compile or polyfill
 * these, so any library code using `.at()` (e.g. Sentry's bundled deps,
 * mapbox-gl historically, some d3 internals) crashes with "this.o.at is
 * not a function" on those devices.
 *
 * Cost is ~30 bytes; benefit is one fewer Sentry issue and a working app
 * on Android 7-9 + iOS 14 hardware that's still in the wild.
 */

// Cast to any to bypass TypeScript's static check — the whole point of this
// file is to runtime-check whether the prototype method exists, since older
// engines don't have it in their lib types either.
if (typeof (Array.prototype as { at?: unknown }).at !== 'function') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, 'at', {
    value: function at<T>(this: T[], n: number): T | undefined {
      const len = this.length;
      const i = n < 0 ? len + n : n;
      return i >= 0 && i < len ? this[i] : undefined;
    },
    writable: true,
    configurable: true,
  });
}

if (typeof (String.prototype as { at?: unknown }).at !== 'function') {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(String.prototype, 'at', {
    value: function at(this: string, n: number): string | undefined {
      const len = this.length;
      const i = n < 0 ? len + n : n;
      return i >= 0 && i < len ? this.charAt(i) : undefined;
    },
    writable: true,
    configurable: true,
  });
}

export {};
