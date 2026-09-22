import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Elevation is fill; the small round things are on one scale.
 *
 * Phase 3 took every drop shadow and every gold bloom off the components
 * — ~120 sites in ~55 files — and put radius on a four-step scale. A rule
 * that lives only in a commit message rots in a month, so this is the
 * gate: no halo class anywhere in src, no neutral shadow outside the two
 * places that genuinely float over content, no radius off the scale.
 *
 * Each allowlist is a claim, checked: an entry that stops matching is
 * reported as stale so the list cannot quietly grow.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
}

/** Gold or coloured glows, and the two utilities that used to define them. */
const HALO =
  /\b(?:hover:|active:|group-hover:)?(?:shadow-glow(?:-md|-lg)?|shadow-gold(?:\/\d+)?|shadow-inner-glow|shadow-card(?:-hover)?|shadow-(?:fuchsia|amber|blue|mystic|violet|rose|teal|coral)-\d{3}\/\d+|shadow-\[0_0_\d+px_rgba\(212,175,55[^\]]*\]|drop-shadow-\[0_0_[^\]]*\]|glow-gold(?:-subtle)?|border-glow)(?![\w-])/g;

/** Neutral drop shadows. Allowed only where something floats over content. */
const LIFT = /\b(?:hover:|active:)?(?:shadow-(?:sm|md|lg|xl|2xl|inner)|shadow-black\/\d+|shadow-\[0_\d+px_\d+px[^\]]*\]|drop-shadow-(?:sm|md|lg|xl))(?![\w-])/g;

/**
 * Radius off the scale: 2px (`-sm`), 6px (`-md`), and 24px (`-3xl`) outside
 * a sheet. Bare `rounded` is the 4px "mark" step — inline code, checkboxes,
 * legend swatches, chat-bubble tails — and is on the scale.
 */
const OFF_SCALE = /\brounded(?:-[trbl]|-t[lr]|-b[lr])?-(?:sm|md)\b|\brounded(?:-[trbl])?-3xl\b/g;

/** Files that may carry a neutral lift: they float above the page. */
const LIFT_ALLOWED = new Set([
  'src/components/dev/DevicePreview.tsx', // a fixed dev control and its dropdown, over the app
]);

/**
 * Hero screens rebuilt wholesale in Phase 5; their brand-glyph glow goes
 * with the rebuild. A debt, not a permission: remove the entry then.
 */
const HALO_ALLOWED = new Set([
  'src/pages/AuthPage.tsx',
  'src/pages/LandingPage.tsx',
]);

/**
 * A shadow written as an inline style is invisible to the class scans.
 * `inset` rings (a selected-swatch outline) are not elevation and pass;
 * anything else must be listed here with its reason.
 */
const INLINE = /boxShadow:\s*[`'"](?!inset)|drop-shadow\(/g;
const INLINE_ALLOWED = new Set([
  'src/components/celestial/CelestialDestinedBeacon.tsx',  // a planet's glow: the star field
  'src/components/celestial/CelestialMapIntroLoader.tsx',  // the star field
  'src/components/celestial/CityInsightPanel.tsx',         // planet dots in the star field
  'src/components/dev/DevicePreview.tsx',                  // the dev frame's chrome
]);

/** Files that may use the 24px sheet radius by its numeric name. */
const SHEET_ALLOWED = new Set<string>([]);

const files = walk(SRC).map((p) => ({ path: relative(ROOT, p).replace(/\\/g, '/'), code: strip(readFileSync(p, 'utf8')) }));

function hits(re: RegExp, code: string): string[] {
  return [...code.matchAll(re)].map((m) => m[0]);
}

describe('elevation is fill', () => {
  it('no halo class survives outside the Phase 5 hero screens', () => {
    const found: string[] = [];
    const stale: string[] = [];
    for (const f of files) {
      const h = hits(HALO, f.code);
      if (HALO_ALLOWED.has(f.path)) { if (!h.length) stale.push(f.path); continue; }
      for (const x of h) found.push(`${f.path}: ${x}`);
    }
    expect(found).toEqual([]);
    expect(stale).toEqual([]);
  });

  it('no shadow hides in an inline style outside the star field', () => {
    const found: string[] = [];
    const stale: string[] = [];
    for (const f of files) {
      if (!f.path.endsWith('.tsx')) continue;
      const h = hits(INLINE, f.code);
      if (INLINE_ALLOWED.has(f.path)) { if (!h.length) stale.push(f.path); continue; }
      for (const x of h) found.push(`${f.path}: ${x}`);
    }
    expect(found).toEqual([]);
    expect(stale).toEqual([]);
  });

  it('no neutral drop shadow outside the allowlist', () => {
    const found: string[] = [];
    const stale: string[] = [];
    for (const f of files) {
      const h = hits(LIFT, f.code);
      if (LIFT_ALLOWED.has(f.path)) { if (!h.length) stale.push(f.path); continue; }
      for (const x of h) found.push(`${f.path}: ${x}`);
    }
    expect(found).toEqual([]);
    expect(stale).toEqual([]);
  });

  it('radius stays on the scale: 8 / 12 / 16 / 24 (sheets) / pill', () => {
    const found: string[] = [];
    const stale: string[] = [];
    for (const f of files) {
      if (!f.path.endsWith('.tsx')) continue;
      const h = hits(OFF_SCALE, f.code).filter((x) => !/^rounded(-[trbl])?-3xl$/.test(x) || !SHEET_ALLOWED.has(f.path));
      if (SHEET_ALLOWED.has(f.path) && !/rounded(-[trbl])?-3xl/.test(f.code)) stale.push(f.path);
      for (const x of h) found.push(`${f.path}: ${x}`);
    }
    expect(found).toEqual([]);
    expect(stale).toEqual([]);
  });

  it('the stylesheets carry no box-shadow outside the star field', () => {
    // landing.css is Phase 5 territory and keeps its own until then. The
    // celestial background draws its stars and particles with a 4px glow —
    // that is how a star is drawn, not an elevation, so `.celestial-*`
    // rules are exempt by name.
    const found: string[] = [];
    for (const f of files) {
      if (!f.path.endsWith('.css') || f.path.endsWith('landing.css')) continue;
      let selector = '';
      f.code.split('\n').forEach((line, i) => {
        if (line.includes('{')) selector = line.slice(0, line.indexOf('{')).trim();
        if (/box-shadow\s*:/.test(line) && !/celestial-/.test(selector)) {
          found.push(`${f.path}:${i + 1} (${selector || 'keyframes'})`);
        }
      });
    }
    expect(found).toEqual([]);
  });
});
