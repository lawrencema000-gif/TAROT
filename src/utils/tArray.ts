/**
 * Read a list from the locale files, and always get a list back.
 *
 * `t(key, { returnObjects: true, defaultValue: [...] })` does not promise an
 * array. When the key is missing, i18next hands the defaultValue back through
 * its own copy; the dev `saveMissing` path used to write that array into the
 * resource store, from which the next read returned `{ "0": …, "1": … }`. The
 * `.map` that followed then threw inside a render — the I Ching, Feng Shui
 * and quiz result screens all died this way on the dev server, and the same
 * shape is latent in production for any key a translation carries as an
 * object. This is the one place that knows about it.
 *
 * `t` may be the hook's `t` or `i18n.t`; pass `{ ns }` through `options` for
 * the latter.
 */
export type TLike = (key: string, options?: Record<string, unknown>) => unknown;

export function tArray<T = string>(
  t: TLike,
  key: string,
  fallback: readonly T[],
  options?: Record<string, unknown>,
): T[] {
  let v: unknown;
  try {
    v = t(key, { ...options, returnObjects: true, defaultValue: fallback });
  } catch {
    v = undefined;
  }
  if (Array.isArray(v)) return v as T[];
  // A list that came back as an object with index keys is a list that was
  // stored by index; put it back in order rather than dropping it.
  if (v && typeof v === 'object') {
    const keys = Object.keys(v as Record<string, unknown>);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => (v as Record<string, T>)[k]);
    }
  }
  return [...fallback];
}
