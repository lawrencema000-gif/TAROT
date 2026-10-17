import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { generateShareCardImage, type CartomancyShareOpts } from './shareCard';

/*
 * p9 Q35: a shared playing-card image drew the corner index in Cormorant
 * Garamond on a canvas. A canvas has no font-variant-numeric, so the
 * serif's default old-style figures were used and the Ten's "10" read "IO"
 * (qa-ja/34-share-ten-of-hearts.png), while the app's face (PlayingCardFace)
 * asks for lining figures and the title below already set its digits in
 * Inter (digitFontFor, p8 F80).
 *
 * jsdom has no 2D context: a recording one stands in, and every fillText is
 * kept with the font in force when it ran.
 */

type Call = { text: string; x: number; y: number; font: string };

function recordingContext() {
  const calls: Call[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif' };
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop === 'fillText') return (text: string, x: number, y: number) => calls.push({ text, x, y, font: String(target.font) });
      if (prop === 'measureText') {
        return (text: string) => ({
          width: [...text].length * 10,
          // Cormorant's cap height is lower than Inter's at the same size.
          actualBoundingBoxAscent: String(target.font).includes('Cormorant') ? 14 : 16,
          actualBoundingBoxDescent: 4,
        });
      }
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop() {} });
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  return { ctx, calls };
}

const rec = recordingContext();
const realGetContext = HTMLCanvasElement.prototype.getContext;
const realToBlob = HTMLCanvasElement.prototype.toBlob;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => rec.ctx) as unknown as typeof realGetContext;
  HTMLCanvasElement.prototype.toBlob = function toBlob(cb: BlobCallback) {
    cb(new Blob(['png'], { type: 'image/png' }));
  };
  vi.stubGlobal('Path2D', class { addPath() {} });
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = realGetContext;
  HTMLCanvasElement.prototype.toBlob = realToBlob;
  vi.unstubAllGlobals();
});

const card = (over: Partial<CartomancyShareOpts>): CartomancyShareOpts => ({
  variant: 'cartomancy',
  cardSlug: 'ten-of-hearts',
  cardName: 'ハートの10',
  suit: 'hearts',
  rank: '10',
  color: 'red',
  orientation: 'upright',
  keyword: '喜び',
  ...over,
});

/** The corner index: drawn at (24 + 9, 30 + 18) in the face's units. */
const cornerIndex = () => rec.calls.filter((c) => c.x === 33 && c.y === 48);

describe('p9 Q35 — the shared playing card’s corner index has lining figures', () => {
  it('the Ten of Hearts: "10" is set in Inter (lining), at the serif’s cap height, not in Cormorant', async () => {
    rec.calls.length = 0;
    await generateShareCardImage(card({}));
    const [ten] = cornerIndex();
    expect(ten.text).toBe('10');
    expect(ten.font).toMatch(/^600 \d+px Inter\b/);
    expect(ten.font).not.toMatch(/Cormorant/);
    // 22 px × (Cormorant cap 14 / Inter cap 16) = 19.25 → 19 px: no taller than a K on the next card.
    expect(ten.font).toMatch(/^600 19px /);
  });

  it.each([
    ['2', 'two-of-spades', 'spades'],
    ['7', 'seven-of-clubs', 'clubs'],
  ] as const)('every number rank: %s', async (rank, slug, suit) => {
    rec.calls.length = 0;
    await generateShareCardImage(card({ rank, cardSlug: slug, suit, cardName: slug }));
    expect(cornerIndex()[0]).toMatchObject({ text: rank });
    expect(cornerIndex()[0].font).toMatch(/ Inter\b/);
  });

  it('a court card keeps the serif: K in Cormorant Garamond', async () => {
    rec.calls.length = 0;
    await generateShareCardImage(card({ rank: 'king', cardSlug: 'king-of-hearts', cardName: 'ハートのキング' }));
    const [king] = cornerIndex();
    expect(king.text).toBe('K');
    expect(king.font).toBe('600 22px "Cormorant Garamond", Georgia, serif');
  });
});
