import { describe, it, expect } from 'vitest';
import { transformUrl, CARD_BACK_WIDTHS, BACKGROUND_WIDTH } from './imageUrl';

/**
 * What the image transform actually returns, not the URL it is asked with
 * (p8 F45). A width-only request in Supabase's default `cover` mode keeps
 * the source's full height: the 1024×1536 card back at width 200 came back
 * 200×1536, a strip of its middle. This asks the real endpoint for the
 * stored stock files (public buckets) through transformUrl and reads the
 * size out of the image header.
 *
 * Network, so opt-in: ARCANA_NETWORK_TESTS=1 npx vitest run src/utils/imageUrl.geometry.test.ts
 */

const ORIGIN = 'https://ulzlthhkqjuohzjangcq.supabase.co';
const DIR = '7bc78b43-0626-4dae-856b-baa1e22ff315';

/** Width × height from a WebP (VP8 / VP8L / VP8X), PNG or JPEG header. */
function imageSize(b: Uint8Array): { w: number; h: number; type: string } {
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));
  const le = (o: number, n: number) => b.subarray(o, o + n).reduceRight((acc, x) => acc * 256 + x, 0);
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X') return { w: 1 + le(24, 3), h: 1 + le(27, 3), type: 'webp' };
    if (chunk === 'VP8 ') return { w: le(26, 2) & 0x3fff, h: le(28, 2) & 0x3fff, type: 'webp' };
    if (chunk === 'VP8L') {
      const bits = le(21, 4);
      return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1, type: 'webp' };
    }
  }
  if (b[0] === 0x89 && ascii(1, 3) === 'PNG') {
    const be = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
    return { w: be(16), h: be(20), type: 'png' };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length) {
      const marker = b[o + 1];
      const len = (b[o + 2] << 8) | b[o + 3];
      if (marker >= 0xc0 && marker <= 0xc3) return { w: (b[o + 7] << 8) | b[o + 8], h: (b[o + 5] << 8) | b[o + 6], type: 'jpeg' };
      o += 2 + len;
    }
  }
  throw new Error('unknown image format');
}

async function sizeOf(url: string) {
  const res = await fetch(url, { headers: { Accept: 'image/webp,image/*' } });
  expect(res.status, url).toBe(200);
  return imageSize(new Uint8Array(await res.arrayBuffer()));
}

describe.skipIf(process.env.ARCANA_NETWORK_TESTS !== '1')('the image transform keeps the aspect (p8 F45)', () => {
  it('a card back (1024×1536, 2:3) comes back 2:3 at every rendition width', async () => {
    for (const w of CARD_BACK_WIDTHS) {
      const s = await sizeOf(transformUrl(ORIGIN, 'card-backs', `${DIR}/card_back_1768047025411.png`, w, 75));
      expect(s.w).toBe(w);
      expect(s.h).toBe(Math.round((w * 1536) / 1024));
    }
  }, 30_000);

  it('a background (2048×3072) comes back at its own aspect, BACKGROUND_WIDTH wide', async () => {
    const s = await sizeOf(transformUrl(ORIGIN, 'backgrounds', `${DIR}/background_1768048480582.png`, BACKGROUND_WIDTH, 55));
    expect(s.w).toBe(BACKGROUND_WIDTH);
    expect(s.h).toBe(Math.round((BACKGROUND_WIDTH * 3072) / 2048));
  }, 30_000);
});
