import { useEffect, useRef, useCallback, useState } from 'react';
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

  /** Map a wish to pixels for the current canvas size. */
  const project = useCallback(
    (w: Wish, width: number, height: number) => ({
      x: w.starX * width,
      y: w.starY * height,
    }),
    [],
  );

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
      for (let i = 0; i < 220; i++) {
        const x = noise(i, 1) * width;
        const y = noise(i, 2) * height;
        const r = 0.3 + noise(i, 3) * 0.7;
        const a = 0.06 + noise(i, 4) * 0.16;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,225,255,${a})`;
        ctx.fill();
      }

      // ── 2. constellation lines ─────────────────────────────────────────
      // Soft threads between near neighbours that wished for the same thing.
      // Capped by distance so the sky never turns into a mesh.
      const byTheme = new Map<string, Wish[]>();
      for (const w of wishes) {
        const list = byTheme.get(w.theme) ?? [];
        list.push(w);
        byTheme.set(w.theme, list);
      }
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

        // Echoes make a star brighter and bigger — a wish others hold too.
        const base = 1.6 + Math.min(w.echoCount, 12) * 0.28;
        const twinkle = reducedMotion ? 1 : 0.82 + Math.sin(t * 1.4 + w.starSeed) * 0.18;
        const r = base * twinkle * (selected || hovered ? 1.6 : 1);

        const glowR = r * (selected ? 9 : 6);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        const strength = w.grantedAt ? 0.5 : 0.32;
        glow.addColorStop(0, `hsla(${hue}, 90%, 78%, ${strength})`);
        glow.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${selected || hovered ? 95 : 88}%, 1)`;
        ctx.fill();

        // Your own stars wear a ring, so you can find yourself in a crowded sky.
        if (mine) {
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(244, 214, 104, ${selected ? 0.9 : 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // A granted wish gets a small cross-flare — the visual reward for the
        // whole feature working.
        if (w.grantedAt) {
          ctx.strokeStyle = `hsla(${hue}, 100%, 90%, 0.55)`;
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
    [wishes, links, myWishIds, selectedId, reducedMotion, project],
  );

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  // Redraw once on resize even when motion is off, so the sky is not stale.
  useEffect(() => {
    const onResize = () => { frameRef.current = requestAnimationFrame(draw); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

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
