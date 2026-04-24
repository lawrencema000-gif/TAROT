import type { ZodiacSign, Planet } from '../../types/astrology';

/**
 * Raw glyph path data, shared between standalone `<ZodiacGlyph>` /
 * `<PlanetGlyph>` components and inline use inside larger SVG
 * compositions (like the natal chart wheel).
 *
 * Each entry is a React fragment of `<path>` / `<circle>` / `<line>`
 * elements, sized to a 32x32 viewBox. Render via `<ZodiacGlyphPaths
 * sign="Leo" />` inside an already-transformed <g>, e.g.
 *
 *   <g transform={`translate(${x - 11} ${y - 11}) scale(${22/32})`}
 *      stroke="#d4af37" fill="none" strokeWidth={1.6}
 *      strokeLinecap="round" strokeLinejoin="round">
 *     <ZodiacGlyphPaths sign="Leo" />
 *   </g>
 *
 * Keeps the chart SVG to a single <svg> root and avoids nested-SVG
 * quirks across WebKit and Android WebView.
 */

type PathFragment = React.ReactNode;

// ─── Zodiac glyph fragments ────────────────────────────────────────
const ZODIAC_FRAGMENTS: Record<ZodiacSign, PathFragment> = {
  Aries: (
    <>
      <path d="M 8 22 C 8 12, 10 8, 12 8 C 14.5 8, 16 10.5, 16 14 C 16 10.5, 17.5 8, 20 8 C 22 8, 24 12, 24 22" />
      <circle cx="16" cy="14" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  Taurus: (
    <>
      <circle cx="16" cy="20" r="5.5" />
      <path d="M 7 12 C 8.5 7, 12 6, 16 9 C 20 6, 23.5 7, 25 12" />
    </>
  ),
  Gemini: (
    <>
      <path d="M 9 7 L 23 7" />
      <path d="M 9 25 L 23 25" />
      <path d="M 12.5 7 L 12.5 25" />
      <path d="M 19.5 7 L 19.5 25" />
    </>
  ),
  Cancer: (
    <>
      <path d="M 7 13 C 7 8, 14 8, 17 13" />
      <circle cx="10" cy="14.2" r="2.2" fill="currentColor" stroke="none" />
      <path d="M 25 19 C 25 24, 18 24, 15 19" />
      <circle cx="22" cy="17.8" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  Leo: (
    <>
      <circle cx="13" cy="12" r="4.5" />
      <path d="M 13 16.5 C 13 22, 17 24, 21 22 C 24 20.5, 24 17, 22.5 15.5" />
    </>
  ),
  Virgo: (
    <>
      <path d="M 7 22 L 7 11 C 7 9, 8.5 8, 10 8 C 11.5 8, 13 9, 13 11 L 13 22" />
      <path d="M 13 11 C 13 9, 14.5 8, 16 8 C 17.5 8, 19 9, 19 11 L 19 22" />
      <path d="M 19 11 C 19 9, 20.5 8, 22 8 C 23.5 8, 25 9, 25 12 C 25 16, 22 19, 19 20" />
      <path d="M 21 17 C 24 17, 26 20, 24 23 C 22.5 25, 19 24, 19 22" />
    </>
  ),
  Libra: (
    <>
      <path d="M 6 21 L 26 21" />
      <path d="M 8 17 L 24 17" />
      <path d="M 8 17 C 8 12, 11 9, 16 9 C 21 9, 24 12, 24 17" />
    </>
  ),
  Scorpio: (
    <>
      <path d="M 6 22 L 6 11 C 6 9, 7.5 8, 9 8 C 10.5 8, 12 9, 12 11 L 12 22" />
      <path d="M 12 11 C 12 9, 13.5 8, 15 8 C 16.5 8, 18 9, 18 11 L 18 22" />
      <path d="M 18 11 C 18 9, 19.5 8, 21 8 C 22.5 8, 24 9, 24 11 L 24 22" />
      <path d="M 24 22 L 27 25" />
      <path d="M 24 25 L 27 25 L 27 22" />
    </>
  ),
  Sagittarius: (
    <>
      <path d="M 7 25 L 25 7" />
      <path d="M 25 7 L 17 7" />
      <path d="M 25 7 L 25 15" />
      <path d="M 11 17 L 19 25" />
    </>
  ),
  Capricorn: (
    <>
      <path d="M 6 10 L 10 22 L 14 10 L 18 22" />
      <path d="M 18 22 C 18 17, 24 17, 24 21 C 24 24, 20 25, 18 22" />
    </>
  ),
  Aquarius: (
    <>
      <path d="M 6 12 L 10 9 L 14 12 L 18 9 L 22 12 L 26 9" />
      <path d="M 6 20 L 10 17 L 14 20 L 18 17 L 22 20 L 26 17" />
    </>
  ),
  Pisces: (
    <>
      <path d="M 9 7 C 5 12, 5 20, 9 25" />
      <path d="M 23 7 C 27 12, 27 20, 23 25" />
      <path d="M 8 16 L 24 16" />
    </>
  ),
};

// ─── Planet glyph fragments ────────────────────────────────────────
const PLANET_FRAGMENTS: Record<Planet, PathFragment> = {
  Sun: (
    <>
      <circle cx="16" cy="16" r="7" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  Moon: (
    <>
      <path d="M 22 8 C 17 8, 12 12, 12 16 C 12 20, 17 24, 22 24 C 17 22, 14 19, 14 16 C 14 13, 17 10, 22 8 Z" />
    </>
  ),
  Mercury: (
    <>
      <path d="M 11 6 C 11 9, 13 11, 16 11 C 19 11, 21 9, 21 6" />
      <circle cx="16" cy="15" r="4" />
      <path d="M 16 19 L 16 26" />
      <path d="M 13 23 L 19 23" />
    </>
  ),
  Venus: (
    <>
      <circle cx="16" cy="13" r="5" />
      <path d="M 16 18 L 16 26" />
      <path d="M 13 23 L 19 23" />
    </>
  ),
  Mars: (
    <>
      <circle cx="14" cy="19" r="5" />
      <path d="M 17.5 15.5 L 24 9" />
      <path d="M 24 9 L 18 9" />
      <path d="M 24 9 L 24 15" />
    </>
  ),
  Jupiter: (
    <>
      <path d="M 9 12 C 9 8, 12 6, 15 8 C 17 9.5, 17 13, 15 15 L 11 18" />
      <path d="M 9 21 L 23 21" />
      <path d="M 19 9 L 19 24" />
    </>
  ),
  Saturn: (
    <>
      <path d="M 10 7 L 10 21 C 10 23.5, 12 25, 14 25 C 17 25, 18 22, 16 20" />
      <path d="M 7 11 L 14 11" />
      <path d="M 18 12 C 18 9, 21 8, 23 10" />
    </>
  ),
  Uranus: (
    <>
      <path d="M 9 7 L 9 19" />
      <path d="M 23 7 L 23 19" />
      <path d="M 9 13 L 23 13" />
      <path d="M 16 13 L 16 21" />
      <circle cx="16" cy="24" r="2.2" />
    </>
  ),
  Neptune: (
    <>
      <path d="M 8 8 C 8 14, 10 18, 16 18 C 22 18, 24 14, 24 8" />
      <path d="M 16 10 L 16 25" />
      <path d="M 12 22 L 20 22" />
    </>
  ),
  Pluto: (
    <>
      <path d="M 9 16 C 9 12, 12 8, 16 8 C 20 8, 23 12, 23 16" />
      <circle cx="16" cy="14" r="2.6" />
      <path d="M 16 18 L 16 26" />
      <path d="M 13 23 L 19 23" />
    </>
  ),
};

/** Inline zodiac glyph paths for use inside an outer SVG. Stroke + color
 *  are inherited from the parent `<g>`. */
export function ZodiacGlyphPaths({ sign }: { sign: ZodiacSign }) {
  return <>{ZODIAC_FRAGMENTS[sign]}</>;
}

/** Inline planet glyph paths for use inside an outer SVG. */
export function PlanetGlyphPaths({ planet }: { planet: Planet }) {
  return <>{PLANET_FRAGMENTS[planet]}</>;
}
