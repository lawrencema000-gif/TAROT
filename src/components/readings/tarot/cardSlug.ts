/**
 * One canonical URL slug per tarot card, by id.
 *
 * The card pages (/tarot-meanings/:slug), the sitemap and the prerender
 * all spell a card by the slug of its English name in the card table:
 * "The Wheel of Fortune" → `the-wheel-of-fortune`. Links used to be built
 * three other ways — from the DISPLAYED name (a localized name stripped to
 * nothing: ワンドの5 → `/tarot-meanings/5`, 太陽 → `/tarot-meanings/`), from
 * the bundled-image table's slug (`wheel-of-fortune`, "Card not found"),
 * and from the enrichment's names ("Wheel of Fortune"). Every link now goes
 * through here, and the card page also accepts the old spellings.
 *
 * The bundled-image table is the source (it is small and synchronous; the
 * card table is a lazy chunk). It names one card differently from the card
 * table, so that one is overridden here; the golden test holds all 78 equal
 * to the card table's names.
 */
import { ALL_CARDS } from '../../../config/bundledImages';

/** Where the bundled-image table's English name differs from the card table's. */
const CARD_TABLE_NAME: Record<number, string> = {
  10: 'The Wheel of Fortune',
};

/** "The Fool" → "the-fool". */
export function slugOfName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** The card's English name as the card table, the AI and the badges spell it. */
export function canonicalCardName(id: number): string {
  return CARD_TABLE_NAME[id] ?? ALL_CARDS.find((c) => c.id === id)?.name ?? '';
}

/** The card page's slug for a card id. */
export function cardMeaningSlug(id: number): string {
  return slugOfName(canonicalCardName(id));
}

/** The card page's path for a card id: `/tarot-meanings/the-fool`. */
export function cardMeaningPath(id: number): string {
  return `/tarot-meanings/${cardMeaningSlug(id)}`;
}

const ID_BY_SLUG: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const c of ALL_CARDS) {
    m.set(cardMeaningSlug(c.id), c.id);
    // The older spellings: the image table's slug and the bare name.
    m.set(c.slug, c.id);
    m.set(slugOfName(c.name), c.id);
  }
  return m;
})();

/** A card id from any slug a link has ever used for it, or undefined. */
export function cardIdFromSlug(slug: string | undefined | null): number | undefined {
  return slug ? ID_BY_SLUG.get(slug.toLowerCase()) : undefined;
}

/**
 * A card id from an English card name as the data files write it ("Wheel
 * of Fortune", "The Wheel of Fortune", "Judgment"), or undefined.
 */
export function cardIdFromName(name: string): number | undefined {
  const slug = slugOfName(name.trim());
  return ID_BY_SLUG.get(slug) ?? ID_BY_SLUG.get(slug.replace(/^the-/, '')) ?? (slug === 'judgment' ? 20 : undefined);
}
