/**
 * Cartomancy data — the playing deck, its spreads, lessons and tables, and
 * the reader functions that run on them. English prose lives in the
 * `*.en.ts` files (generated from the reviewed corpus); the other locales
 * overlay it through the `cartomancy` i18n namespace.
 */
export * from './deck';
export * from './spreads';
export * from './lessons';
export * from './tables.en';
export * from './combinations';
export * from './pipLayout';
export { PLAYING_CARDS_EN } from './cards.en';
