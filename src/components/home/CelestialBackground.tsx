import { useRef } from 'react';

/**
 * Animated starfield + rising particle background.
 *
 * Extracted from the pre-login LandingPage (80 twinkling stars + 14
 * rising gold motes) so logged-in users can select it in Settings →
 * App Background. Fully self-contained — no external CSS needed, no
 * `.lp-root` wrapper — uses inline styles + the keyframes defined at
 * the bottom of this file via a small `<style>` tag.
 *
 * Renders at `position: fixed; inset: 0; z-index: -1` so it sits
 * behind all app content. Pointer-events disabled so it never
 * interferes with interaction. The `<style>` tag is idempotent —
 * multiple mounts just re-register the same rules.
 *
 * Respects `prefers-reduced-motion` via the global reduce-motion
 * block in index.css (the animations will be collapsed to near-zero
 * duration there).
 */

interface Star {
  x: number;
  y: number;
  sz: number;
  dur: number;
  del: number;
  bright: boolean;
}

interface Particle {
  x: number;
  sz: number;
  dur: number;
  del: number;
  drift: number;
  op: number;
}

export function CelestialBackground() {
  // Generate deterministic-ish random layout once per mount. useRef
  // keeps the positions stable across re-renders of the parent; we
  // don't want stars teleporting on every rerender.
  const stars = useRef<Star[]>(
    Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      sz: 0.4 + Math.random() * 1.8,
      dur: 2 + Math.random() * 5,
      del: Math.random() * 5,
      bright: Math.random() > 0.88,
    })),
  ).current;

  const particles = useRef<Particle[]>(
    Array.from({ length: 14 }, () => ({
      x: Math.random() * 100,
      sz: 1 + Math.random() * 2.5,
      dur: 7 + Math.random() * 14,
      del: Math.random() * 10,
      drift: -40 + Math.random() * 80,
      op: 0.1 + Math.random() * 0.35,
    })),
  ).current;

  return (
    <div className="celestial-bg" aria-hidden="true">
      {/* Deep space base + subtle gradient wash */}
      <div className="celestial-base" />

      {/* Twinkling stars */}
      <div className="celestial-stars">
        {stars.map((st, i) => (
          <div
            key={i}
            className={`celestial-star ${st.bright ? 'celestial-star-bright' : ''}`}
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: st.sz,
              height: st.sz,
              animationDuration: `${st.dur}s`,
              animationDelay: `${st.del}s`,
            }}
          />
        ))}
      </div>

      {/* Rising gold particles */}
      <div className="celestial-particles">
        {particles.map((pt, i) => (
          <div
            key={i}
            className="celestial-particle"
            style={
              {
                left: `${pt.x}%`,
                '--psize': `${pt.sz}px`,
                '--pdrift': `${pt.drift}px`,
                '--popacity': pt.op,
                animationDuration: `${pt.dur}s`,
                animationDelay: `${pt.del}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Foreground readability veil — keeps app text legible over
          the starfield without hiding the motion entirely. */}
      <div className="celestial-veil" />
    </div>
  );
}
