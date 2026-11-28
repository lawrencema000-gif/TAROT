/**
 * The reading-summary engine (WP-NF-02): a short summary and the whole
 * picture for every tarot reading, and one card read alone (tarot or
 * playing), computed from the app's own card data. Pure and synchronous
 * once `preloadReadingSummary(locale)` has resolved; no AI call, no network
 * request beyond the lazy chunks, nothing stored.
 */
export { summarizeTarot } from './compose';
export { summarizeSingle } from './single';
export { preloadReadingSummary, isReadingSummaryReady, setSummaryDeck } from './loadPhrases';
export { TAROT_ROLES, DIGNITY_PAIRS, rolesFor } from './roles';
export type {
  Deck,
  PositionRole,
  ReadingSummary,
  SingleInput,
  SummaryInput,
  SummaryPart,
} from './types';
