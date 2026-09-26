import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * The ritual's touch.
 *
 * One pattern existed, in the home card's flip: a light tap when you press,
 * a medium thump as the card passes edge-on. It was written once and reused
 * nowhere — the reading flow, where the cards actually matter, was silent.
 * These are that pattern's pieces, so every card in the product answers the
 * hand the same way. Each call swallows its own failure: on the web and on
 * devices without a motor there is nothing to feel, and nothing to log.
 */

export function tap(): void {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function thump(): void {
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

/**
 * The flip: a tap now, a thump when the card is edge-on — only if there is
 * a turn to feel. Under reduced motion the card arrives face-up at once, and
 * a second buzz a quarter-second later is exactly the disembodied twitch the
 * setting exists to remove. Returns a cancel for an unmount mid-flip.
 */
export function flipHaptics(flipMs: number, reduceMotion: boolean): () => void {
  tap();
  if (reduceMotion) return () => {};
  const id = window.setTimeout(thump, flipMs / 2);
  return () => window.clearTimeout(id);
}

/**
 * The riffle: a soft tick every so often while the deck is being shuffled,
 * capped so a long shuffle does not become a rattle. Returns a stop.
 */
export function riffleHaptics(intervalMs = 380, maxTicks = 6): () => void {
  let n = 0;
  const id = window.setInterval(() => {
    if (++n > maxTicks) { window.clearInterval(id); return; }
    tap();
  }, intervalMs);
  return () => window.clearInterval(id);
}
