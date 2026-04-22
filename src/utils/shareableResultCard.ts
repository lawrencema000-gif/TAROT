// Canvas-based 1080×1920 story-format image generator for quiz results.
//
// Zero new dependencies — uses the built-in <canvas> API so the bundle
// stays lean. Output is a PNG Blob; callers decide whether to download
// it, open it in a new tab, or (on capable WebViews) pass it to
// navigator.share() for a native share sheet.

export interface ShareCardData {
  // Large title (e.g. "Page of Wands" or "INTJ")
  title: string;
  // Short subtitle below title (e.g. archetype or type name)
  subtitle: string;
  // Italicized tagline under the subtitle
  tagline: string;
  // Longer affirmation body (auto-wrapped)
  affirmation: string;
  // Footer brand line
  brand: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;

const MYSTIC_900 = '#0a0a0f';
const MYSTIC_800 = '#1a1a24';
const GOLD = '#d4af37';
const GOLD_SOFT = 'rgba(212, 175, 55, 0.35)';
const MYSTIC_100 = '#f5f5f7';
const MYSTIC_300 = '#b8b8c4';

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, MYSTIC_800);
  bg.addColorStop(1, MYSTIC_900);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Decorative top-edge gold line
  const topLine = ctx.createLinearGradient(0, 0, WIDTH, 0);
  topLine.addColorStop(0, 'transparent');
  topLine.addColorStop(0.5, GOLD);
  topLine.addColorStop(1, 'transparent');
  ctx.fillStyle = topLine;
  ctx.fillRect(0, 140, WIDTH, 2);

  // Glow disc behind title
  const glowX = WIDTH / 2;
  const glowY = 640;
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 520);
  glow.addColorStop(0, 'rgba(212, 175, 55, 0.35)');
  glow.addColorStop(0.6, 'rgba(212, 175, 55, 0.08)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, glowY - 520, WIDTH, 1040);

  // Decorative star (✦) at top
  ctx.save();
  ctx.translate(glowX, 280);
  ctx.fillStyle = GOLD;
  ctx.font = '96px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 0, 0);
  ctx.restore();

  // Title (big)
  ctx.fillStyle = MYSTIC_100;
  ctx.font = 'bold 84px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  wrapText(ctx, data.title, glowX, 560, WIDTH - 120, 96);

  // Subtitle
  ctx.fillStyle = GOLD;
  ctx.font = '44px "Times New Roman", serif';
  wrapText(ctx, data.subtitle, glowX, 760, WIDTH - 160, 56);

  // Tagline (italic, in gold tint)
  ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.font = 'italic 40px "Times New Roman", serif';
  wrapText(ctx, `"${data.tagline}"`, glowX, 880, WIDTH - 200, 52);

  // Affirmation card
  const cardX = 90;
  const cardY = 1100;
  const cardW = WIDTH - 180;
  const cardH = 540;
  roundedRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fillStyle = 'rgba(26, 26, 36, 0.75)';
  ctx.fill();
  ctx.strokeStyle = GOLD_SOFT;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = '32px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.fillText('· AFFIRMATION', cardX + 44, cardY + 60);

  ctx.fillStyle = MYSTIC_100;
  ctx.font = '40px "Times New Roman", serif';
  ctx.textAlign = 'center';
  wrapText(ctx, `"${data.affirmation}"`, WIDTH / 2, cardY + 200, cardW - 80, 56, 6);

  // Footer brand
  ctx.fillStyle = MYSTIC_300;
  ctx.font = '30px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.brand, WIDTH / 2, HEIGHT - 140);

  ctx.fillStyle = GOLD_SOFT;
  ctx.font = '24px sans-serif';
  ctx.fillText('tarotlife.app', WIDTH / 2, HEIGHT - 90);

  // Convert to blob
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob returned null'));
    }, 'image/png', 0.95);
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const total = lines.length;
  const startY = y - ((total - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Download a blob as a file by triggering a hidden anchor click. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Release the ObjectURL after the click has been dispatched.
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

/**
 * Try the native share sheet when available (supports files on modern
 * Android Chrome/WebView and iOS 15+). Falls back to a file download.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  shareText: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], text: shareText });
      return 'shared';
    } catch {
      // user cancelled — don't fall through to download
      return 'shared';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
