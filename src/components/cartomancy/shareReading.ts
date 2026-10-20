import { useCallback, useRef, useState } from 'react';
import { toast } from '../ui';
import { shareOrDownloadCard, type ShareOutcome } from '../../utils/shareCard';
import { encodeReading, buildShareUrl } from '../../services/shareableReadings';
import type { PlayingCard } from '../../types/cartomancy';
import type { TFn } from './CartomancyResultParts';

/**
 * Sharing a reading: one share at a time, and every share ends in a toast.
 *
 * The share image takes a second or more to render before the OS sheet
 * opens. A second tap used to start a second render: its navigator.share was
 * refused while the first sheet was open, or opened a second sheet once the
 * first had closed (p8 O#78, the playing-card reveal). `useShareOnce` runs
 * one share at a time — the ref answers the second tap before React has
 * re-rendered, the state drives the control's busy look — as TarotSection
 * does for the tarot reveal. Used by the playing-card reveal, its card
 * detail, and a saved reading reopened from the Library.
 */
export function useShareOnce(): { sharing: boolean; shareOnce: (run: () => Promise<void>) => Promise<void> } {
  const [sharing, setSharing] = useState(false);
  const busy = useRef(false);
  const shareOnce = useCallback(async (run: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setSharing(true);
    try {
      await run();
    } finally {
      busy.current = false;
      setSharing(false);
    }
  }, []);
  return { sharing, shareOnce };
}

/**
 * The toast a share ends in: the OS sheet took it, the image was saved, or
 * the link was copied instead; a sheet the reader closed says nothing. A
 * missing clipboard is a failure, not "Copied".
 */
export async function reportShareOutcome(outcome: ShareOutcome, fallbackText: string, t: TFn): Promise<void> {
  if (outcome === 'shared') {
    toast(t('readings.toasts.shared', { defaultValue: 'Shared' }), 'success');
  } else if (outcome === 'downloaded') {
    toast(t('readings.toasts.imageSaved', { defaultValue: 'Image saved to your downloads' }), 'success');
  } else if (outcome === 'failed') {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(fallbackText);
      toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
    } catch {
      toast(t('common:actions.shareFailed', { defaultValue: 'Couldn’t share. Try again.' }), 'error');
    }
  }
}

export interface PlayingShare {
  spreadSlug: string;
  /** The spread's name in the reader's language. */
  spreadName: string;
  /** The table in dealt order: the cards as dealt (not localized) and their orientation. */
  cards: Array<{ card: PlayingCard; reversed: boolean }>;
  /** The card the image shows (the first revealed, or the one whose detail is open). */
  featured: number;
  question?: string;
  /** When the reading was made: an ISO instant, or a saved row's calendar day. */
  date: string;
  localize: (card: PlayingCard) => PlayingCard;
}

/**
 * Share a playing-card reading: the link (a v2 token, which every build that
 * draws playing cards opens) and an image of the featured card. One builder
 * for the live table and a saved reading, so the two links are the same.
 */
export async function sharePlayingReading(share: PlayingShare, t: TFn): Promise<void> {
  const featured = share.cards[share.featured] ?? share.cards[0];
  if (!featured) return;
  const card = share.localize(featured.card);
  const url = buildShareUrl(
    encodeReading({
      spreadSlug: share.spreadSlug,
      cards: share.cards.map((d) => ({ id: d.card.id, reversed: d.reversed })),
      question: share.question || undefined,
      date: share.date,
      kind: 'playing',
    }),
  );
  const text = `${t('cartomancy.shareText', { defaultValue: 'My {{spread}} playing-card reading on Arcana', spread: share.spreadName })}\n${url}`;
  const outcome = await shareOrDownloadCard(
    {
      variant: 'cartomancy',
      cardSlug: featured.card.slug,
      cardName: card.name,
      suit: featured.card.suit,
      rank: featured.card.rank,
      color: featured.card.color,
      orientation: featured.reversed ? 'reversed' : 'upright',
      keyword: card.keywords[0] ?? '',
      spreadName: share.spreadName,
      eyebrow: t('cartomancy.title', { defaultValue: 'Playing cards' }),
    },
    `arcana-reading-${share.spreadSlug}.png`,
    text,
  );
  await reportShareOutcome(outcome, text, t);
}
