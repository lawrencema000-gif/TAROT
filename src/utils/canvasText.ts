/**
 * Text engine for the canvas share renderer.
 *
 * Canvas 2D has no line breaking, so this module owns it: measure-and-wrap
 * against a column width, with three properties the old renderers lacked.
 *
 *  1. Scripts without spaces wrap. A Japanese, Chinese or Thai string has no
 *     word boundaries; the old `split(' ')` produced one "word" wider than the
 *     canvas, drawn on a single line and clipped at both edges. Here any word
 *     wider than the column is broken on grapheme clusters (Intl.Segmenter
 *     when available, code points otherwise), so a combining mark or an
 *     emoji sequence is never split in half. Two small kinsoku rules keep
 *     closing punctuation (。、」) off the start of a line and opening
 *     punctuation (「（) off the end of one.
 *  2. Truncation is visible. Lines past `maxLines` collapse into the last
 *     permitted line with an ellipsis, trimmed until it fits the column.
 *  3. Nothing here touches a canvas. `wrapText` takes a measure function so
 *     the layout can be tested with a fake ruler and reused by any renderer.
 *
 * Every line this returns measures at or under `maxWidth`, with one
 * unavoidable exception: a single grapheme cluster wider than the column
 * (a huge emoji in a tiny column) is emitted on its own line as is.
 */

export type MeasureFn = (text: string) => number;

export interface WrapOptions {
  /** Maximum lines to keep. Extra content is folded into an ellipsis. */
  maxLines?: number;
  /** Truncation marker. Default is the single-character ellipsis. */
  ellipsis?: string;
}

// ── Grapheme segmentation ───────────────────────────────────────────────

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string }>;
}
type SegmenterCtor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' | 'word' | 'sentence' },
) => SegmenterLike;

const segmenters: Partial<Record<'grapheme' | 'word', SegmenterLike | null>> = {};

function getSegmenter(granularity: 'grapheme' | 'word'): SegmenterLike | null {
  if (granularity in segmenters) return segmenters[granularity] ?? null;
  const Ctor = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  let seg: SegmenterLike | null = null;
  try {
    seg = Ctor ? new Ctor(undefined, { granularity }) : null;
  } catch {
    seg = null;
  }
  segmenters[granularity] = seg;
  return seg;
}

/** Split into user-perceived characters. Falls back to code points. */
export function graphemes(text: string): string[] {
  const seg = getSegmenter('grapheme');
  if (seg) return Array.from(seg.segment(text), (s) => s.segment);
  return Array.from(text);
}

/**
 * Split a run with no spaces into words where the platform has a
 * dictionary for the script (ICU breaks Thai, Lao, Khmer, Japanese and
 * Chinese; Chrome, WebView, Safari and Node all ship it). Without one the
 * run comes back as graphemes, which still wraps, just not at word edges.
 */
function wordSegments(text: string): string[] {
  const seg = getSegmenter('word');
  if (!seg) return graphemes(text);
  const out = Array.from(seg.segment(text), (s) => s.segment).filter((s) => s.length > 0);
  return out.length ? out : [text];
}

// ── Kinsoku: characters that must not begin or end a line ───────────────

const NO_LINE_START = new Set(Array.from('、。，．：；！？」』）】〉》〕…‥ー～〜ぁぃぅぇぉっゃゅょァィゥェォッャュョ々'));
const NO_LINE_END = new Set(Array.from('「『（【〈《〔“‘'));

const firstCluster = (s: string): string => graphemes(s)[0] ?? '';
const lastCluster = (s: string): string => {
  const g = graphemes(s);
  return g[g.length - 1] ?? '';
};

/**
 * Pack `units` into lines no wider than `maxWidth`. A unit that is wider
 * than the column on its own is replaced by `split(unit)` and packed again,
 * so words fall to graphemes only where a word really does not fit.
 */
function packUnits(measure: MeasureFn, units: string[], maxWidth: number, split: ((u: string) => string[]) | null): string[] {
  const lines: string[] = [];
  let current: string[] = [];
  const queue = [...units];

  while (queue.length) {
    const u = queue.shift() as string;
    const alone = measure(u) > maxWidth;
    if (alone && split) {
      const finer = split(u);
      if (finer.length > 1) {
        queue.unshift(...finer);
        continue;
      }
    }
    if (current.length === 0 || measure(current.join('') + u) <= maxWidth) {
      current.push(u);
      continue;
    }
    // `u` opens a new line. Pull the previous unit down with it when the
    // break would otherwise start a line with closing punctuation or end
    // one with opening punctuation, provided the pair still fits.
    let carry: string[] = [];
    if (current.length >= 2 && (NO_LINE_START.has(firstCluster(u)) || NO_LINE_END.has(lastCluster(current[current.length - 1])))) {
      const prev = current[current.length - 1];
      if (measure(prev + u) <= maxWidth) carry = [current.pop() as string];
    }
    lines.push(current.join(''));
    current = [...carry, u];
  }
  if (current.length) lines.push(current.join(''));
  return lines;
}

/**
 * Break one over-wide word: first on dictionary word boundaries, then on
 * grapheme clusters for any piece that is still wider than the column.
 */
function breakWord(measure: MeasureFn, word: string, maxWidth: number): string[] {
  return packUnits(measure, wordSegments(word), maxWidth, graphemes);
}

/**
 * Trim `line` on grapheme boundaries until `line + ellipsis` fits, then
 * back up to a word boundary when one sits in the last part of the line.
 */
function ellipsize(measure: MeasureFn, line: string, maxWidth: number, ellipsis: string): string {
  const clusters = graphemes(line);
  while (clusters.length > 0) {
    const fitted = clusters.join('').replace(/\s+$/u, '');
    if (measure(fitted + ellipsis) <= maxWidth) {
      const cut = fitted.search(/\s\S*$/u);
      if (cut > fitted.length * 0.6) {
        const atWord = fitted.slice(0, cut).replace(/[\s,;:·—–-]+$/u, '');
        if (atWord) return atWord + ellipsis;
      }
      return fitted + ellipsis;
    }
    clusters.pop();
  }
  return ellipsis;
}

/**
 * Wrap `text` into lines no wider than `maxWidth` under `measure`.
 *
 * Explicit newlines start a new line. Runs of whitespace collapse to one
 * space. Words are tried whole first; a word wider than the column is broken
 * on grapheme clusters, which is what makes CJK and Thai wrap at all.
 */
export function wrapText(measure: MeasureFn, text: string, maxWidth: number, opts: WrapOptions = {}): string[] {
  const maxLines = opts.maxLines ?? Number.POSITIVE_INFINITY;
  const ellipsis = opts.ellipsis ?? '…';
  const lines: string[] = [];

  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    if (words.length === 0) continue;
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      const pieces = breakWord(measure, word, maxWidth);
      lines.push(...pieces.slice(0, -1));
      line = pieces[pieces.length - 1];
    }
    if (line) lines.push(line);
  }

  if (lines.length > maxLines) {
    const kept = lines.slice(0, Math.max(1, maxLines));
    kept[kept.length - 1] = ellipsize(measure, kept[kept.length - 1], maxWidth, ellipsis);
    return kept;
  }
  return lines;
}

// ── Canvas helpers ──────────────────────────────────────────────────────

/** Build a CSS font shorthand for `ctx.font`. */
export function cssFont(weight: number | string, sizePx: number, family: string, italic = false): string {
  return `${italic ? 'italic ' : ''}${weight} ${Math.round(sizePx)}px ${family}`;
}

/** A measure function bound to a context and a font. */
export function measurer(ctx: CanvasRenderingContext2D, font: string): MeasureFn {
  return (s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };
}

/**
 * Draw pre-wrapped lines with their vertical centres on a fixed pitch,
 * starting at `top`. Returns the y just below the last line.
 */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  top: number,
  lineHeight: number,
  align: CanvasTextAlign = 'center',
): number {
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, x, top + lineHeight / 2 + i * lineHeight));
  return top + lines.length * lineHeight;
}

/** Width of `text` drawn with `tracking` extra pixels between clusters. */
export function trackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
  const cl = graphemes(text);
  return cl.reduce((w, g) => w + ctx.measureText(g).width, 0) + tracking * Math.max(0, cl.length - 1);
}

/**
 * Draw `text` centred on `cx` with letter tracking. Canvas `letterSpacing`
 * is not available on every WebView, so the clusters are placed by hand.
 */
export function drawTracked(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, tracking: number): void {
  const cl = graphemes(text);
  const total = trackedWidth(ctx, text, tracking);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const g of cl) {
    ctx.fillText(g, x, y);
    x += ctx.measureText(g).width + tracking;
  }
}

/** Trace a rounded rectangle path (no fill or stroke). */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
