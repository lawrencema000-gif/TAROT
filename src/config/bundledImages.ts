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

export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

export const MINOR_ARCANA_CARDS: { id: number; name: string; slug: string; suit: Suit }[] = [
  { id: 22, name: 'Ace of Wands', slug: 'ace-of-wands', suit: 'wands' },
  { id: 23, name: 'Two of Wands', slug: 'two-of-wands', suit: 'wands' },
  { id: 24, name: 'Three of Wands', slug: 'three-of-wands', suit: 'wands' },
  { id: 25, name: 'Four of Wands', slug: 'four-of-wands', suit: 'wands' },
  { id: 26, name: 'Five of Wands', slug: 'five-of-wands', suit: 'wands' },
  { id: 27, name: 'Six of Wands', slug: 'six-of-wands', suit: 'wands' },
  { id: 28, name: 'Seven of Wands', slug: 'seven-of-wands', suit: 'wands' },
  { id: 29, name: 'Eight of Wands', slug: 'eight-of-wands', suit: 'wands' },
  { id: 30, name: 'Nine of Wands', slug: 'nine-of-wands', suit: 'wands' },
  { id: 31, name: 'Ten of Wands', slug: 'ten-of-wands', suit: 'wands' },
  { id: 32, name: 'Page of Wands', slug: 'page-of-wands', suit: 'wands' },
  { id: 33, name: 'Knight of Wands', slug: 'knight-of-wands', suit: 'wands' },
  { id: 34, name: 'Queen of Wands', slug: 'queen-of-wands', suit: 'wands' },
  { id: 35, name: 'King of Wands', slug: 'king-of-wands', suit: 'wands' },
  { id: 36, name: 'Ace of Cups', slug: 'ace-of-cups', suit: 'cups' },
  { id: 37, name: 'Two of Cups', slug: 'two-of-cups', suit: 'cups' },
  { id: 38, name: 'Three of Cups', slug: 'three-of-cups', suit: 'cups' },
  { id: 39, name: 'Four of Cups', slug: 'four-of-cups', suit: 'cups' },
  { id: 40, name: 'Five of Cups', slug: 'five-of-cups', suit: 'cups' },
  { id: 41, name: 'Six of Cups', slug: 'six-of-cups', suit: 'cups' },
  { id: 42, name: 'Seven of Cups', slug: 'seven-of-cups', suit: 'cups' },
  { id: 43, name: 'Eight of Cups', slug: 'eight-of-cups', suit: 'cups' },
  { id: 44, name: 'Nine of Cups', slug: 'nine-of-cups', suit: 'cups' },
  { id: 45, name: 'Ten of Cups', slug: 'ten-of-cups', suit: 'cups' },
  { id: 46, name: 'Page of Cups', slug: 'page-of-cups', suit: 'cups' },
  { id: 47, name: 'Knight of Cups', slug: 'knight-of-cups', suit: 'cups' },
  { id: 48, name: 'Queen of Cups', slug: 'queen-of-cups', suit: 'cups' },
  { id: 49, name: 'King of Cups', slug: 'king-of-cups', suit: 'cups' },
  { id: 50, name: 'Ace of Swords', slug: 'ace-of-swords', suit: 'swords' },
  { id: 51, name: 'Two of Swords', slug: 'two-of-swords', suit: 'swords' },
  { id: 52, name: 'Three of Swords', slug: 'three-of-swords', suit: 'swords' },
  { id: 53, name: 'Four of Swords', slug: 'four-of-swords', suit: 'swords' },
  { id: 54, name: 'Five of Swords', slug: 'five-of-swords', suit: 'swords' },
  { id: 55, name: 'Six of Swords', slug: 'six-of-swords', suit: 'swords' },
  { id: 56, name: 'Seven of Swords', slug: 'seven-of-swords', suit: 'swords' },
  { id: 57, name: 'Eight of Swords', slug: 'eight-of-swords', suit: 'swords' },
  { id: 58, name: 'Nine of Swords', slug: 'nine-of-swords', suit: 'swords' },
  { id: 59, name: 'Ten of Swords', slug: 'ten-of-swords', suit: 'swords' },
  { id: 60, name: 'Page of Swords', slug: 'page-of-swords', suit: 'swords' },
  { id: 61, name: 'Knight of Swords', slug: 'knight-of-swords', suit: 'swords' },
  { id: 62, name: 'Queen of Swords', slug: 'queen-of-swords', suit: 'swords' },
  { id: 63, name: 'King of Swords', slug: 'king-of-swords', suit: 'swords' },
  { id: 64, name: 'Ace of Pentacles', slug: 'ace-of-pentacles', suit: 'pentacles' },
  { id: 65, name: 'Two of Pentacles', slug: 'two-of-pentacles', suit: 'pentacles' },
  { id: 66, name: 'Three of Pentacles', slug: 'three-of-pentacles', suit: 'pentacles' },
  { id: 67, name: 'Four of Pentacles', slug: 'four-of-pentacles', suit: 'pentacles' },
  { id: 68, name: 'Five of Pentacles', slug: 'five-of-pentacles', suit: 'pentacles' },
  { id: 69, name: 'Six of Pentacles', slug: 'six-of-pentacles', suit: 'pentacles' },
  { id: 70, name: 'Seven of Pentacles', slug: 'seven-of-pentacles', suit: 'pentacles' },
  { id: 71, name: 'Eight of Pentacles', slug: 'eight-of-pentacles', suit: 'pentacles' },
  { id: 72, name: 'Nine of Pentacles', slug: 'nine-of-pentacles', suit: 'pentacles' },
  { id: 73, name: 'Ten of Pentacles', slug: 'ten-of-pentacles', suit: 'pentacles' },
  { id: 74, name: 'Page of Pentacles', slug: 'page-of-pentacles', suit: 'pentacles' },
  { id: 75, name: 'Knight of Pentacles', slug: 'knight-of-pentacles', suit: 'pentacles' },
  { id: 76, name: 'Queen of Pentacles', slug: 'queen-of-pentacles', suit: 'pentacles' },
  { id: 77, name: 'King of Pentacles', slug: 'king-of-pentacles', suit: 'pentacles' },
];

export const ALL_CARDS = [...MAJOR_ARCANA_CARDS, ...MINOR_ARCANA_CARDS];

export const BUNDLED_CARD_BACKS = [
  { name: 'default', path: '/card-backs/default.svg' },
];

export const LOW_RES_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="0%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%231a1a2e;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%230a0a15;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="200" height="300" fill="url(%23g)"/%3E%3Cpath d="M100 120l20 40-20 40-20-40z" fill="%23d4af37" opacity="0.2"/%3E%3Cpath d="M100 140c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20z" fill="%23d4af37" opacity="0.15"/%3E%3C/svg%3E';

export function isMajorArcana(cardId: number): boolean {
  return cardId >= 0 && cardId <= 21;
}

export function isMinorArcana(cardId: number): boolean {
  return cardId >= 22 && cardId <= 77;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getBundledCardPath(cardId: number, _cardName?: string, _suit?: string | null): string | null {
  if (isMajorArcana(cardId)) {
    const card = MAJOR_ARCANA_CARDS.find(c => c.id === cardId);
    if (card) {
      return `/bundled-cards/major-arcana/${card.slug}.webp`;
    }
  }

  if (isMinorArcana(cardId)) {
    const card = MINOR_ARCANA_CARDS.find(c => c.id === cardId);
    if (card) {
      return `/bundled-cards/minor-arcana/${card.suit}/${card.slug}.webp`;
    }
  }

  return null;
}

export function hasLocalBundle(url: string | undefined): boolean {
  if (!url) return false;

  return url.startsWith('/bundled-cards/') || url.startsWith('/card-backs/');
}

/** 150px thumbnail for grid views */
export function getBundledThumbPath(cardId: number): string | null {
  const path = getBundledCardPath(cardId);
  if (!path) return null;
  return path.replace('/bundled-cards/', '/bundled-cards/thumb/');
}

/** 400px full-size for detail views */
export function getBundledFullPath(cardId: number): string | null {
  const path = getBundledCardPath(cardId);
  if (!path) return null;
  return path.replace('/bundled-cards/', '/bundled-cards/full/');
}
