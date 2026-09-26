/**
 * Compatibility layer over the share renderer in ./shareCard.
 *
 * Fourteen result pages call `renderShareCard` + `shareOrDownload` with the
 * shape below. The old renderer behind it was a second visual language
 * (Times New Roman, stale hex values, fixed y anchors, a hardcoded
 * "· AFFIRMATION" label and straight quotes around data lines). It is gone;
 * these names now map onto the single renderer so no caller needs an edit.
 *
 * Mapping:
 *   brand        → eyebrow, with the leading "Arcana ·" stripped (the brand
 *                  mark and wordmark already say Arcana)
 *   title        → title
 *   subtitle     → subtitle
 *   tagline      → tagline / data line, never quoted
 *   affirmation  → body panel, no label unless `label` is passed; an empty
 *                  string draws nothing
 */

import { generateShareCardImage, type ShareFormat, type ShareOutcome } from './shareCard';
import { downloadBlob as saveBlob, sharePng } from './nativeShare';

export interface ShareCardData {
  /** Large title (e.g. "Page of Wands" or "INTJ") */
  title: string;
  /** Short subtitle below the title (e.g. archetype or type name) */
  subtitle: string;
  /** Tagline or data line under the subtitle. Drawn as given, no quotes. */
  tagline: string;
  /** Longer body, auto-wrapped in a panel. Empty renders nothing. */
  affirmation: string;
  /** Module line, e.g. "Arcana · Bazi". Becomes the eyebrow. */
  brand: string;
  /** Optional small label above the body. Omit for no label. */
  label?: string;
  /** 1080×1920 (default) or 1080×1080. */
  format?: ShareFormat;
}

/** "Arcana · Cosmic Profile" → "Cosmic Profile"; "Arcana" → undefined. */
function eyebrowFromBrand(brand: string): string | undefined {
  const rest = brand.replace(/^\s*arcana\s*(?:[·•\-–—:|]\s*)?/i, '').trim();
  return rest || undefined;
}

/**
 * Render the card. The second argument is accepted for old callers and
 * ignored: PNG has no quality parameter.
 */
export async function renderShareCard(data: ShareCardData, _quality?: number): Promise<Blob> {
  void _quality;
  return generateShareCardImage({
    variant: 'result',
    format: data.format,
    eyebrow: eyebrowFromBrand(data.brand),
    title: data.title,
    subtitle: data.subtitle,
    tagline: data.tagline,
    body: data.affirmation,
    bodyLabel: data.label,
  });
}

/** Save a blob through a download anchor; the object URL is revoked after the click. */
export function downloadBlob(blob: Blob, filename: string): void {
  saveBlob(blob, filename);
}

/**
 * Share through the OS sheet when one exists, otherwise save.
 *
 * Callers today act only on 'downloaded' (toast "Saved to your device").
 * 'cancelled' and 'failed' are new, honest values: the old code reported
 * 'shared' for both, so an Android share that saved nothing looked like a
 * success. A page that wants to surface failure checks `=== 'failed'`.
 */
export async function shareOrDownload(blob: Blob, filename: string, shareText: string): Promise<ShareOutcome> {
  return sharePng(blob, filename, { title: 'Arcana', text: shareText });
}
