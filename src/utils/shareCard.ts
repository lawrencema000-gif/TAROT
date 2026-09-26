/**
 * The share-card renderer.
 *
 * One canvas renderer for every "share my result" surface, replacing the
 * three that existed (this file's star-field version, shareableResultCard's
 * gold-glow version, and the dead amber one in services/share). Canvas 2D
 * only: no html2canvas, no dom-to-image, nothing added to the bundle.
 *
 * Output: a PNG blob, 1080×1920 ('story') or 1080×1080 ('square').
 *
 * Visual language, taken from tailwind.config.js rather than remembered:
 * mystic-950 → 900 vertical wash, mystic-850 panels with a mystic-700
 * hairline, ink 100/300/500, gold. Elevation is fill — no canvas shadows.
 * Titles set in Cormorant Garamond, everything else in Inter, both awaited
 * through `document.fonts.load` before the first `fillText`, with serif and
 * sans-serif as the honest fallbacks. A sparse star layer is seeded from the
 * card's content so a re-share renders identically.
 *
 * Layout is a flow, not a set of y anchors: each block is measured, placed
 * under the previous one, and the whole column is centred in the content
 * area. If the worst case still overflows, the column is scaled to fit — so
 * a four-line Japanese title can never land on top of the subtitle, and
 * nothing can reach the footer.
 *
 * Labels come from i18next; nothing user-visible is hardcoded English.
 */

import i18n from '../i18n/config';
import { cssFont, drawLines, drawTracked, measurer, roundRectPath, wrapText } from './canvasText';
import { sharePng, type ShareOutcome } from './nativeShare';

export type { ShareOutcome } from './nativeShare';

// ── Public API ──────────────────────────────────────────────────────────

export type ShareFormat = 'story' | 'square';

interface BaseShareOpts {
  /** 1080×1920 (default) or 1080×1080. */
  format?: ShareFormat;
  /** Small gold line above the content: the ritual that produced the result. */
  eyebrow?: string;
  /** A link drawn under the URL in the footer. Optional per surface. */
  deepLink?: string;
}

export type TarotShareOpts = BaseShareOpts & {
  variant: 'tarot';
  cardName: string;
  orientation: 'upright' | 'reversed';
  keyword: string;
  /** Card art, ideally the bundled 512×768 webp. Drawn at 2:3, inverted when reversed. */
  cardImageUrl?: string;
};

export type SoulmateShareOpts = BaseShareOpts & {
  variant: 'soulmate';
  /** 0–100 */
  score: number;
  vibe: string;
  vibeDescription?: string;
  partnerName?: string;
};

export type QuizShareOpts = BaseShareOpts & {
  variant: 'quiz';
  quizName: string;
  resultName: string;
  /** Rendered as a quotation, in curly quotes. */
  affirmation?: string;
};

export type QuoteShareOpts = BaseShareOpts & {
  variant: 'quote';
  headline: string;
  body?: string;
};

/**
 * The generic result card: title, subtitle, a data or tagline line (never
 * quoted — it may be "Fehu · Uruz · Thurisaz"), and an optional body panel.
 * `bodyLabel` is drawn only when supplied; an empty body draws nothing.
 */
export type ResultShareOpts = BaseShareOpts & {
  variant: 'result';
  title: string;
  subtitle?: string;
  tagline?: string;
  body?: string;
  bodyLabel?: string;
};

export type ShareCardOpts = TarotShareOpts | SoulmateShareOpts | QuizShareOpts | QuoteShareOpts | ResultShareOpts;

// ── Tokens (tailwind.config.js) ─────────────────────────────────────────

const C = {
  canvas: '#07070f',   // mystic-950
  sunken: '#101024',   // mystic-900
  surface: '#16162e',  // mystic-850
  raised: '#1f1f3a',   // mystic-800
  hairline: '#2c2c4c', // mystic-700
  ink100: '#f2f2f7',
  ink300: '#c6c6d8',
  ink500: '#8f8fae',
  gold: '#d4af37',
  coral: '#e07a5f',
  teal: '#4ecdc4',
} as const;

const DISPLAY = '"Cormorant Garamond", "Noto Serif JP", "Noto Serif KR", "Noto Serif SC", serif';
const BODY = 'Inter, "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", sans-serif';

/**
 * Radius roles at canvas scale. The card is viewed at roughly 0.36×, so the
 * 8 / 12 / 16 / 24 CSS steps become these.
 */
const R = { inset: 22, control: 33, card: 44, sheet: 66 } as const;

const BRAND_URL = 'tarotlife.app';
const FONT_WAIT_MS = 1500;

// ── Geometry per format ─────────────────────────────────────────────────

interface Geometry {
  width: number;
  height: number;
  padX: number;
  /** Type scale relative to the story ramp. */
  type: number;
  markTop: number;
  markWidth: number;
  wordmarkY: number;
  contentTop: number;
  contentBottom: number;
  taglineY: number;
  urlY: number;
  deepLinkY: number;
  lines: { title: number; subtitle: number; tagline: number; body: number; quote: number };
  tarotArt: { w: number; h: number };
}

/**
 * Story: Instagram's chrome covers roughly the top and bottom 250px, so the
 * brand sits below the progress bar and the footer ends above the reply box.
 */
const STORY: Geometry = {
  width: 1080, height: 1920, padX: 96, type: 1,
  markTop: 236, markWidth: 72, wordmarkY: 392,
  contentTop: 470, contentBottom: 1480,
  taglineY: 1548, urlY: 1604, deepLinkY: 1652,
  lines: { title: 2, subtitle: 2, tagline: 3, body: 5, quote: 5 },
  tarotArt: { w: 480, h: 720 },
};

const SQUARE: Geometry = {
  width: 1080, height: 1080, padX: 96, type: 0.82,
  markTop: 64, markWidth: 60, wordmarkY: 194,
  contentTop: 252, contentBottom: 900,
  taglineY: 948, urlY: 996, deepLinkY: 1038,
  lines: { title: 2, subtitle: 1, tagline: 2, body: 4, quote: 4 },
  tarotArt: { w: 300, h: 450 },
};

// ── Flow layout ─────────────────────────────────────────────────────────

interface TextStyle {
  font: string;
  color: string;
  lineHeight: number;
  maxLines: number;
  /** Wrap the block in curly quotes. Only for text that is a quotation. */
  quote?: boolean;
  /** Extra pixels between clusters, for a tracked label. Single-line only. */
  tracking?: number;
}

interface Op {
  height: number;
  draw: (top: number) => void;
}

/**
 * A vertical flow of measured blocks. Nothing is drawn until `render`, so a
 * flow can be measured, nested in a panel, and centred as a whole.
 */
class Flow {
  private ops: Op[] = [];

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    readonly cx: number,
    readonly width: number,
  ) {}

  get height(): number {
    return this.ops.reduce((h, op) => h + op.height, 0);
  }

  get isEmpty(): boolean {
    return this.ops.length === 0;
  }

  gap(px: number): void {
    if (this.ops.length) this.ops.push({ height: px, draw: () => {} });
  }

  /** A text block. Empty text adds nothing. Returns the line count. */
  text(raw: string, style: TextStyle): number {
    const text = raw.trim();
    if (!text) return 0;
    const shown = style.quote ? `“${text}”` : text;
    const measure = measurer(this.ctx, style.font);
    const lines = style.tracking
      ? wrapText(measure, shown.replace(/\s+/g, ' '), this.width, { maxLines: 1 })
      : wrapText(measure, shown, this.width, { maxLines: style.maxLines });
    const { ctx, cx } = this;
    this.ops.push({
      height: lines.length * style.lineHeight,
      draw: (top) => {
        ctx.font = style.font;
        ctx.fillStyle = style.color;
        if (style.tracking) {
          drawTracked(ctx, lines[0], cx, top + style.lineHeight / 2, style.tracking);
        } else {
          drawLines(ctx, lines, cx, top, style.lineHeight);
        }
      },
    });
    return lines.length;
  }

  /** A surface panel (fill + hairline) around a nested flow. */
  panel(pad: number, radius: number, build: (inner: Flow) => void): void {
    const inner = new Flow(this.ctx, this.cx, this.width - pad * 2);
    build(inner);
    if (inner.isEmpty) return;
    const { ctx, cx, width } = this;
    const height = inner.height + pad * 2;
    this.ops.push({
      height,
      draw: (top) => {
        roundRectPath(ctx, cx - width / 2, top, width, height, radius);
        ctx.fillStyle = C.surface;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.hairline;
        ctx.stroke();
        inner.render(top + pad);
      },
    });
  }

  /** A pill with a short label, centred. */
  chip(raw: string, font: string, color: string, height: number): void {
    const text = raw.trim();
    if (!text) return;
    const { ctx, cx } = this;
    ctx.font = font;
    const w = Math.min(this.width, Math.ceil(ctx.measureText(text).width) + height);
    const [line] = wrapText(measurer(ctx, font), text, w - height, { maxLines: 1 });
    this.ops.push({
      height,
      draw: (top) => {
        roundRectPath(ctx, cx - w / 2, top, w, height, height / 2);
        ctx.fillStyle = C.raised;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.hairline;
        ctx.stroke();
        ctx.font = font;
        ctx.fillStyle = color;
        drawLines(ctx, [line], cx, top, height);
      },
    });
  }

  /** Anything else: a fixed-height block with its own draw routine. */
  custom(height: number, draw: (top: number) => void): void {
    this.ops.push({ height, draw });
  }

  render(top: number): void {
    let y = top;
    for (const op of this.ops) {
      op.draw(y);
      y += op.height;
    }
  }
}

/**
 * Centre the flow in the content area; scale it down (transform only, text
 * stays vector-crisp) in the rare case the budget is still exceeded.
 */
function placeFlow(ctx: CanvasRenderingContext2D, flow: Flow, g: Geometry): void {
  const available = g.contentBottom - g.contentTop;
  const total = flow.height;
  const fit = total > available ? available / total : 1;
  const top = g.contentTop + Math.max(0, (available - total * fit) / 2);
  ctx.save();
  if (fit < 1) {
    ctx.translate(flow.cx, top);
    ctx.scale(fit, fit);
    ctx.translate(-flow.cx, -top);
  }
  flow.render(top);
  ctx.restore();
}

// ── Chrome: background, stars, brand, footer ────────────────────────────

function seedFrom(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function drawBackground(ctx: CanvasRenderingContext2D, g: Geometry, seed: number): void {
  const wash = ctx.createLinearGradient(0, 0, 0, g.height);
  wash.addColorStop(0, C.canvas);
  wash.addColorStop(1, C.sunken);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, g.width, g.height);

  // Sparse, deterministic stars: a texture, not a field.
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const count = Math.round((g.width * g.height) / 40000);
  for (let i = 0; i < count; i++) {
    const x = rand() * g.width;
    const y = rand() * g.height;
    const r = 0.8 + rand() * 1.1;
    const a = 0.1 + rand() * 0.3;
    ctx.fillStyle = `rgba(242, 242, 247, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** BrandMark.tsx, ported: viewBox 0 0 64 80, stroked in gold. */
const MARK = {
  outer: 'M 8 76 L 8 32 C 8 18, 18 8, 32 8 C 46 8, 56 18, 56 32 L 56 76 Z',
  inner: 'M 12 72 L 12 32 C 12 20, 20 12, 32 12 C 44 12, 52 20, 52 32 L 52 72',
  mountains: 'M 16 56 L 24 48 L 30 53 L 38 44 L 48 56',
  star: [
    [0, -9, 0, -3.5], [0, 9, 0, 3.5], [-9, 0, -3.5, 0], [9, 0, 3.5, 0],
    [-6.4, -6.4, -2.5, -2.5], [6.4, 6.4, 2.5, 2.5], [-6.4, 6.4, -2.5, 2.5], [6.4, -6.4, 2.5, -2.5],
  ] as const,
  rays: [[0, -2, 0, -7], [-6, -2, -9, -5], [6, -2, 9, -5]] as const,
} as const;

function drawBrandMark(ctx: CanvasRenderingContext2D, cx: number, top: number, width: number): void {
  if (typeof Path2D === 'undefined') return;
  const s = width / 64;
  ctx.save();
  ctx.translate(cx - width / 2, top);
  ctx.scale(s, s);
  ctx.strokeStyle = C.gold;
  ctx.fillStyle = C.gold;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.stroke(new Path2D(MARK.outer));
  ctx.globalAlpha = 0.55;
  ctx.stroke(new Path2D(MARK.inner));
  ctx.globalAlpha = 0.7;
  ctx.stroke(new Path2D(MARK.mountains));

  const lines = (segs: readonly (readonly [number, number, number, number])[], ox: number, oy: number) => {
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of segs) {
      ctx.moveTo(ox + x1, oy + y1);
      ctx.lineTo(ox + x2, oy + y2);
    }
    ctx.stroke();
  };
  ctx.globalAlpha = 1;
  lines(MARK.star, 32, 28);
  ctx.beginPath();
  ctx.arc(32, 28, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  lines(MARK.rays, 32, 56);
  ctx.globalAlpha = 0.6;
  for (const [x, y] of [[18, 22], [46, 22]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHeader(ctx: CanvasRenderingContext2D, g: Geometry): void {
  const cx = g.width / 2;
  drawBrandMark(ctx, cx, g.markTop, g.markWidth);
  // The wordmark as BrandWordmark.tsx sets it: Cormorant 500, tracked 0.16em.
  const size = Math.round(52 * g.type);
  ctx.font = cssFont(500, size, DISPLAY);
  ctx.fillStyle = C.gold;
  drawTracked(ctx, 'ARCANA', cx, g.wordmarkY, size * 0.16);
}

function drawFooter(ctx: CanvasRenderingContext2D, g: Geometry, deepLink?: string): void {
  const cx = g.width / 2;
  const column = g.width - g.padX * 2;

  ctx.font = cssFont(400, 28 * g.type, BODY);
  ctx.fillStyle = C.ink500;
  const tagline = i18n.t('common:app.tagline', { defaultValue: 'Know yourself. One ritual a day.' }) as string;
  drawLines(ctx, wrapText(measurer(ctx, ctx.font), tagline, column, { maxLines: 1 }), cx, g.taglineY - 20 * g.type, 40 * g.type);

  ctx.font = cssFont(500, 32 * g.type, BODY);
  ctx.fillStyle = C.gold;
  drawLines(ctx, [BRAND_URL], cx, g.urlY - 22 * g.type, 44 * g.type);

  if (deepLink) {
    const shown = deepLink.replace(/^https?:\/\//, '');
    ctx.font = cssFont(400, 26 * g.type, BODY);
    ctx.fillStyle = C.ink500;
    drawLines(ctx, wrapText(measurer(ctx, ctx.font), shown, column, { maxLines: 1 }), cx, g.deepLinkY - 18 * g.type, 36 * g.type);
  }
}

// ── Shared type ramp ────────────────────────────────────────────────────

/** Styles at the story scale; `g.type` shrinks them for the square. */
function ramp(g: Geometry) {
  const t = g.type;
  const st = (weight: number | string, size: number, family: string, color: string, lh: number, maxLines: number, extra: Partial<TextStyle> = {}): TextStyle => ({
    font: cssFont(weight, size * t, family, extra.quote === true && family === DISPLAY),
    color,
    lineHeight: Math.round(lh * t),
    maxLines,
    ...extra,
  });
  return {
    eyebrow: st(500, 30, BODY, C.gold, 40, 1, { tracking: 2 * t }),
    title: st(600, 84, DISPLAY, C.ink100, 94, g.lines.title),
    titleLg: st(600, 96, DISPLAY, C.ink100, 106, g.lines.title),
    subtitle: st(500, 38, BODY, C.ink300, 52, g.lines.subtitle),
    tagline: st(500, 46, DISPLAY, C.gold, 58, g.lines.tagline),
    keyword: st(400, 44, DISPLAY, C.gold, 56, 2),
    body: st(400, 38, BODY, C.ink100, 56, g.lines.body),
    bodyMuted: st(400, 38, BODY, C.ink300, 56, g.lines.body),
    quote: st(400, 44, DISPLAY, C.ink100, 60, g.lines.quote, { quote: true }),
    panelLabel: st(500, 28, BODY, C.gold, 36, 1, { tracking: 2 * t }),
    chipFont: cssFont(500, 28 * t, BODY),
    chipH: Math.round(52 * t),
    gap: (px: number) => Math.round(px * t),
  };
}

// ── Variants ────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('card art failed to load'));
    img.src = url;
  });
}

async function buildTarot(ctx: CanvasRenderingContext2D, flow: Flow, opts: TarotShareOpts, g: Geometry): Promise<void> {
  const r = ramp(g);
  const { w, h } = g.tarotArt;
  const inset = Math.round(10 * g.type);
  const art = opts.cardImageUrl ? await loadImage(opts.cardImageUrl).catch(() => null) : null;
  const reversed = opts.orientation === 'reversed';

  if (opts.eyebrow) {
    flow.text(opts.eyebrow, r.eyebrow);
    flow.gap(r.gap(32));
  }

  flow.custom(h, (top) => {
    const x = flow.cx - w / 2;
    roundRectPath(ctx, x, top, w, h, R.card);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.hairline;
    ctx.stroke();

    if (art) {
      ctx.save();
      roundRectPath(ctx, x + inset, top + inset, w - inset * 2, h - inset * 2, R.card - inset);
      ctx.clip();
      // Cover-fit so a non-2:3 source is cropped, never stretched.
      const iw = w - inset * 2;
      const ih = h - inset * 2;
      const scale = Math.max(iw / art.naturalWidth, ih / art.naturalHeight);
      const dw = art.naturalWidth * scale;
      const dh = art.naturalHeight * scale;
      ctx.translate(flow.cx, top + h / 2);
      if (reversed) ctx.rotate(Math.PI);
      ctx.drawImage(art, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } else {
      // No art: the name on the surface, not a fake back.
      ctx.font = cssFont(500, 40 * g.type, DISPLAY);
      ctx.fillStyle = C.ink300;
      const lines = wrapText(measurer(ctx, ctx.font), opts.cardName, w - 80, { maxLines: 3 });
      const lh = Math.round(50 * g.type);
      drawLines(ctx, lines, flow.cx, top + h / 2 - (lines.length * lh) / 2, lh);
    }
  });

  flow.gap(r.gap(40));
  flow.chip(
    reversed
      ? (i18n.t('app:tarot.reversed', { defaultValue: 'Reversed' }) as string)
      : (i18n.t('app:tarot.upright', { defaultValue: 'Upright' }) as string),
    r.chipFont,
    reversed ? C.coral : C.teal,
    r.chipH,
  );
  flow.gap(r.gap(28));
  flow.text(opts.cardName, { ...r.title, font: cssFont(600, 72 * g.type, DISPLAY), lineHeight: Math.round(82 * g.type) });
  flow.gap(r.gap(12));
  flow.text(opts.keyword, r.keyword);
}

function buildSoulmate(ctx: CanvasRenderingContext2D, flow: Flow, opts: SoulmateShareOpts, g: Geometry): void {
  const r = ramp(g);
  const score = Math.max(0, Math.min(100, Math.round(opts.score)));

  flow.text(
    opts.eyebrow ??
      (opts.partnerName
        ? (i18n.t('app:share.youAnd', { defaultValue: 'You and {{name}}', name: opts.partnerName }) as string)
        : (i18n.t('app:share.yourCompatibility', { defaultValue: 'Your compatibility' }) as string)),
    r.eyebrow,
  );
  flow.gap(r.gap(48));

  const ringR = Math.round(240 * g.type);
  const stroke = Math.round(14 * g.type);
  const ringH = ringR * 2 + stroke;
  flow.custom(ringH, (top) => {
    const cy = top + ringH / 2;
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.hairline;
    ctx.beginPath();
    ctx.arc(flow.cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    if (score > 0) {
      ctx.strokeStyle = C.gold;
      ctx.beginPath();
      ctx.arc(flow.cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score) / 100);
      ctx.stroke();
    }
    ctx.font = cssFont(600, 220 * g.type, DISPLAY);
    ctx.fillStyle = C.gold;
    drawLines(ctx, [String(score)], flow.cx, cy - 130 * g.type, 200 * g.type);
    ctx.font = cssFont(400, 32 * g.type, BODY);
    ctx.fillStyle = C.ink300;
    drawLines(ctx, [i18n.t('app:soulmate.outOf', { defaultValue: 'out of 100' }) as string], flow.cx, cy + 90 * g.type, 44 * g.type);
  });

  flow.gap(r.gap(44));
  flow.chip(opts.vibe, cssFont(500, 32 * g.type, BODY), C.gold, Math.round(60 * g.type));
  if (opts.vibeDescription) {
    flow.gap(r.gap(32));
    flow.text(opts.vibeDescription, { ...r.bodyMuted, maxLines: 3 });
  }
}

function buildQuiz(flow: Flow, opts: QuizShareOpts, g: Geometry): void {
  const r = ramp(g);
  flow.text(opts.eyebrow ?? opts.quizName, r.eyebrow);
  flow.gap(r.gap(36));
  flow.text(opts.resultName, r.titleLg);
  if (opts.affirmation) {
    flow.gap(r.gap(52));
    flow.panel(r.gap(52), R.card, (inner) => inner.text(opts.affirmation ?? '', r.quote));
  }
}

function buildQuote(flow: Flow, opts: QuoteShareOpts, g: Geometry): void {
  const r = ramp(g);
  if (opts.eyebrow) {
    flow.text(opts.eyebrow, r.eyebrow);
    flow.gap(r.gap(36));
  }
  flow.text(opts.headline, r.titleLg);
  if (opts.body) {
    flow.gap(r.gap(40));
    flow.text(opts.body, r.bodyMuted);
  }
}

function buildResult(flow: Flow, opts: ResultShareOpts, g: Geometry): void {
  const r = ramp(g);
  if (opts.eyebrow) {
    flow.text(opts.eyebrow, r.eyebrow);
    flow.gap(r.gap(28));
  }
  flow.text(opts.title, r.title);
  if (opts.subtitle) {
    flow.gap(r.gap(18));
    flow.text(opts.subtitle, r.subtitle);
  }
  if (opts.tagline) {
    flow.gap(r.gap(32));
    flow.text(opts.tagline, r.tagline);
  }
  if (opts.body?.trim()) {
    flow.gap(r.gap(56));
    flow.panel(r.gap(52), R.card, (inner) => {
      if (opts.bodyLabel) {
        inner.text(opts.bodyLabel, r.panelLabel);
        inner.gap(r.gap(20));
      }
      inner.text(opts.body ?? '', r.body);
    });
  }
}

// ── Fonts ───────────────────────────────────────────────────────────────

/** Every string the card will draw, so the right unicode-range subsets load. */
function sampleText(opts: ShareCardOpts): string {
  const parts: (string | undefined)[] = [opts.eyebrow, opts.deepLink, 'ARCANA', BRAND_URL];
  switch (opts.variant) {
    case 'tarot': parts.push(opts.cardName, opts.keyword); break;
    case 'soulmate': parts.push(opts.vibe, opts.vibeDescription, opts.partnerName, '0123456789'); break;
    case 'quiz': parts.push(opts.quizName, opts.resultName, opts.affirmation); break;
    case 'quote': parts.push(opts.headline, opts.body); break;
    case 'result': parts.push(opts.title, opts.subtitle, opts.tagline, opts.body, opts.bodyLabel); break;
  }
  return parts.filter(Boolean).join(' ');
}

/**
 * Ask for the faces the card draws with. Resolves when they are ready or
 * after a short wait, whichever is first: a missing face falls back to the
 * generic serif / sans-serif and must never block the share gesture.
 */
async function ensureFonts(opts: ShareCardOpts): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const text = sampleText(opts);
  const wanted = [
    '600 84px "Cormorant Garamond"',
    '500 52px "Cormorant Garamond"',
    'italic 400 44px "Cormorant Garamond"',
    '400 40px Inter',
    '500 40px Inter',
  ];
  const loads = Promise.all(wanted.map((f) => document.fonts.load(f, text)));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS));
  await Promise.race([loads, timeout]).catch(() => {});
}

// ── Entry points ────────────────────────────────────────────────────────

/**
 * Render a share card and return a PNG blob. Pure client-side.
 * The second argument is accepted for old callers and ignored: PNG has no
 * quality parameter.
 */
export async function generateShareCardImage(opts: ShareCardOpts, _quality?: number): Promise<Blob> {
  void _quality;
  const g = opts.format === 'square' ? SQUARE : STORY;
  const canvas = document.createElement('canvas');
  canvas.width = g.width;
  canvas.height = g.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  await ensureFonts(opts);

  drawBackground(ctx, g, seedFrom(sampleText(opts)));
  drawHeader(ctx, g);

  const flow = new Flow(ctx, g.width / 2, g.width - g.padX * 2);
  switch (opts.variant) {
    case 'tarot': await buildTarot(ctx, flow, opts, g); break;
    case 'soulmate': buildSoulmate(ctx, flow, opts, g); break;
    case 'quiz': buildQuiz(flow, opts, g); break;
    case 'quote': buildQuote(flow, opts, g); break;
    case 'result': buildResult(flow, opts, g); break;
  }
  placeFlow(ctx, flow, g);
  drawFooter(ctx, g, opts.deepLink);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

/**
 * Render, then share through the OS sheet or save where none exists.
 *
 *   'shared'     the sheet took the file
 *   'downloaded' saved through a download anchor (web only)
 *   'cancelled'  the person closed the sheet; nothing to report
 *   'failed'     rendering or every share path failed
 *
 * Never throws.
 */
export async function shareOrDownloadCard(
  opts: ShareCardOpts,
  fileName: string,
  fallbackText: string,
): Promise<ShareOutcome> {
  let blob: Blob;
  try {
    blob = await generateShareCardImage(opts);
  } catch (err) {
    console.error('[shareCard] render failed:', err);
    return 'failed';
  }
  return sharePng(blob, fileName, { title: 'Arcana', text: fallbackText });
}
