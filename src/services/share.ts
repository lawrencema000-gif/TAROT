/**
 * Text sharing for surfaces that share words, not an image.
 *
 * The image generators that used to live here (600×800 tarot, 600×700
 * horoscope, amber palette, random specks, a placeholder rectangle for card
 * art) had no callers and are gone; the share-card renderer is
 * src/utils/shareCard.ts. What remains is what HoroscopeSection uses.
 */

import { sharePng, shareText } from '../utils/nativeShare';

/**
 * Open the platform share sheet with text and, optionally, an image.
 * Resolves false when there is no sheet, the share failed, or the person
 * closed it — callers fall back to the clipboard in every case.
 */
export async function shareToNative(title: string, text: string, imageBlob?: Blob): Promise<boolean> {
  if (imageBlob) {
    return (await sharePng(imageBlob, 'arcana-share.png', { title, text })) === 'shared';
  }
  return shareText({ title, text });
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
