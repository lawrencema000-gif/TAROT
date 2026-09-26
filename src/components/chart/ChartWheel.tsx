import { useState, useMemo, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import {
  ZODIAC_SIGNS,
  SIGN_ELEMENTS,
  type WheelChart,
  type PlanetPlacement,
  type Planet,
  type Aspect,
} from '../../types/astrology';
import { PlanetGlyphPaths, ZodiacGlyphPaths } from '../icons';
import { useT } from '../../i18n/useT';
import { localizePlanetName, localizeSignName } from '../../i18n/localizeNames';
import { CHART_TOKENS, ELEMENT_COLOR, ELEMENT_INK, ASPECT_STYLE, ASPECT_ORDER, TIGHT_ORB, withAlpha } from '../../lib/chart';
import { prefersReducedMotion } from '../../utils/motion';
import {
  lonOf, lonToSvgAngle, polar, sectorPath, spreadAngles, angleDelta, drawDashArray, norm, ROMAN,
} from './wheelGeometry';
import { WheelDetailPanel, type WheelSelection, type OverlayPlanet } from './WheelDetailPanel';
import { WheelLegend, type AspectFilter } from './WheelLegend';

export type { OverlayPlanet, AspectFilter };

/**
 * The one chart wheel.
 *
 * Phase 5c folds three wheels into this one and fixes what the audit found
 * in all of them:
 *
 *   - Geometry. The Ascendant is at 9 o'clock, houses run counter-clockwise
 *     from it, the MC sits where the chart says. Sign sectors are drawn as
 *     start + 30° sweep, so the sign on the 0/360 seam is a 30° band with
 *     its glyph in it (it used to be a 330° band with the glyph on the far
 *     side). A placement with no longitude is placed from sign + degree.
 *   - Legibility at 390px. No text under 9 units in the 360 viewBox; degree
 *     labels live in the detail panel. Coins spread on collision around the
 *     whole circle, wrap included, and a stellium fans out about its own
 *     centre. ℞ shows when the data carries it.
 *   - Interaction. Planets are buttons in a labelled group: Enter/Space
 *     select, arrows cycle, a focus ring shows where you are. Invisible
 *     44px hit circles on coins and wide transparent strokes on aspect
 *     lines. Selecting a planet lifts its aspects and its house cusp and
 *     dims the rest; selecting a line lifts both planets. The panel is
 *     aria-live. The legend lists only the aspect types drawn, and the orb
 *     filter that decides that.
 *   - Colour. Every hex comes from lib/chart's token map. No noise filter,
 *     no glow gradient, no infinite rotation; elevation is fill.
 *   - Motion. One entrance: aspect lines draw in over the deliberate
 *     duration (stroke-dashoffset, their dash pattern intact) and the coins
 *     fade in. Reduced motion skips straight to the end state.
 *
 * `chart`, `overlay` and `overlayLabel` keep their names and meaning for the
 * natal report; everything else is optional.
 */

export interface ChartWheelProps {
  chart: WheelChart;
  /** Transit, progressed, return or partner planets drawn as an outer ring. */
  overlay?: OverlayPlanet[];
  /** What the overlay is (e.g. "Today" or a date). */
  overlayLabel?: string;
  /** Which aspects to draw at first. The viewer can switch in the legend. */
  defaultAspectFilter?: AspectFilter;
  /** Offered in the panel as "Read the full interpretation" when a host has a richer view. */
  onOpenPlanet?: (placement: PlanetPlacement) => void;
  onOpenAspect?: (aspect: Aspect) => void;
  className?: string;
}

type Selection =
  | { kind: 'planet'; planet: Planet }
  | { kind: 'transit'; planet: Planet }
  | { kind: 'house'; index: number }
  | { kind: 'aspect'; planet1: Planet; planet2: Planet }
  | null;

// ─── Geometry (360 × 360 viewBox) ──────────────────────────────────
const CX = 180;
const CY = 180;
const R = {
  label: 171,      // ASC / DESC / MC / IC labels, inside the viewBox edge
  frameOuter: 168,
  frameInner: 160, // beads sit between the two frame rings
  signOuter: 156,
  signInner: 126,  // 30-unit sign ring; glyphs are 18
  overlay: 110,    // overlay coin centres
  houseNum: 96,
  planet: 76,      // natal coin centres
  aspect: 57,      // aspect line endpoints
  roseOut: 30,
  roseIn: 6,
};
const COIN_R = 11;                       // 22 units ≈ 22px at 390
const HIT_R = 22;                        // 44px-equivalent hit circle
const OVERLAY_R = 8;
const MIN_SEP = ((COIN_R * 2 + 2) / R.planet) * (180 / Math.PI);         // ≈ 18°
const MIN_SEP_OVERLAY = ((OVERLAY_R * 2 + 2) / R.overlay) * (180 / Math.PI); // ≈ 9°

const GOLD = CHART_TOKENS.gold;
const FONT_DISPLAY = 'font-display';

function samePair(a: { planet1: Planet; planet2: Planet }, p1: Planet, p2: Planet): boolean {
  return (a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1);
}

/** The drawn focus ring is for keyboard users; a tap should not leave a dashed halo behind. */
function isKeyboardFocus(el: Element): boolean {
  try {
    return typeof el.matches === 'function' ? el.matches(':focus-visible') : true;
  } catch {
    return true;
  }
}

/** The angles to label: the horizon always, the meridian only when the chart knows its MC. */
function axesFor(asc: number, mcLon: number | null): [string, number][] {
  const axes: [string, number][] = [['ASC', asc], ['DESC', asc + 180]];
  if (mcLon != null) axes.push(['MC', mcLon], ['IC', mcLon + 180]);
  return axes;
}

// ─── Component ─────────────────────────────────────────────────────
export function ChartWheel({
  chart,
  overlay,
  overlayLabel,
  defaultAspectFilter = 'all',
  onOpenPlanet,
  onOpenAspect,
  className = '',
}: ChartWheelProps) {
  const { t } = useT('app');
  const [selection, setSelection] = useState<Selection>(null);
  const [focused, setFocused] = useState<Planet | null>(null);
  const [filter, setFilter] = useState<AspectFilter>(defaultAspectFilter);
  const coinRefs = useRef(new Map<Planet, SVGGElement | null>());

  // One entrance, then never again. Reduced motion starts at the end state.
  const [drawn, setDrawn] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (drawn) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [drawn]);

  const asc = chart.ascendant;

  // Natal planets: true angle from the data, drawn angle after collision spread.
  const placed = useMemo(() => {
    const lons = chart.planets.map(lonOf);
    const trueAngles = lons.map((l) => lonToSvgAngle(l, asc));
    const drawnAngles = spreadAngles(trueAngles, MIN_SEP);
    return chart.planets
      .map((p, i) => ({ placement: p, lon: lons[i], trueAngle: trueAngles[i], angle: drawnAngles[i] }))
      .sort((a, b) => a.lon - b.lon);
  }, [chart.planets, asc]);

  const byPlanet = useMemo(() => new Map(placed.map((p) => [p.placement.planet, p])), [placed]);

  const placedOverlay = useMemo(() => {
    if (!overlay || overlay.length === 0) return [];
    const angles = spreadAngles(overlay.map((o) => lonToSvgAngle(lonOf(o), asc)), MIN_SEP_OVERLAY);
    return overlay.map((o, i) => ({ placement: o, angle: angles[i] }));
  }, [overlay, asc]);

  // Houses: the chart's twelve cusps, else equal houses from a known ASC, else none.
  const cusps = useMemo<number[] | null>(() => {
    if (chart.houses.length === 12) return chart.houses;
    if (asc == null) return null;
    return Array.from({ length: 12 }, (_, i) => norm(asc + i * 30));
  }, [chart.houses, asc]);

  const mcLon = chart.midheaven ?? (chart.houses.length === 12 ? chart.houses[9] : null);

  // Aspects under the current filter, with their line geometry.
  const tightCount = useMemo(() => chart.aspects.filter((a) => a.orb <= TIGHT_ORB[a.type]).length, [chart.aspects]);
  const lines = useMemo(() => {
    const out: { aspect: Aspect; from: { x: number; y: number }; to: { x: number; y: number }; len: number; key: string }[] = [];
    for (const a of chart.aspects) {
      if (filter === 'tight' && a.orb > TIGHT_ORB[a.type]) continue;
      const p1 = byPlanet.get(a.planet1);
      const p2 = byPlanet.get(a.planet2);
      if (!p1 || !p2) continue;
      const from = polar(CX, CY, R.aspect, p1.angle);
      const to = polar(CX, CY, R.aspect, p2.angle);
      out.push({ aspect: a, from, to, len: Math.hypot(to.x - from.x, to.y - from.y), key: `${a.planet1}-${a.planet2}-${a.type}` });
    }
    return out;
  }, [chart.aspects, byPlanet, filter]);

  const presentTypes = useMemo(
    () => ASPECT_ORDER.filter((type) => lines.some((l) => l.aspect.type === type)),
    [lines],
  );

  // Planets linked to the selection: the selected planet plus its aspect
  // partners, both ends of a selected line, or the tenants of a house.
  const linked = useMemo<Set<Planet> | null>(() => {
    if (!selection || selection.kind === 'transit') return null;
    if (selection.kind === 'planet') {
      const s = new Set<Planet>([selection.planet]);
      for (const l of lines) {
        if (l.aspect.planet1 === selection.planet) s.add(l.aspect.planet2);
        else if (l.aspect.planet2 === selection.planet) s.add(l.aspect.planet1);
      }
      return s;
    }
    if (selection.kind === 'aspect') return new Set<Planet>([selection.planet1, selection.planet2]);
    return new Set<Planet>(placed.filter((p) => p.placement.house === selection.index).map((p) => p.placement.planet));
  }, [selection, lines, placed]);

  const highlightedCusp: number | null = (() => {
    if (!selection) return null;
    if (selection.kind === 'house') return selection.index - 1;
    if (selection.kind === 'planet') {
      const h = byPlanet.get(selection.planet)?.placement.house;
      return h ? h - 1 : null;
    }
    return null;
  })();

  const lineState = (a: Aspect): 'hi' | 'dim' | 'base' => {
    if (!selection || selection.kind === 'transit') return 'base';
    if (selection.kind === 'planet') return a.planet1 === selection.planet || a.planet2 === selection.planet ? 'hi' : 'dim';
    if (selection.kind === 'aspect') return samePair(a, selection.planet1, selection.planet2) ? 'hi' : 'dim';
    return linked && (linked.has(a.planet1) || linked.has(a.planet2)) ? 'hi' : 'dim';
  };

  const toggle = useCallback((next: Exclude<Selection, null>) => {
    setSelection((prev) => {
      if (!prev || prev.kind !== next.kind) return next;
      if (prev.kind === 'planet' && next.kind === 'planet') return prev.planet === next.planet ? null : next;
      if (prev.kind === 'transit' && next.kind === 'transit') return prev.planet === next.planet ? null : next;
      if (prev.kind === 'house' && next.kind === 'house') return prev.index === next.index ? null : next;
      if (prev.kind === 'aspect' && next.kind === 'aspect') return samePair(prev, next.planet1, next.planet2) ? null : next;
      return next;
    });
  }, []);

  const focusPlanetAt = (index: number) => {
    const n = placed.length;
    if (n === 0) return;
    const target = placed[((index % n) + n) % n];
    coinRefs.current.get(target.placement.planet)?.focus();
  };

  const onCoinKey = (e: KeyboardEvent<SVGGElement>, index: number, planet: Planet) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        toggle({ kind: 'planet', planet });
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        focusPlanetAt(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        focusPlanetAt(index - 1);
        break;
      case 'Escape':
        setSelection(null);
        break;
      default:
    }
  };

  // The panel reads the selection back into data.
  const panelSelection: WheelSelection = (() => {
    if (!selection) return null;
    if (selection.kind === 'planet') {
      const p = byPlanet.get(selection.planet);
      return p ? { kind: 'planet', placement: p.placement } : null;
    }
    if (selection.kind === 'transit') {
      const o = placedOverlay.find((x) => x.placement.planet === selection.planet);
      return o ? { kind: 'transit', placement: o.placement, label: overlayLabel } : null;
    }
    if (selection.kind === 'house') {
      return { kind: 'house', index: selection.index, planets: placed.filter((p) => p.placement.house === selection.index).map((p) => p.placement) };
    }
    const a = chart.aspects.find((x) => samePair(x, selection.planet1, selection.planet2));
    return a ? { kind: 'aspect', aspect: a } : null;
  })();

  const hasRetrograde = chart.planets.some((p) => p.retrograde);
  const entranceFade = { opacity: drawn ? 1 : 0, transition: 'opacity var(--dur-slow, 300ms) var(--ease-out, ease-out)' } as const;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="relative mx-auto w-full" style={{ maxWidth: 400 }}>
        <svg viewBox="0 0 360 360" className="w-full h-auto block select-none overflow-visible" xmlns="http://www.w3.org/2000/svg">
          {/* ── Ground: flat fill, the wheel's own surface ── */}
          <circle cx={CX} cy={CY} r={R.frameInner - 1} fill={CHART_TOKENS.sunken} aria-hidden />

          {/* ── Frame: two gold hairlines with beads and cardinal diamonds ── */}
          <g aria-hidden>
            <circle cx={CX} cy={CY} r={R.frameOuter} fill="none" stroke={withAlpha(GOLD, 0.6)} strokeWidth={1} />
            <circle cx={CX} cy={CY} r={R.frameInner} fill="none" stroke={withAlpha(GOLD, 0.5)} strokeWidth={0.8} />
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = i * 10;
              if (angle % 90 === 0) return null;
              const p = polar(CX, CY, (R.frameOuter + R.frameInner) / 2, angle);
              return <circle key={`bead-${i}`} cx={p.x} cy={p.y} r={1.1} fill={GOLD} opacity={0.85} />;
            })}
            {[0, 90, 180, 270].map((angle) => {
              const p = polar(CX, CY, (R.frameOuter + R.frameInner) / 2, angle);
              return (
                <rect
                  key={`diamond-${angle}`}
                  x={-2.5} y={-2.5} width={5} height={5}
                  transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(45)`}
                  fill={GOLD}
                  stroke={withAlpha(CHART_TOKENS.goldLight, 0.9)}
                  strokeWidth={0.4}
                />
              );
            })}
          </g>

          {/* ── Sign ring: 12 × 30° sectors, start + sweep, tinted by element ── */}
          <g aria-hidden>
            {ZODIAC_SIGNS.map((sign, i) => {
              const start = lonToSvgAngle(i * 30, asc);
              const mid = polar(CX, CY, (R.signOuter + R.signInner) / 2, start - 15);
              const element = SIGN_ELEMENTS[sign];
              return (
                <g key={`sign-${sign}`}>
                  <path
                    d={sectorPath(CX, CY, R.signInner, R.signOuter, start, -30)}
                    fill={withAlpha(ELEMENT_COLOR[element], 0.12)}
                    stroke={withAlpha(GOLD, 0.2)}
                    strokeWidth={0.5}
                  />
                  <g
                    transform={`translate(${(mid.x - 9).toFixed(2)} ${(mid.y - 9).toFixed(2)}) scale(${(18 / 32).toFixed(4)})`}
                    stroke={ELEMENT_INK[element]}
                    strokeWidth={2.4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <ZodiacGlyphPaths sign={sign} />
                  </g>
                </g>
              );
            })}
            {/* Degree ticks every 5°, longer and gold on sign boundaries */}
            {Array.from({ length: 72 }).map((_, i) => {
              const deg = i * 5;
              const boundary = deg % 30 === 0;
              const angle = lonToSvgAngle(deg, asc);
              const p1 = polar(CX, CY, R.signInner, angle);
              const p2 = polar(CX, CY, R.signInner - (boundary ? 8 : 4), angle);
              return (
                <line
                  key={`tick-${deg}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={boundary ? GOLD : CHART_TOKENS.ink100}
                  strokeOpacity={boundary ? 0.9 : 0.35}
                  strokeWidth={boundary ? 1 : 0.5}
                />
              );
            })}
          </g>

          {/* ── Houses: spokes, a highlighted sector, numerals ── */}
          {cusps && (
            <g>
              {highlightedCusp !== null && (
                <path
                  aria-hidden
                  d={sectorPath(
                    CX, CY, R.aspect, R.signInner,
                    lonToSvgAngle(cusps[highlightedCusp], asc),
                    -norm(cusps[(highlightedCusp + 1) % 12] - cusps[highlightedCusp]),
                  )}
                  fill={withAlpha(GOLD, 0.07)}
                  style={{ transition: 'opacity var(--dur-base, 220ms) var(--ease-standard, ease)' }}
                />
              )}
              {cusps.map((cusp, i) => {
                const angle = lonToSvgAngle(cusp, asc);
                const a = polar(CX, CY, R.signInner, angle);
                const b = polar(CX, CY, R.roseOut, angle);
                const angular = i % 3 === 0;
                const hi = highlightedCusp === i;
                return (
                  <line
                    key={`spoke-${i}`}
                    aria-hidden
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={hi ? CHART_TOKENS.goldLight : angular ? withAlpha(GOLD, 0.55) : withAlpha(CHART_TOKENS.ink100, 0.14)}
                    strokeWidth={hi ? 1.6 : angular ? 1.1 : 0.5}
                  />
                );
              })}
              {cusps.map((cusp, i) => {
                const span = norm(cusps[(i + 1) % 12] - cusp) || 30;
                const angle = lonToSvgAngle(cusp + span / 2, asc);
                const pos = polar(CX, CY, R.houseNum, angle);
                const angular = i % 3 === 0;
                const hi = highlightedCusp === i;
                const houseIndex = i + 1;
                return (
                  <g
                    key={`house-${i}`}
                    onClick={() => toggle({ kind: 'house', index: houseIndex })}
                    style={{ cursor: 'pointer' }}
                    aria-hidden
                  >
                    <circle cx={pos.x} cy={pos.y} r={16} fill="transparent" />
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={angular ? 11 : 9}
                      fontStyle="italic"
                      fontWeight={angular || hi ? 600 : 400}
                      fill={hi ? CHART_TOKENS.goldLight : angular ? withAlpha(GOLD, 0.9) : withAlpha(CHART_TOKENS.ink100, 0.5)}
                      className={FONT_DISPLAY}
                      style={{ letterSpacing: '0.05em', pointerEvents: 'none' }}
                    >
                      {ROMAN[i]}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ── Axes: ASC–DESC always when the ASC is known, MC–IC when the chart says where ── */}
          {asc != null && (
            <g aria-hidden>
              {axesFor(asc, mcLon).map(([label, lon]) => {
                const angle = lonToSvgAngle(lon, asc);
                const inner = polar(CX, CY, R.roseOut, angle);
                const outer = polar(CX, CY, R.signInner, angle);
                const star = polar(CX, CY, R.signInner + 3, angle);
                const text = polar(CX, CY, R.label, angle);
                return (
                  <g key={label}>
                    <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={withAlpha(GOLD, 0.45)} strokeWidth={0.9} strokeDasharray="2 4" />
                    <path
                      d="M 0 -4.5 L 1.1 -1.1 L 4.5 0 L 1.1 1.1 L 0 4.5 L -1.1 1.1 L -4.5 0 L -1.1 -1.1 Z"
                      transform={`translate(${star.x.toFixed(2)} ${star.y.toFixed(2)})`}
                      fill={GOLD}
                      stroke={withAlpha(CHART_TOKENS.goldLight, 0.9)}
                      strokeWidth={0.4}
                    />
                    <text
                      x={text.x}
                      y={text.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={9}
                      fontStyle="italic"
                      fontWeight={500}
                      fill={withAlpha(GOLD, 0.95)}
                      className={FONT_DISPLAY}
                      style={{ letterSpacing: '0.12em' }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ── Centre rose ── */}
          <g aria-hidden style={{ pointerEvents: 'none' }}>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30;
              const long = i % 3 === 0;
              const p1 = polar(CX, CY, R.roseIn + 3, angle);
              const p2 = polar(CX, CY, long ? R.roseOut : R.roseOut - 8, angle);
              return <line key={`ray-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={withAlpha(GOLD, 0.35)} strokeWidth={long ? 0.8 : 0.4} strokeLinecap="round" />;
            })}
            <circle cx={CX} cy={CY} r={R.roseOut - 3} fill="none" stroke={withAlpha(GOLD, 0.18)} strokeWidth={0.5} />
            <circle cx={CX} cy={CY} r={R.roseIn + 3} fill="none" stroke={withAlpha(GOLD, 0.35)} strokeWidth={0.6} />
            <circle cx={CX} cy={CY} r={R.roseIn - 1} fill={GOLD} />
          </g>

          {/* ── Aspect lines: typed strokes, drawn in once, linked to the selection ── */}
          <g aria-hidden>
            {lines.map(({ aspect, from, to, len, key }) => {
              const s = ASPECT_STYLE[aspect.type];
              const state = lineState(aspect);
              const tightness = 1 - Math.min(1, aspect.orb / 8);
              const baseOpacity = 0.4 + 0.45 * tightness;
              const opacity = state === 'hi' ? 0.98 : state === 'dim' ? 0.1 : baseOpacity;
              const width = state === 'hi' ? s.width + 0.9 : s.width;
              return (
                <g
                  key={key}
                  onClick={() => toggle({ kind: 'aspect', planet1: aspect.planet1, planet2: aspect.planet2 })}
                  style={{ cursor: 'pointer' }}
                >
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={s.color}
                    strokeWidth={width}
                    strokeOpacity={opacity}
                    strokeLinecap="round"
                    strokeDasharray={drawDashArray(len, s.dash)}
                    style={{
                      strokeDashoffset: drawn ? 0 : len,
                      transition: 'stroke-dashoffset var(--dur-deliberate, 500ms) var(--ease-out, ease-out), stroke-opacity var(--dur-base, 220ms) var(--ease-standard, ease)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* wide transparent hit stroke */}
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth={16} strokeLinecap="round" style={{ pointerEvents: 'stroke' }} />
                </g>
              );
            })}
          </g>

          {/* ── Natal planets: coins in a labelled group of buttons ── */}
          <g role="group" aria-label={t('chartWheel.wheelAria', { defaultValue: 'Natal chart wheel' })} style={entranceFade}>
            {placed.map(({ placement: p, angle, trueAngle }, index) => {
              const pos = polar(CX, CY, R.planet, angle);
              const isSelected = selection?.kind === 'planet' && selection.planet === p.planet;
              const isLinked = !isSelected && !!linked?.has(p.planet);
              const isDim = !!linked && !linked.has(p.planet);
              const isFocused = focused === p.planet;
              const displaced = Math.abs(angleDelta(trueAngle, angle)) > 1.5;
              const planetName = localizePlanetName(p.planet);
              const signName = localizeSignName(p.sign);
              const deg = p.degree.toFixed(0);
              const label =
                (p.house
                  ? t('chartWheel.planetAria', { defaultValue: '{{planet}} in {{sign}}, {{deg}}°, house {{house}}', planet: planetName, sign: signName, deg, house: p.house })
                  : t('chartWheel.planetAriaNoHouse', { defaultValue: '{{planet}} in {{sign}}, {{deg}}°', planet: planetName, sign: signName, deg })) +
                (p.retrograde ? `, ${t('chartWheel.retrograde', { defaultValue: 'Retrograde' })}` : '');
              const faceFill = isSelected ? GOLD : CHART_TOKENS.canvas;
              const faceStroke = isSelected ? CHART_TOKENS.goldLight : isLinked ? CHART_TOKENS.goldLight : withAlpha(GOLD, 0.9);
              const glyphStroke = isSelected ? CHART_TOKENS.canvas : isLinked ? CHART_TOKENS.goldLight : CHART_TOKENS.goldLight;
              return (
                <g
                  key={`planet-${p.planet}`}
                  ref={(el) => { coinRefs.current.set(p.planet, el); }}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() => toggle({ kind: 'planet', planet: p.planet })}
                  onKeyDown={(e) => onCoinKey(e, index, p.planet)}
                  onFocus={(e) => { if (isKeyboardFocus(e.currentTarget)) setFocused(p.planet); }}
                  onBlur={() => setFocused((f) => (f === p.planet ? null : f))}
                  style={{
                    cursor: 'pointer',
                    outline: 'none',
                    opacity: isDim ? 0.4 : 1,
                    transition: 'opacity var(--dur-base, 220ms) var(--ease-standard, ease)',
                  }}
                >
                  {/* pointer to the true longitude when the coin had to move */}
                  {displaced && (() => {
                    const a = polar(CX, CY, R.planet + COIN_R + 1, angle);
                    const b = polar(CX, CY, R.signInner - 10, trueAngle);
                    return (
                      <>
                        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CHART_TOKENS.ink100} strokeOpacity={0.22} strokeWidth={0.5} />
                        <circle cx={b.x} cy={b.y} r={1} fill={CHART_TOKENS.ink100} opacity={0.5} />
                      </>
                    );
                  })()}
                  {/* hit target */}
                  <circle cx={pos.x} cy={pos.y} r={HIT_R} fill="transparent" />
                  {/* focus ring: drawn, so it shows in every browser */}
                  {isFocused && (
                    <circle cx={pos.x} cy={pos.y} r={COIN_R + 4} fill="none" stroke={CHART_TOKENS.goldLight} strokeWidth={1.2} strokeDasharray="2 2" />
                  )}
                  {/* bead ring + coin face + inner hairline */}
                  <circle cx={pos.x} cy={pos.y} r={COIN_R + 1.4} fill="none" stroke={withAlpha(GOLD, isSelected || isLinked ? 0.6 : 0.35)} strokeWidth={0.6} />
                  <circle cx={pos.x} cy={pos.y} r={COIN_R} fill={faceFill} stroke={faceStroke} strokeWidth={isSelected || isLinked ? 1.4 : 0.9} />
                  <circle cx={pos.x} cy={pos.y} r={COIN_R - 1.8} fill="none" stroke={isSelected ? withAlpha(CHART_TOKENS.canvas, 0.35) : withAlpha(GOLD, 0.3)} strokeWidth={0.4} />
                  <g
                    transform={`translate(${(pos.x - 7.5).toFixed(2)} ${(pos.y - 7.5).toFixed(2)}) scale(${(15 / 32).toFixed(4)})`}
                    stroke={glyphStroke}
                    strokeWidth={2.4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  >
                    <PlanetGlyphPaths planet={p.planet} />
                  </g>
                  {p.retrograde && (
                    <text
                      x={pos.x + COIN_R - 1}
                      y={pos.y - COIN_R + 3}
                      fontSize={9}
                      fontWeight={600}
                      fill={CHART_TOKENS.coralLight}
                      className={FONT_DISPLAY}
                      style={{ pointerEvents: 'none' }}
                    >
                      ℞
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* ── Overlay ring: transit / progressed / return / partner planets ── */}
          {placedOverlay.length > 0 && (
            <g role="group" aria-label={overlayLabel ?? t('chartWheel.transitLabel', { defaultValue: 'Transit' })} style={entranceFade}>
              <circle cx={CX} cy={CY} r={R.overlay} fill="none" stroke={withAlpha(CHART_TOKENS.blue, 0.25)} strokeWidth={0.5} strokeDasharray="1.5 3" aria-hidden />
              {placedOverlay.map(({ placement: o, angle }) => {
                const pos = polar(CX, CY, R.overlay, angle);
                const isSelected = selection?.kind === 'transit' && selection.planet === o.planet;
                const label = `${overlayLabel ?? t('chartWheel.transitLabel', { defaultValue: 'Transit' })} · ${t('chartWheel.planetAriaNoHouse', {
                  defaultValue: '{{planet}} in {{sign}}, {{deg}}°',
                  planet: localizePlanetName(o.planet),
                  sign: localizeSignName(o.sign),
                  deg: o.degree.toFixed(0),
                })}`;
                return (
                  <g
                    key={`overlay-${o.planet}`}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={isSelected}
                    onClick={() => toggle({ kind: 'transit', planet: o.planet })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle({ kind: 'transit', planet: o.planet }); }
                    }}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    <circle cx={pos.x} cy={pos.y} r={HIT_R - 4} fill="transparent" />
                    <circle cx={pos.x} cy={pos.y} r={OVERLAY_R + 1.4} fill="none" stroke={withAlpha(CHART_TOKENS.blue, 0.4)} strokeWidth={0.5} strokeDasharray="1.5 1.5" />
                    <circle cx={pos.x} cy={pos.y} r={OVERLAY_R} fill={isSelected ? CHART_TOKENS.blue : CHART_TOKENS.canvas} stroke={isSelected ? CHART_TOKENS.ink100 : CHART_TOKENS.blueInk} strokeWidth={isSelected ? 1.3 : 0.8} />
                    <g
                      transform={`translate(${(pos.x - 6).toFixed(2)} ${(pos.y - 6).toFixed(2)}) scale(${(12 / 32).toFixed(4)})`}
                      stroke={isSelected ? CHART_TOKENS.canvas : CHART_TOKENS.blueInk}
                      strokeWidth={2.6}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none' }}
                    >
                      <PlanetGlyphPaths planet={o.planet} />
                    </g>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      <WheelDetailPanel selection={panelSelection} onOpenPlanet={onOpenPlanet} onOpenAspect={onOpenAspect} />

      <WheelLegend
        presentTypes={presentTypes}
        filter={filter}
        onFilterChange={(f) => { setFilter(f); setSelection((s) => (s?.kind === 'aspect' ? null : s)); }}
        counts={{ all: chart.aspects.length, tight: tightCount }}
        hasRetrograde={hasRetrograde}
        overlayLabel={placedOverlay.length > 0 ? (overlayLabel ?? null) : undefined}
      />
    </div>
  );
}
