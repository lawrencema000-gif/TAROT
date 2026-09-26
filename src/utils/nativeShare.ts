/**
 * One OS share path for images and text, honest about what happened.
 *
 * Web: `navigator.canShare({ files })` → `navigator.share`. A user closing
 * the sheet (AbortError) is 'cancelled', never a failure and never a
 * download. Any other share error falls through to a download anchor, whose
 * object URL is revoked only after the click has been processed.
 *
 * Capacitor (Android / iOS): the System WebView has no `navigator.share`
 * and ignores `<a download>`, so the old code saved nothing while callers
 * toasted "Saved to your device". Here the PNG is written to the app cache
 * through @capacitor/filesystem and handed to @capacitor/share as a
 * file:// URI. If any step fails the result is 'failed' — the anchor
 * fallback is never used on native because it cannot work there.
 *
 * Gesture window: WebKit lets `navigator.share` run only inside a user
 * activation, which expires a few seconds after the tap. Callers build the
 * PNG first (fonts, card art, encode) and then call this; on a slow device
 * that can exceed the window, in which case WebKit rejects with
 * NotAllowedError and this falls back to a download rather than a silent
 * no-op. That is the documented limit.
 */

import { isNative } from './platform';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

/** Long enough for every browser to have opened the blob before it goes away. */
const REVOKE_DELAY_MS = 1000;

/** True for a user dismissing the share sheet on any platform. */
export function isShareCancel(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { name, message } = err as { name?: unknown; message?: unknown };
  if (name === 'AbortError') return true;
  // @capacitor/share rejects with "Share canceled" on both Android and iOS.
  return typeof message === 'string' && /cancel/i.test(message);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('blob read failed'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

async function shareFileNative(blob: Blob, fileName: string, payload: SharePayload): Promise<ShareOutcome> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const data = await blobToBase64(blob);
    const { uri } = await Filesystem.writeFile({
      path: `share/${fileName}`,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: payload.title,
      text: payload.text,
      files: [uri],
      dialogTitle: payload.title,
    });
    return 'shared';
  } catch (err) {
    if (isShareCancel(err)) return 'cancelled';
    console.error('[nativeShare] native file share failed:', err);
    return 'failed';
  }
}

/**
 * Save a blob through a download anchor. Returns false when the document
 * cannot host one (SSR, tests) instead of throwing.
 */
export function downloadBlob(blob: Blob, fileName: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking synchronously after click() cancels the download in some
  // browsers: the navigation has been queued, not started.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  return true;
}

/**
 * Share a PNG blob through the platform's share sheet, or save it where no
 * sheet exists. Never throws.
 */
export async function sharePng(blob: Blob, fileName: string, payload: SharePayload = {}): Promise<ShareOutcome> {
  if (isNative()) return shareFileNative(blob, fileName, payload);

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.share) {
    const file = new File([blob], fileName, { type: 'image/png' });
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: payload.title, text: payload.text });
        return 'shared';
      } catch (err) {
        if (isShareCancel(err)) return 'cancelled';
        // Platform refused the file share (NotAllowedError, DataError):
        // fall through and save the image instead.
      }
    }
  }

  try {
    return downloadBlob(blob, fileName) ? 'downloaded' : 'failed';
  } catch (err) {
    console.error('[nativeShare] download failed:', err);
    return 'failed';
  }
}

/**
 * Share text (with an optional URL) through the platform's share sheet.
 * Resolves false when no sheet exists or the user cancelled, so callers
 * can fall back to the clipboard.
 */
export async function shareText(payload: SharePayload): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: payload.title, text: payload.text, url: payload.url, dialogTitle: payload.title });
      return true;
    } catch (err) {
      if (!isShareCancel(err)) console.error('[nativeShare] native text share failed:', err);
      return false;
    }
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (!nav?.share) return false;
  try {
    await nav.share({ title: payload.title, text: payload.text, url: payload.url });
    return true;
  } catch (err) {
    if (!isShareCancel(err)) console.error('[nativeShare] text share failed:', err);
    return false;
  }
}
