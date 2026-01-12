export const MAJOR_ARCANA_CARDS = [
  { id: 0, name: 'The Fool', slug: 'the-fool' },
  { id: 1, name: 'The Magician', slug: 'the-magician' },
  { id: 2, name: 'The High Priestess', slug: 'the-high-priestess' },
  { id: 3, name: 'The Empress', slug: 'the-empress' },
  { id: 4, name: 'The Emperor', slug: 'the-emperor' },
  { id: 5, name: 'The Hierophant', slug: 'the-hierophant' },
  { id: 6, name: 'The Lovers', slug: 'the-lovers' },
  { id: 7, name: 'The Chariot', slug: 'the-chariot' },
  { id: 8, name: 'Strength', slug: 'strength' },
  { id: 9, name: 'The Hermit', slug: 'the-hermit' },
  { id: 10, name: 'Wheel of Fortune', slug: 'wheel-of-fortune' },
  { id: 11, name: 'Justice', slug: 'justice' },
  { id: 12, name: 'The Hanged Man', slug: 'the-hanged-man' },
  { id: 13, name: 'Death', slug: 'death' },
  { id: 14, name: 'Temperance', slug: 'temperance' },
  { id: 15, name: 'The Devil', slug: 'the-devil' },
  { id: 16, name: 'The Tower', slug: 'the-tower' },
  { id: 17, name: 'The Star', slug: 'the-star' },
  { id: 18, name: 'The Moon', slug: 'the-moon' },
  { id: 19, name: 'The Sun', slug: 'the-sun' },
  { id: 20, name: 'Judgement', slug: 'judgement' },
  { id: 21, name: 'The World', slug: 'the-world' },
];

export const BUNDLED_CARD_BACKS = [
  { name: 'default', path: '/card-backs/default.svg' },
];

export const LOW_RES_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="0%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%231a1a2e;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%230a0a15;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="200" height="300" fill="url(%23g)"/%3E%3Cpath d="M100 120l20 40-20 40-20-40z" fill="%23d4af37" opacity="0.2"/%3E%3Cpath d="M100 140c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20z" fill="%23d4af37" opacity="0.15"/%3E%3C/svg%3E';

export function isMajorArcana(cardId: number): boolean {
  return cardId >= 0 && cardId <= 21;
}

export function getBundledCardPath(cardId: number, cardName: string): string | null {
  if (!isMajorArcana(cardId)) {
    return null;
  }

  const card = MAJOR_ARCANA_CARDS.find(c => c.id === cardId);
  if (!card) {
    return null;
  }

  return `/bundled-cards/major-arcana/${card.slug}.webp`;
}

export function hasLocalBundle(url: string | undefined): boolean {
  if (!url) return false;

  return url.startsWith('/bundled-cards/') || url.startsWith('/card-backs/');
}
