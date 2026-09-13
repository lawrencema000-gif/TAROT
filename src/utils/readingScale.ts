/**
 * Reader text size.
 *
 * `--font-scale` has been declared in index.css since the design-system
 * pass — `html { font-size: calc(16px * var(--font-scale)) }` — and nothing
 * in the app ever set it. In a product whose core activity is reading,
 * there was no way to make the text bigger. This is the missing half.
 *
 * Three steps, not a slider: the difference between 0.9 and 1.15 is the
 * whole useful range on a phone, and a discrete control is something a
 * thumb can hit. Because the whole type scale is rem-based, one variable
 * moves every reading class, every heading and every control together —
 * layouts hold their proportions rather than one tier outgrowing another.
 *
 * Persisted per device in localStorage, not on the profile: it is a
 * property of the screen in your hand, not of you.
 */

export const READING_SCALES = [
  { id: 'smaller', value: 0.9 },
  { id: 'default', value: 1 },
  { id: 'larger', value: 1.15 },
] as const;

export type ReadingScaleId = (typeof READING_SCALES)[number]['id'];

const STORAGE_KEY = 'arcana:reading-scale';

function isScaleId(v: unknown): v is ReadingScaleId {
  return READING_SCALES.some((s) => s.id === v);
}

export function getReadingScale(): ReadingScaleId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isScaleId(v) ? v : 'default';
  } catch {
    return 'default';
  }
}

function apply(id: ReadingScaleId) {
  const scale = READING_SCALES.find((s) => s.id === id)?.value ?? 1;
  document.documentElement.style.setProperty('--font-scale', String(scale));
}

export function setReadingScale(id: ReadingScaleId) {
  apply(id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode or a full store: the setting still applies for this session.
  }
}

/** Call once at boot, before first paint, so the page never flashes at the wrong size. */
export function applyPersistedReadingScale() {
  if (typeof document === 'undefined') return;
  const id = getReadingScale();
  if (id !== 'default') apply(id);
}
