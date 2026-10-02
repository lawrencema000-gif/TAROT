import type { CSSProperties } from 'react';

/**
 * Three card backs fanned on the table.
 *
 * The one image the product is about. It is the hero on Home, the
 * medallion on the onboarding welcome, the preview on the pick-a-card
 * row, and the visual in the paywall — the same deck in the same fan
 * everywhere, so the app reads as one object rather than a set of icons.
 *
 * The fan opens once on mount (three cards, 60ms apart, 420ms) and then
 * holds. Nothing loops. Under reduced motion the global block collapses
 * the entrance to its final frame, so the fan simply is there.
 *
 * `back` is the user's chosen card back, or the Arcana default. Every
 * copy is one `<img>` of the same URL, decoded once. A back that is one of
 * the bundled card images (`/bundled-cards/…/<card>.webp`, 512×768) is
 * served from its 150px thumbnail at 1× and the 400px rendition at 2×: the
 * widest card here is 96px, so the full image was 157 KB of pixels nobody
 * could see. The default back is an SVG and needs no srcset.
 *
 * The deck sits on the canvas by itself. A blurred gold disc used to sit
 * behind it; it was a glow by another name, and HomeHero shows the fan
 * reads better without it.
 */

export type DeckFanSize = 'sm' | 'md' | 'lg';

export interface DeckFanProps {
  back?: string | null;
  size?: DeckFanSize;
  /** Play the opening fan on mount. Default true. */
  animate?: boolean;
  className?: string;
}

const SIZES: Record<DeckFanSize, { w: number; box: [number, number]; spread: number; drop: number; rot: number }> = {
  sm: { w: 44, box: [110, 80], spread: 22, drop: 3, rot: 12 },
  md: { w: 72, box: [180, 132], spread: 34, drop: 5, rot: 14 },
  lg: { w: 96, box: [240, 176], spread: 44, drop: 6, rot: 14 },
};

const KEYFRAMES = `@keyframes arcana-fan{from{opacity:0;transform:translate(-50%,-50%) translate(0,12px) rotate(0deg) scale(.94)}to{opacity:1;transform:translate(-50%,-50%) translate(var(--fan-x),var(--fan-y)) rotate(var(--fan-r)) scale(1)}}`;

const BUNDLED_RE = /^\/bundled-cards\/(major-arcana|minor-arcana)\/([^/]+\.webp)$/;

/**
 * The 1× source and the srcset for a card back. Only the bundled card
 * images have renditions (see src/config/bundledImages.ts); anything else
 * — the default SVG, a user upload — is used as given.
 */
export function deckFanSources(src: string): { src: string; srcSet?: string } {
  const m = BUNDLED_RE.exec(src);
  if (!m) return { src };
  const thumb = `/bundled-cards/thumb/${m[1]}/${m[2]}`;
  const full = `/bundled-cards/full/${m[1]}/${m[2]}`;
  return { src: thumb, srcSet: `${thumb} 1x, ${full} 2x` };
}

export function DeckFan({ back, size = 'md', animate = true, className = '' }: DeckFanProps) {
  const sources = deckFanSources(back || '/card-backs/default.svg');
  const s = SIZES[size];
  const fan = [
    { r: -s.rot, x: -s.spread, y: s.drop },
    { r: 0, x: 0, y: 0 },
    { r: s.rot, x: s.spread, y: s.drop },
  ];
  return (
    <div className={`relative mx-auto ${className}`} style={{ width: s.box[0], height: s.box[1] }} aria-hidden>
      <style>{KEYFRAMES}</style>
      {fan.map((f, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 aspect-[2/3] rounded-inset border border-gold/30 overflow-hidden bg-mystic-850"
          style={
            {
              width: s.w,
              zIndex: i === 1 ? 2 : 1,
              '--fan-x': `${f.x}px`,
              '--fan-y': `${f.y}px`,
              '--fan-r': `${f.r}deg`,
              transform: animate ? undefined : `translate(-50%, -50%) translate(${f.x}px, ${f.y}px) rotate(${f.r}deg)`,
              animation: animate ? `arcana-fan 420ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 60}ms both` : undefined,
            } as CSSProperties
          }
        >
          <img
            src={sources.src}
            srcSet={sources.srcSet}
            alt=""
            width={s.w}
            height={Math.round(s.w * 1.5)}
            decoding="async"
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
