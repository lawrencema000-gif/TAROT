import type { SVGProps } from 'react';

/**
 * The Arcana card back.
 *
 * Every signature moment shows the back of a card before it shows a face —
 * the home deck, the shuffle, the fan you pick from, the flip, the share
 * image, onboarding — and until now the back was a placeholder image. This
 * is the designed one: gold line art on the card's own surface, an engraved
 * sun with radiating hairlines inside a double frame with corner marks, in
 * the idiom of engraved fortune-telling decks. No gradients, no glow; the
 * warmth comes from the ink.
 *
 * Drawn in `currentColor` so a caller sets the metal with `text-gold` (or a
 * quieter `text-gold/70` for a card at rest), and built as five paths rather
 * than hundreds of elements so a fanned deck of 78 costs almost nothing.
 * The geometry is generated deterministically at module load; there is no
 * randomness, so every back is identical and the SVG is stable across
 * renders.
 */

const W = 200;
const H = 300;
const CX = W / 2;
const CY = H / 2;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
const f = (n: number) => n.toFixed(1);

/** Radiating hairlines: alternate long and short, and stop short of the inner frame. */
const RAY_BURST = (() => {
  const parts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const deg = i * 5 - 90;
    const long = i % 2 === 0;
    const r0 = 48;
    const r1 = long ? 96 : 84;
    const [x0, y0] = polar(r0, deg);
    const [x1, y1] = polar(r1, deg);
    parts.push(`M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`);
  }
  return parts.join('');
})();

/** The sun: a disc ringed by sixteen flame rays, straight and wavy alternating. */
const SUN = (() => {
  const parts: string[] = [];
  const rDisc = 20;
  for (let i = 0; i < 16; i++) {
    const deg = i * 22.5 - 90;
    const straight = i % 2 === 0;
    const tip = straight ? 40 : 34;
    const [tx, ty] = polar(tip, deg);
    const [lx, ly] = polar(rDisc + 1, deg - 6);
    const [rx, ry] = polar(rDisc + 1, deg + 6);
    if (straight) {
      parts.push(`M${f(lx)} ${f(ly)}L${f(tx)} ${f(ty)}L${f(rx)} ${f(ry)}`);
    } else {
      // a wavy flame: two quadratic curves bowing outward
      const [c1x, c1y] = polar(tip * 0.62, deg - 10);
      const [c2x, c2y] = polar(tip * 0.62, deg + 10);
      parts.push(`M${f(lx)} ${f(ly)}Q${f(c1x)} ${f(c1y)} ${f(tx)} ${f(ty)}Q${f(c2x)} ${f(c2y)} ${f(rx)} ${f(ry)}`);
    }
  }
  return parts.join('');
})();

/** Four-point stars at fixed places in the field. */
function star(cx: number, cy: number, r: number): string {
  const inner = r * 0.32;
  return `M${f(cx)} ${f(cy - r)}L${f(cx + inner)} ${f(cy - inner)}L${f(cx + r)} ${f(cy)}L${f(cx + inner)} ${f(cy + inner)}L${f(cx)} ${f(cy + r)}L${f(cx - inner)} ${f(cy + inner)}L${f(cx - r)} ${f(cy)}L${f(cx - inner)} ${f(cy - inner)}Z`;
}
const STARS = [star(46, 58, 7), star(154, 70, 5), star(40, 236, 5), star(158, 244, 7), star(100, 258, 4), star(100, 42, 4)].join('');

export interface CardBackProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  /**
   * `full` draws everything; `quiet` drops the ray burst for a card at rest
   * in a stack, where seventy-eight bursts would read as noise.
   */
  detail?: 'full' | 'quiet';
  /** Paint the card's own surface behind the ink. Off when the parent already has one. */
  surface?: boolean;
}

export function CardBack({ detail = 'full', surface = true, className = '', ...props }: CardBackProps) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      aria-hidden
      focusable="false"
      {...props}
    >
      {surface && <rect x="0" y="0" width={W} height={H} rx="14" fill="rgb(var(--surface-card))" />}
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* double frame with corner marks */}
        <rect x="8" y="8" width={W - 16} height={H - 16} rx="10" strokeWidth="1.4" />
        <rect x="18" y="18" width={W - 36} height={H - 36} rx="6" strokeWidth="0.9" opacity="0.7" />
        <g strokeWidth="1.2">
          <circle cx="26" cy="26" r="4" />
          <circle cx={W - 26} cy="26" r="4" />
          <circle cx="26" cy={H - 26} r="4" />
          <circle cx={W - 26} cy={H - 26} r="4" />
        </g>
        {/* the field: radiating hairlines, a ring, the sun */}
        {detail === 'full' && <path d={RAY_BURST} strokeWidth="0.7" opacity="0.55" />}
        <circle cx={CX} cy={CY} r="52" strokeWidth="1" opacity="0.8" />
        <circle cx={CX} cy={CY} r="46" strokeWidth="0.6" opacity="0.5" strokeDasharray="1.5 3" />
        <path d={SUN} strokeWidth="1.2" />
        <circle cx={CX} cy={CY} r="20" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
        <circle cx={CX} cy={CY} r="13" strokeWidth="0.8" opacity="0.7" />
        {/* stars */}
        <path d={STARS} strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
      </g>
    </svg>
  );
}
