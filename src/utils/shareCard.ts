/**
 * Client-side PNG share-card renderer.
 *
 * Draws a 1080×1920 (IG-story format) branded vertical image on a
 * canvas and returns a Blob. No external deps — no html2canvas, no
 * jspdf, no svg-to-image — just Canvas 2D. Adds ~0 KB to the bundle.
 *
 * The card is rendered at full retina resolution so it looks crisp on
 * any Instagram / TikTok / Threads story.
 *
 * Callers pick a variant (`tarot` | `soulmate` | `quiz` | `quote`) and
 * pass per-variant props. Common header/footer (Arcana wordmark,
 * tarotlife.app URL) is shared across variants.
 *
 * Usage:
 *   const blob = await generateShareCardImage({ variant: 'tarot', ... });
 *   await navigator.share({ files: [new File([blob], 'arcana.png', { type: 'image/png' })], ... });
 *
 * On platforms without Web Share API (desktop Safari, Firefox), the
 * caller should `URL.createObjectURL(blob)` and use it as a download
 * anchor href instead.
 */

type TarotShareOpts = {
  variant: 'tarot';
  cardName: string;
  orientation: 'upright' | 'reversed';
  keyword: string;
  /** Optional URL of the card art. If provided, drawn into the card slot. */
  cardImageUrl?: string;
};

type SoulmateShareOpts = {
  variant: 'soulmate';
  score: number;
  vibe: string;
  /** Localized vibe description (1 sentence). */
  vibeDescription?: string;
  partnerName?: string;
};

type QuizShareOpts = {
  variant: 'quiz';
  quizName: string;
  resultName: string;
  affirmation?: string;
};

type QuoteShareOpts = {
  variant: 'quote';
  headline: string;
  body?: string;
};

export type ShareCardOpts = TarotShareOpts | SoulmateShareOpts | QuizShareOpts | QuoteShareOpts;

const WIDTH = 1080;
const HEIGHT = 1920;

// Arcana palette — kept in sync with tailwind.config.js `mystic`/`gold`/`cosmic-*` colors.
const COLORS = {
  bgDeep:  '#0a0a0f',
  bgMid:   '#141420',
  gold:    '#d4af37',
  goldLt:  '#f0d47a',
  mystic100: '#f5f3ff',
  mystic300: '#c4c0d9',
  mystic500: '#7a7591',
  pink:    '#f472b6',
  violet:  '#8e6eb5',
  blue:    '#60a5fa',
  green:   '#4ade80',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStarField(ctx: CanvasRenderingContext2D, seed: number) {
  // Deterministic seeded star field so the same card looks identical on re-share.
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < 180; i++) {
    const x = rand() * WIDTH;
    const y = rand() * HEIGHT;
    const size = rand() > 0.9 ? 2.5 : rand() > 0.6 ? 1.4 : 0.7;
    const alpha = 0.25 + rand() * 0.45;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, seed: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, COLORS.bgDeep);
  grad.addColorStop(0.55, COLORS.bgMid);
  grad.addColorStop(1, COLORS.bgDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Soft gold aura — a radial at the top third.
  const aura = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.35, 50, WIDTH / 2, HEIGHT * 0.35, WIDTH * 0.7);
  aura.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
  aura.addColorStop(0.6, 'rgba(142, 110, 181, 0.08)');
  aura.addColorStop(1, 'rgba(10, 10, 15, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawStarField(ctx, seed);
}

function drawWordmark(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 52px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('☽ Arcana', WIDTH / 2, 150);

  ctx.fillStyle = COLORS.mystic500;
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Know yourself. One ritual a day.', WIDTH / 2, 195);
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.mystic500;
  ctx.font = '30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('tarotlife.app', WIDTH / 2, HEIGHT - 80);
}

// Multi-line word-wrap for a target max width.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

async function drawTarotVariant(ctx: CanvasRenderingContext2D, opts: TarotShareOpts) {
  // Card-art slot — draw a rounded rectangle in the middle.
  const slotW = 540;
  const slotH = 800;
  const slotX = (WIDTH - slotW) / 2;
  const slotY = 350;

  ctx.save();
  ctx.shadowColor = 'rgba(212, 175, 55, 0.35)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = COLORS.bgMid;
  roundRect(ctx, slotX, slotY, slotW, slotH, 28);
  ctx.fill();
  ctx.restore();

  // Card art (optional) — drawn inside the rounded slot.
  if (opts.cardImageUrl) {
    try {
      const img = await loadImage(opts.cardImageUrl);
      ctx.save();
      roundRect(ctx, slotX + 8, slotY + 8, slotW - 16, slotH - 16, 22);
      ctx.clip();
      if (opts.orientation === 'reversed') {
        ctx.translate(slotX + slotW / 2, slotY + slotH / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -(slotW - 16) / 2, -(slotH - 16) / 2, slotW - 16, slotH - 16);
      } else {
        ctx.drawImage(img, slotX + 8, slotY + 8, slotW - 16, slotH - 16);
      }
      ctx.restore();
    } catch {
      /* image failed — slot stays as a dark rect */
    }
  }

  // Gold border ring.
  ctx.save();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;
  roundRect(ctx, slotX, slotY, slotW, slotH, 28);
  ctx.stroke();
  ctx.restore();

  // Orientation pill above card name.
  const pillY = slotY + slotH + 60;
  ctx.fillStyle = opts.orientation === 'reversed' ? 'rgba(244, 114, 182, 0.15)' : 'rgba(74, 222, 128, 0.15)';
  ctx.strokeStyle = opts.orientation === 'reversed' ? 'rgba(244, 114, 182, 0.4)' : 'rgba(74, 222, 128, 0.4)';
  ctx.lineWidth = 2;
  const pillW = 180;
  const pillX = (WIDTH - pillW) / 2;
  roundRect(ctx, pillX, pillY - 34, pillW, 44, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = opts.orientation === 'reversed' ? COLORS.pink : COLORS.green;
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.orientation === 'reversed' ? 'REVERSED' : 'UPRIGHT', WIDTH / 2, pillY - 4);

  // Card name.
  ctx.fillStyle = COLORS.mystic100;
  ctx.font = 'bold 72px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.cardName, WIDTH / 2, pillY + 80);

  // Keyword.
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'italic 40px Georgia, "Times New Roman", serif';
  ctx.fillText(`“${opts.keyword}”`, WIDTH / 2, pillY + 150);
}

function drawSoulmateVariant(ctx: CanvasRenderingContext2D, opts: SoulmateShareOpts) {
  // Top eyebrow.
  ctx.fillStyle = COLORS.pink;
  ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  const eyebrow = opts.partnerName ? `You & ${opts.partnerName}` : 'Your compatibility';
  ctx.fillText(eyebrow.toUpperCase(), WIDTH / 2, 420);

  // Big score circle with gradient.
  const cx = WIDTH / 2;
  const cy = 820;
  const r = 260;

  ctx.save();
  ctx.shadowColor = 'rgba(212, 175, 55, 0.35)';
  ctx.shadowBlur = 80;
  const scoreGrad = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy, r);
  scoreGrad.addColorStop(0, 'rgba(212, 175, 55, 0.2)');
  scoreGrad.addColorStop(1, 'rgba(142, 110, 181, 0.08)');
  ctx.fillStyle = scoreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // The number itself.
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 260px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(opts.score), cx, cy + 10);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLORS.mystic300;
  ctx.font = '34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('out of 100', cx, cy + r + 60);

  // Vibe chip.
  ctx.fillStyle = 'rgba(244, 114, 182, 0.15)';
  ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
  ctx.lineWidth = 2;
  const chipW = 360;
  const chipX = (WIDTH - chipW) / 2;
  roundRect(ctx, chipX, cy + r + 100, chipW, 70, 35);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.pink;
  ctx.font = '600 38px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(opts.vibe.toUpperCase(), cx, cy + r + 150);

  // Optional vibe description wrapped.
  if (opts.vibeDescription) {
    ctx.fillStyle = COLORS.mystic300;
    ctx.font = '36px Georgia, "Times New Roman", serif';
    const lines = wrapText(ctx, opts.vibeDescription, WIDTH - 160);
    let y = cy + r + 240;
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, cx, y);
      y += 48;
    }
  }
}

function drawQuizVariant(ctx: CanvasRenderingContext2D, opts: QuizShareOpts) {
  // Quiz name (eyebrow).
  ctx.fillStyle = COLORS.blue;
  ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.quizName.toUpperCase(), WIDTH / 2, 440);

  // Result name (big).
  ctx.fillStyle = COLORS.mystic100;
  ctx.font = 'bold 100px Georgia, "Times New Roman", serif';
  const nameLines = wrapText(ctx, opts.resultName, WIDTH - 120);
  let y = 620;
  for (const line of nameLines.slice(0, 2)) {
    ctx.fillText(line, WIDTH / 2, y);
    y += 110;
  }

  // Affirmation.
  if (opts.affirmation) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'italic 44px Georgia, "Times New Roman", serif';
    const lines = wrapText(ctx, `“${opts.affirmation}”`, WIDTH - 160);
    y = Math.max(y + 60, 1000);
    for (const line of lines.slice(0, 5)) {
      ctx.fillText(line, WIDTH / 2, y);
      y += 60;
    }
  }
}

function drawQuoteVariant(ctx: CanvasRenderingContext2D, opts: QuoteShareOpts) {
  ctx.fillStyle = COLORS.mystic100;
  ctx.font = 'bold 96px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  const hLines = wrapText(ctx, opts.headline, WIDTH - 120);
  let y = 620;
  for (const line of hLines.slice(0, 3)) {
    ctx.fillText(line, WIDTH / 2, y);
    y += 108;
  }

  if (opts.body) {
    ctx.fillStyle = COLORS.mystic300;
    ctx.font = '44px Georgia, "Times New Roman", serif';
    const bLines = wrapText(ctx, opts.body, WIDTH - 160);
    y = Math.max(y + 60, 1100);
    for (const line of bLines.slice(0, 6)) {
      ctx.fillText(line, WIDTH / 2, y);
      y += 60;
    }
  }
}

function simpleSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

/**
 * Render the share card to an ImageBitmap-friendly canvas and return
 * a PNG Blob. Pure client-side, no network.
 */
export async function generateShareCardImage(opts: ShareCardOpts): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  // Deterministic star seed so a given card re-shares identically.
  const seedKey =
    opts.variant === 'tarot'
      ? `${opts.cardName}-${opts.orientation}`
      : opts.variant === 'soulmate'
      ? `${opts.score}-${opts.vibe}`
      : opts.variant === 'quiz'
      ? `${opts.quizName}-${opts.resultName}`
      : opts.headline;

  drawBackground(ctx, simpleSeed(seedKey));
  drawWordmark(ctx);

  if (opts.variant === 'tarot') await drawTarotVariant(ctx, opts);
  else if (opts.variant === 'soulmate') drawSoulmateVariant(ctx, opts);
  else if (opts.variant === 'quiz') drawQuizVariant(ctx, opts);
  else drawQuoteVariant(ctx, opts);

  drawFooter(ctx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png', 0.95);
  });
}

/**
 * Convenience wrapper that:
 *   1. Generates the image,
 *   2. Tries navigator.share with the file (works on mobile Safari/Chrome),
 *   3. Falls back to download if share isn't supported.
 *
 * Returns 'shared' | 'downloaded' | 'copied'. `copied` is never returned
 * here but kept for symmetry with text-share call sites.
 */
export async function shareOrDownloadCard(
  opts: ShareCardOpts,
  fileName: string,
  fallbackText: string,
): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const blob = await generateShareCardImage(opts);
    const file = new File([blob], fileName, { type: 'image/png' });

    // Prefer Web Share with file payload.
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: fallbackText, title: 'Arcana' });
        return 'shared';
      } catch (e) {
        // User cancelled OR platform rejected — fall through to download.
        if ((e as Error).name === 'AbortError') return 'failed';
      }
    }

    // Fallback: trigger a download anchor.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch (e) {
    console.error('[shareCard] generation failed:', e);
    return 'failed';
  }
}
