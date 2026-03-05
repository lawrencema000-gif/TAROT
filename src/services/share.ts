import type { TarotCard, ZodiacSign } from '../types';
import { generateShareUrl } from './deepLink';

export interface ShareContent {
  type: 'tarot' | 'horoscope' | 'spread';
  title: string;
  subtitle?: string;
  body?: string;
  date?: string;
}

export interface ShareOptions {
  includeAppName?: boolean;
  includeDate?: boolean;
}

function createShareCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1c1917');
  gradient.addColorStop(0.5, '#0c0a09');
  gradient.addColorStop(1, '#1c1917');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(217, 119, 6, 0.03)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number
): void {
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

  ctx.strokeStyle = 'rgba(217, 119, 6, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding + 8, padding + 8, width - padding * 2 - 16, height - padding * 2 - 16);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    font?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {}
): void {
  const { font = '16px serif', color = '#fef3c7', align = 'center', baseline = 'middle' } = options;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y, maxWidth);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: { font?: string; color?: string; align?: CanvasTextAlign } = {}
): number {
  const { font = '16px serif', color = '#d6d3d1', align = 'center' } = options;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;

  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);

  return currentY;
}

export async function generateTarotShareImage(
  card: TarotCard,
  reversed: boolean,
  options: ShareOptions = {}
): Promise<Blob> {
  const width = 600;
  const height = 800;
  const { canvas, ctx } = createShareCanvas(width, height);

  drawGradientBackground(ctx, width, height);
  drawBorder(ctx, width, height, 24);

  if (options.includeAppName) {
    drawText(ctx, 'STELLARA', width / 2, 60, width - 60, {
      font: '14px sans-serif',
      color: 'rgba(217, 119, 6, 0.6)',
    });
  }

  drawText(ctx, card.name, width / 2, 120, width - 60, {
    font: 'bold 32px serif',
    color: '#fef3c7',
  });

  if (reversed) {
    drawText(ctx, 'REVERSED', width / 2, 160, width - 60, {
      font: '12px sans-serif',
      color: '#f59e0b',
    });
  }

  const cardWidth = 180;
  const cardHeight = 300;
  const cardX = (width - cardWidth) / 2;
  const cardY = 200;

  ctx.fillStyle = 'rgba(217, 119, 6, 0.1)';
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

  drawText(ctx, card.arcana === 'major' ? 'Major Arcana' : `${card.suit}`, width / 2, cardY + cardHeight / 2 - 20, cardWidth - 20, {
    font: '14px sans-serif',
    color: 'rgba(254, 243, 199, 0.5)',
  });

  drawText(ctx, card.name.split(' ').slice(-1)[0], width / 2, cardY + cardHeight / 2 + 20, cardWidth - 20, {
    font: 'bold 24px serif',
    color: '#fef3c7',
  });

  const meaning = reversed ? card.meaningReversed : card.meaningUpright;
  wrapText(ctx, meaning, width / 2, 550, width - 80, 24, {
    font: '16px serif',
    color: '#d6d3d1',
  });

  const keywords = card.keywords.slice(0, 3).join(' • ');
  drawText(ctx, keywords, width / 2, 720, width - 60, {
    font: 'italic 14px serif',
    color: 'rgba(217, 119, 6, 0.7)',
  });

  if (options.includeDate) {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    drawText(ctx, date, width / 2, height - 40, width - 60, {
      font: '12px sans-serif',
      color: 'rgba(214, 211, 209, 0.4)',
    });
  }

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
}

export async function generateHoroscopeShareImage(
  sign: ZodiacSign,
  content: { general: string; date: string },
  options: ShareOptions = {}
): Promise<Blob> {
  const width = 600;
  const height = 700;
  const { canvas, ctx } = createShareCanvas(width, height);

  drawGradientBackground(ctx, width, height);
  drawBorder(ctx, width, height, 24);

  if (options.includeAppName) {
    drawText(ctx, 'STELLARA', width / 2, 50, width - 60, {
      font: '14px sans-serif',
      color: 'rgba(217, 119, 6, 0.6)',
    });
  }

  const signDisplay = sign.charAt(0).toUpperCase() + sign.slice(1);
  drawText(ctx, signDisplay, width / 2, 120, width - 60, {
    font: 'bold 36px serif',
    color: '#fef3c7',
  });

  drawText(ctx, 'Daily Horoscope', width / 2, 165, width - 60, {
    font: '16px sans-serif',
    color: 'rgba(217, 119, 6, 0.7)',
  });

  const formattedDate = new Date(content.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  drawText(ctx, formattedDate, width / 2, 200, width - 60, {
    font: '14px sans-serif',
    color: 'rgba(214, 211, 209, 0.6)',
  });

  ctx.fillStyle = 'rgba(217, 119, 6, 0.1)';
  ctx.fillRect(40, 240, width - 80, 380);
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.2)';
  ctx.strokeRect(40, 240, width - 80, 380);

  wrapText(ctx, content.general, width / 2, 300, width - 120, 28, {
    font: '18px serif',
    color: '#e7e5e4',
  });

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
}

export function generateShareCaption(content: ShareContent & { deepLinkId?: string }): string {
  const lines: string[] = [];

  lines.push(content.title);

  if (content.subtitle) {
    lines.push(content.subtitle);
  }

  if (content.body) {
    const truncated = content.body.length > 150 ? content.body.slice(0, 147) + '...' : content.body;
    lines.push('');
    lines.push(`"${truncated}"`);
  }

  if (content.deepLinkId) {
    const linkType = content.type === 'tarot' ? 'card' : content.type === 'spread' ? 'reading' : content.type;
    lines.push('');
    lines.push(generateShareUrl(linkType, content.deepLinkId));
  }

  lines.push('');
  lines.push('#Stellara #Tarot #Astrology');

  return lines.join('\n');
}

export async function shareToNative(
  title: string,
  text: string,
  imageBlob?: Blob
): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    const shareData: ShareData = { title, text };

    if (imageBlob && navigator.canShare) {
      const file = new File([imageBlob], 'stellara-share.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }
    }

    await navigator.share(shareData);
    return true;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Share failed:', err);
    }
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

export async function downloadImage(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

export function canShareFiles(): boolean {
  return canShare() && typeof navigator.canShare === 'function';
}
