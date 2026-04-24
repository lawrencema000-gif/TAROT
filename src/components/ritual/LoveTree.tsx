import { motion } from 'framer-motion';
import type { AttachmentInfo } from '../../data/loveTree';

/**
 * Stylized SVG tree that morphs per attachment type.
 *
 * Four visual parameters drive the render (tuned in `loveTree.ts`
 * per-type):
 *   - trunkLean: integer degrees, rotates the whole trunk+canopy group
 *   - branchSpread: 'open' | 'tall' | 'sparse' | 'split' — controls
 *     the canopy path.
 *   - leafDensity: 0..1, number of seeded leaf circles drawn.
 *   - rootDepth: 'deep' | 'medium' | 'shallow' — length of the below-
 *     ground root strokes.
 *   - accentColor: used for canopy glow + leaf tint.
 *
 * Hand-crafted SVG, no deps. framer-motion animates the canopy
 * scale-in and the leaves fade-stagger for a ~1.2s reveal.
 */
interface LoveTreeProps {
  tree: AttachmentInfo['tree'];
}

// Deterministic pseudo-random so the same type always produces the
// same tree (no jitter between renders on re-visit).
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function CanopyPath({ spread }: { spread: AttachmentInfo['tree']['branchSpread'] }) {
  // Four distinct silhouettes — each hand-tuned cubic-bezier paths.
  if (spread === 'open') {
    // Balanced, wide canopy — secure.
    return (
      <path
        d="M 150 160 C 70 150, 30 110, 55 60 C 90 20, 150 30, 150 75 C 150 30, 210 20, 245 60 C 270 110, 230 150, 150 160 Z"
        fill="currentColor"
        opacity="0.28"
      />
    );
  }
  if (spread === 'tall') {
    // Branches reaching too high / long — anxious.
    return (
      <path
        d="M 150 160 C 100 140, 70 90, 80 40 C 100 0, 135 5, 150 45 C 165 5, 200 0, 220 40 C 230 90, 200 140, 150 160 Z"
        fill="currentColor"
        opacity="0.25"
      />
    );
  }
  if (spread === 'sparse') {
    // Pruned, strong but bare — avoidant.
    return (
      <g>
        <ellipse cx="100" cy="95" rx="28" ry="34" fill="currentColor" opacity="0.18" />
        <ellipse cx="200" cy="95" rx="28" ry="34" fill="currentColor" opacity="0.18" />
        <ellipse cx="150" cy="55" rx="26" ry="30" fill="currentColor" opacity="0.18" />
      </g>
    );
  }
  // 'split' — canopy splitting two ways, fearful.
  return (
    <g>
      <path
        d="M 150 160 C 70 150, 30 100, 60 50 C 90 20, 140 30, 145 70 L 145 130 L 150 130 L 155 130 L 155 70 C 160 30, 210 20, 240 50 C 270 100, 230 150, 150 160 Z"
        fill="currentColor"
        opacity="0.22"
      />
    </g>
  );
}

function Leaves({ density, spread, color }: { density: number; spread: AttachmentInfo['tree']['branchSpread']; color: string }) {
  // Scatter leaf circles inside the canopy region for the given density.
  const count = Math.round(36 * density);
  const rand = seededRand(density * 1000 + spread.length * 37);

  // Canopy bounding regions per spread — each is a rough ellipse(s).
  const regions: Array<{ cx: number; cy: number; rx: number; ry: number }> =
    spread === 'open'
      ? [{ cx: 150, cy: 95, rx: 100, ry: 70 }]
      : spread === 'tall'
      ? [{ cx: 150, cy: 80, rx: 80, ry: 85 }]
      : spread === 'sparse'
      ? [
          { cx: 100, cy: 95, rx: 28, ry: 34 },
          { cx: 200, cy: 95, rx: 28, ry: 34 },
          { cx: 150, cy: 55, rx: 26, ry: 30 },
        ]
      : [
          { cx: 110, cy: 90, rx: 50, ry: 55 },
          { cx: 190, cy: 90, rx: 50, ry: 55 },
        ];

  const leaves = Array.from({ length: count }, (_, i) => {
    const region = regions[i % regions.length];
    // Randomly sample inside the ellipse via rejection (quick).
    let x = 0, y = 0;
    for (let t = 0; t < 8; t++) {
      const rx = (rand() * 2 - 1);
      const ry = (rand() * 2 - 1);
      if (rx * rx + ry * ry <= 1) {
        x = region.cx + rx * region.rx;
        y = region.cy + ry * region.ry;
        break;
      }
    }
    return { x, y, size: 2.5 + rand() * 2.5, delay: i * 0.015 };
  });

  return (
    <g>
      {leaves.map((leaf, i) => (
        <motion.circle
          key={i}
          cx={leaf.x}
          cy={leaf.y}
          r={leaf.size}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 + leaf.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </g>
  );
}

function Roots({ depth }: { depth: AttachmentInfo['tree']['rootDepth'] }) {
  const rootY = depth === 'deep' ? 360 : depth === 'medium' ? 330 : 295;
  const opacity = depth === 'deep' ? 0.7 : depth === 'medium' ? 0.55 : 0.35;
  return (
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={opacity}>
      <motion.path
        d={`M 150 260 L 130 ${rootY - 20} L 110 ${rootY}`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      />
      <motion.path
        d={`M 150 260 L 170 ${rootY - 20} L 190 ${rootY}`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.35 }}
      />
      <motion.path
        d={`M 150 260 L 150 ${rootY + 10}`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      />
      <motion.path
        d={`M 130 ${rootY - 20} L 95 ${rootY - 5}`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.55 }}
      />
      <motion.path
        d={`M 170 ${rootY - 20} L 205 ${rootY - 5}`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      />
    </g>
  );
}

export function LoveTree({ tree }: LoveTreeProps) {
  return (
    <div className="flex justify-center">
      <motion.svg
        viewBox="0 0 300 400"
        className="w-full max-w-xs h-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Soft canopy aura */}
        <motion.circle
          cx="150"
          cy="95"
          r="140"
          fill={tree.accentColor}
          opacity="0.06"
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Ground line */}
        <line x1="30" y1="265" x2="270" y2="265" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Roots below the ground */}
        <Roots depth={tree.rootDepth} />

        {/* Trunk + canopy group — leans per type */}
        <motion.g
          style={{ transformOrigin: '150px 260px' }}
          initial={{ rotate: 0, scaleY: 0.7, opacity: 0 }}
          animate={{ rotate: tree.trunkLean, scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          color={tree.accentColor}
        >
          {/* Trunk */}
          <path
            d="M 142 260 L 146 180 L 154 180 L 158 260 Z"
            fill="#3a2f24"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
          {/* Canopy silhouette */}
          <CanopyPath spread={tree.branchSpread} />
          {/* Leaves */}
          <Leaves density={tree.leafDensity} spread={tree.branchSpread} color={tree.accentColor} />
        </motion.g>
      </motion.svg>
    </div>
  );
}
