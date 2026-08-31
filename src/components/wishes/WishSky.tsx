import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { WISH_THEMES, type Wish } from '../../dal/wishes';

/**
 * The sky.
 *
 * Canvas rather than DOM: a few thousand stars each with a glow is nothing for
 * a canvas and death for the compositor as elements. Everything is drawn from
 * data — no sprites, no images — so the sky is sharp on any display and the
 * whole component is a few kilobytes.
 *
 * Layers, back to front:
 *   1. Deep field — fixed background specks that are not wishes, for depth.
 *   2. Constellation lines — soft, between stars sharing a theme.
 *   3. Echo lines — bright, drawn when someone echoed a wish.
 *   4. Stars — one per wish, sized by echoes, coloured by theme.
 *
 * Motion is a slow twinkle and a drift. It stops dead under
 * prefers-reduced-motion: this is a page people may sit on for a while, and a
 * permanently shimmering field is a genuine problem for some vestibular
 * conditions, not a taste question.
 */

export interface WishSkyProps {
  wishes: Wish[];
  links: { from: Wish; to: Wish }[];
  /** Highlighted and haloed — the viewer's own star. */
  myWishIds: Set<string>;
  selectedId: string | null;
  onSelect: (wish: Wish | null) => void;
}

const HUE_BY_THEME = new Map(WISH_THEMES.map((t) => [t.key, t.hue]));

/** How long a newly-arrived star takes to catch and settle. */
const IGNITE_MS = 620;

/**
 * A handful of stars arriving at once is people wishing; a hundred is the
 * sky itself loading. Only the former lights — otherwise the first fetch
 * would set off the entire field at the same instant, which is a firework,
 * not a consequence.
 */
const IGNITION_BURST_LIMIT = 3;

/** Deterministic per-star jitter, so a star behaves the same on every render. */
function noise(seed: number, salt: number): number {
  const v = Math.sin(seed * 0.7311 + salt * 3.1731) * 43758.5453;
  return v - Math.floor(v);
}

export function WishSky({ wishes, links, myWishIds, selectedId, onSelect }: WishSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const hoverRef = useRef<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /*
   * Ignition.
   *
   * Making a wish has to have a visible consequence, so a star that was
   * not in this sky a moment ago *lights*: it blooms out of nothing,
   * flares past its resting brightness, and settles into the same steady
   * point as everything around it. Roughly 600ms, because it is the
   * payoff for the one action this whole screen exists to collect.
   *
   * It rides the render loop that is already running — no second rAF, no
   * timer. The map holds a start timestamp per star and the draw pass
   * deletes each entry the moment it finishes, so it is empty again a
   * frame later and cannot grow.
   *
   * Under reduced motion no ignition is registered at all, which is the
   * honest accommodation: the star is simply there, at full brightness,
   * on the next frame. The consequence still lands — it just does not
   * move. (The comment at the top of this file is not decorative; this
   * page is one people sit on.)
   */
  const ignitions = useRef(new Map<string, number>());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const fresh: string[] = [];
    for (const w of wishes) {
      if (seen.current.has(w.id)) continue;
      seen.current.add(w.id);
      fresh.push(w.id);
    }
    if (reducedMotion || fresh.length === 0 || fresh.length > IGNITION_BURST_LIMIT) return;
    const now = performance.now();
    for (const id of fresh) ignitions.current.set(id, now);
  }, [wishes, reducedMotion]);

  /** Map a wish to pixels for the current canvas size. */
  const project = useCallback(
    (w: Wish, width: number, height: number) => ({
      x: w.starX * width,
      y: w.starY * height,
    }),
    [],
  );

  /** Deep-field specks, rebuilt only when the canvas size changes. */
  const deepFieldRef = useRef<{
    w: number;
    h: number;
    specks: { x: number; y: number; r: number; fill: string }[];
  }>({ w: -1, h: -1, specks: [] });

  /** Wishes grouped by theme — an input to the frame, not part of it. */
  const byTheme = useMemo(() => {
    const m = new Map<string, Wish[]>();
    for (const w of wishes) {
      const list = m.get(w.theme) ?? [];
      list.push(w);
      m.set(w.theme, list);
    }
    return m;
  }, [wishes]);

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const t = reducedMotion ? 0 : time / 1000;

      // ── 1. deep field ──────────────────────────────────────────────────
      // Not wishes. Depth, so a sky with three wishes in it still looks like a
      // sky rather than three dots on a rectangle.
      // These 220 specks are a pure function of (i, width, height): the same
      // 880 noise() calls and 220 rgba template strings were being redone 60
      // times a second to draw an identical result. Computed once and reused
      // until the canvas actually changes size.
      const field = deepFieldRef.current;
      if (field.w !== width || field.h !== height) {
        field.w = width;
        field.h = height;
        field.specks = Array.from({ length: 220 }, (_, i) => ({
          x: noise(i, 1) * width,
          y: noise(i, 2) * height,
          r: 0.3 + noise(i, 3) * 0.7,
          fill: `rgba(220,225,255,${0.06 + noise(i, 4) * 0.16})`,
        }));
      }
      for (const sp of field.specks) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fillStyle = sp.fill;
        ctx.fill();
      }

      // ── 2. constellation lines ─────────────────────────────────────────
      // Soft threads between near neighbours that wished for the same thing.
      // Capped by distance so the sky never turns into a mesh.
      // Grouping depends only on `wishes`, so it is memoised outside the
      // frame (see `byTheme` above) rather than rebuilt 60 times a second.
      const maxDist = Math.min(width, height) * 0.22;
      for (const [theme, group] of byTheme) {
        const hue = HUE_BY_THEME.get(theme as never) ?? 220;
        ctx.strokeStyle = `hsla(${hue}, 60%, 70%, 0.10)`;
        ctx.lineWidth = 0.6;
        // Only look a short way down the list from each star: O(n·k), not O(n²).
        for (let i = 0; i < group.length; i++) {
          const a = project(group[i], width, height);
          for (let j = i + 1; j < Math.min(i + 5, group.length); j++) {
            const b = project(group[j], width, height);
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > maxDist) continue;
            ctx.globalAlpha = 1 - d / maxDist;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // ── 3. echo lines ──────────────────────────────────────────────────
      // Someone said "I wish this for you too". These are the ones that matter,
      // so they are brighter, warmer, and gently animated along their length.
      for (const link of links) {
        const a = project(link.from, width, height);
        const b = project(link.to, width, height);
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const pulse = reducedMotion ? 0.45 : 0.35 + Math.sin(t * 0.6 + a.x * 0.01) * 0.15;
        grad.addColorStop(0, `rgba(244, 214, 104, ${pulse * 0.15})`);
        grad.addColorStop(0.5, `rgba(244, 214, 104, ${pulse})`);
        grad.addColorStop(1, `rgba(244, 214, 104, ${pulse * 0.15})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // A slight curve reads as a thread rather than a wire.
        const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.06;
        const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.06;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
      }

      // ── 4. the stars ───────────────────────────────────────────────────
      for (const w of wishes) {
        const { x, y } = project(w, width, height);
        const hue = HUE_BY_THEME.get(w.theme) ?? 220;
        const mine = myWishIds.has(w.id);
        const selected = w.id === selectedId;
        const hovered = w.id === hoverRef.current;

        // ── ignition ────────────────────────────────────────────────────
        // `lit` is a start timestamp on the rAF clock, which shares its
        // origin with performance.now(), so the two are directly
        // comparable. Absent = this star has always been here.
        //
        // Reading it as absent under reduced motion is not belt-and-braces:
        // the loop stops when the preference turns on, so an ignition that
        // was mid-flight would otherwise freeze there — a permanently
        // half-lit star.
        const lit = reducedMotion ? undefined : ignitions.current.get(w.id);
        let ignite = 1;
        if (lit !== undefined) {
          const p = (time - lit) / IGNITE_MS;
          if (p >= 1) ignitions.current.delete(w.id);
          else ignite = p > 0 ? p : 0;
        }
        // Size and brightness ease out; `flare` is the overshoot — a peak
        // just past the halfway point that decays to nothing, so the star
        // catches rather than fades up.
        const eased = ignite >= 1 ? 1 : 1 - (1 - ignite) ** 3;
        const flare = ignite >= 1 ? 0 : Math.sin(Math.PI * ignite);

        // Echoes make a star brighter and bigger — a wish others hold too.
        const base = 1.6 + Math.min(w.echoCount, 12) * 0.28;
        const twinkle = reducedMotion ? 1 : 0.82 + Math.sin(t * 1.4 + w.starSeed) * 0.18;
        const r = base * twinkle * (selected || hovered ? 1.6 : 1) * (eased + flare * 0.9);

        const glowR = r * (selected ? 9 : 6);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        const strength = Math.min(1, (w.grantedAt ? 0.5 : 0.32) * (eased + flare * 1.4));
        glow.addColorStop(0, `hsla(${hue}, 90%, 78%, ${strength})`);
        glow.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${selected || hovered ? 95 : 88}%, ${eased})`;
        ctx.fill();

        // The catch itself: one ring travelling outward and thinning to
        // nothing. It exists for less than the length of the ignition and
        // then there is no trace of it, which is the point — you saw the
        // star light, you are not left with an ornament.
        if (ignite < 1) {
          ctx.beginPath();
          ctx.arc(x, y, base * 2 + 30 * eased, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue}, 95%, 86%, ${(1 - ignite) * 0.45})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Your own stars wear a ring, so you can find yourself in a crowded sky.
        if (mine) {
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244, 214, 104, ${(selected ? 0.9 : 0.5) * eased})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // A granted wish gets a small cross-flare — the visual reward for the
        // whole feature working.
        if (w.grantedAt) {
          ctx.strokeStyle = `hsla(${hue}, 100%, 90%, ${0.55 * eased})`;
          ctx.lineWidth = 0.8;
          const f = r * 4;
          ctx.beginPath();
          ctx.moveTo(x - f, y); ctx.lineTo(x + f, y);
          ctx.moveTo(x, y - f); ctx.lineTo(x, y + f);
          ctx.stroke();
        }
      }

      if (!reducedMotion) frameRef.current = requestAnimationFrame(draw);
    },
    [wishes, byTheme, links, myWishIds, selectedId, reducedMotion, project],
  );

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  // Redraw once on resize even when motion is off, so the sky is not stale.
  //
  // Only when motion is OFF. With motion on, the render loop is already running
  // and already owns the pending frame id in this same ref — overwriting it
  // orphaned a frame that fired anyway and then re-scheduled itself, so every
  // resize event permanently DOUBLED the number of concurrent draw loops. One
  // phone rotation was enough to start compounding.
  useEffect(() => {
    if (!reducedMotion) return;
    const onResize = () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw, reducedMotion]);

  /** Nearest star within a forgiving radius — stars are small, fingers are not. */
  const hitTest = useCallback(
    (clientX: number, clientY: number): Wish | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      let best: Wish | null = null;
      let bestD = 28; // generous tap target
      for (const w of wishes) {
        const { x, y } = project(w, rect.width, rect.height);
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) { bestD = d; best = w; }
      }
      return best;
    },
    [wishes, project],
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block cursor-pointer touch-manipulation"
      onClick={(e) => onSelect(hitTest(e.clientX, e.clientY))}
      onMouseMove={(e) => {
        const hit = hitTest(e.clientX, e.clientY);
        const id = hit?.id ?? null;
        if (id !== hoverRef.current) {
          hoverRef.current = id;
          if (reducedMotion) frameRef.current = requestAnimationFrame(draw);
        }
      }}
      onMouseLeave={() => { hoverRef.current = null; }}
      role="img"
      aria-label={`A night sky of ${wishes.length} wishes. Use the list below the sky to read them.`}
    />
  );
}
