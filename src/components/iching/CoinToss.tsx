import { useEffect, useState } from 'react';

/**
 * I-Ching three-coin toss animation.
 *
 * The old I-Ching "casting" view was a Sparkles pulse + six sliding
 * horizontal bars — no coins to be seen. This component renders the
 * traditional three-coin method: each cast throws three coins into
 * the air, they spin in 3D (rotateY) and arc upward then fall back
 * down, landing with their heads/tails faces resolved.
 *
 * Visuals:
 *   - Gold coins with an engraved 乾/坤 character + ring of dots
 *   - CSS `transform-style: preserve-3d` on each coin so the two
 *     faces actually turn rather than crossfading
 *   - Cubic-bezier ease-out so the coins feel weighted, not linear
 *   - The three coins have slightly offset phases so they don't
 *     land in lockstep
 *
 * Props:
 *   active   — drives a single toss animation when toggled true
 *   results  — the final heads/tails for each of the three coins.
 *              Read only once `active` flips from false → true.
 *   duration — ms. The animation always lasts this long regardless
 *              of how many coins change face — the coins settle at
 *              the end.
 */

export type CoinFace = 'heads' | 'tails';

interface CoinTossProps {
  active: boolean;
  results?: [CoinFace, CoinFace, CoinFace];
  duration?: number;
}

export function CoinToss({ active, results = ['heads', 'heads', 'heads'], duration = 800 }: CoinTossProps) {
  const [playKey, setPlayKey] = useState(0);

  // Re-trigger the animation by incrementing a key whenever `active`
  // toggles true. This avoids the need for toggling CSS classes off
  // and back on to replay.
  useEffect(() => {
    if (active) setPlayKey((k) => k + 1);
  }, [active]);

  return (
    <div
      className="relative mx-auto flex items-center justify-center gap-4"
      style={{ perspective: '800px', width: 220, height: 120 }}
    >
      {([-1, 0, 1] as const).map((offset, idx) => {
        const finalFace = results[idx];
        const flipDeg = finalFace === 'heads' ? 1080 : 1260; // 3 vs 3.5 rotations
        // stagger slightly so coins don't land on the exact same tick
        const delay = idx * 60;
        return (
          <div
            key={`${playKey}-${idx}`}
            className="relative"
            style={{
              width: 54,
              height: 54,
              transform: `translateX(${offset * 16}px)`,
              transformStyle: 'preserve-3d',
              animation: active
                ? `coin-arc ${duration}ms cubic-bezier(0.25, 0.9, 0.3, 1.1) ${delay}ms both`
                : undefined,
              // Falling heads/tails — the rotateY terminal angle is set
              // via a CSS custom property so the same keyframe serves
              // either landing face.
              ['--coin-flip' as const]: `${flipDeg}deg`,
            }}
          >
            <CoinFaceSvg face="heads" className="coin-face-yang" />
            <CoinFaceSvg face="tails" className="coin-face-yin"  />
          </div>
        );
      })}
    </div>
  );
}

// ── Coin face render ─────────────────────────────────────────────────
// Two sibling absolutely-positioned SVGs, one flipped 180° on Y, so
// the coin has two real faces in 3D.

interface FaceProps {
  face: CoinFace;
  className?: string;
}

function CoinFaceSvg({ face, className }: FaceProps) {
  const char = face === 'heads' ? '乾' : '坤'; // heaven / earth
  return (
    <svg
      viewBox="0 0 64 64"
      className={`absolute inset-0 ${className ?? ''}`}
      style={{ backfaceVisibility: 'hidden' }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`coin-face-${face}`} cx="30%" cy="25%" r="80%">
          <stop offset="0%"  stopColor="#fbe79a" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8c6a10" />
        </radialGradient>
        <radialGradient id={`coin-edge-${face}`} cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="rgba(244,214,104,0)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0.7)" />
        </radialGradient>
      </defs>
      {/* Body */}
      <circle cx="32" cy="32" r="30" fill={`url(#coin-face-${face})`} />
      {/* Rim highlight + shadow */}
      <circle cx="32" cy="32" r="30" fill={`url(#coin-edge-${face})`} />
      {/* Outer engraved ring */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="#5f4410" strokeWidth="0.8" />
      {/* Inner engraved ring */}
      <circle cx="32" cy="32" r="18" fill="none" stroke="#5f4410" strokeWidth="0.6" />
      {/* 8 small pips around the inner ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        const cx = 32 + Math.cos(a) * 23;
        const cy = 32 + Math.sin(a) * 23;
        return <circle key={i} cx={cx} cy={cy} r="0.9" fill="#5f4410" />;
      })}
      {/* Center glyph */}
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="#5f4410"
        fontFamily="'Noto Serif SC', 'Noto Serif JP', Georgia, serif"
      >
        {char}
      </text>
      {/* Highlight sparkle */}
      <ellipse cx="22" cy="18" rx="6" ry="3" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}
