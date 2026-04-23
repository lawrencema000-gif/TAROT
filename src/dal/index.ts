/**
 * Data Access Layer (DAL)
 *
 * The ONLY module group in the client that imports the Supabase client directly.
 * UI, pages, hooks, and services must import from `../dal` (or `../../dal`) — never
 * from `../lib/supabase` — so that every read/write is:
 *   - typed
 *   - logged on failure via captureException
 *   - surfaces errors as a `Result` union instead of throwing
 *
 * Tables deliberately NOT represented here:
 *   - `profiles` — owned by AuthContext.updateProfile / fetchProfile
 *   - `achievements`, `user_achievements`, `achievement_shares` — encapsulated in
 *     services/achievements.ts which also owns achievement-related RPCs
 *   - `user_preferences` — touched only inside services/storage.ts favorite-card helpers
 *   - any table read/written only inside edge functions
 */

export * as dailyRituals from './dailyRituals';
export * as savedHighlights from './savedHighlights';
export * as journalEntries from './journalEntries';
export * as tarotReadings from './tarotReadings';
export * as quizResults from './quizResults';
export * as blogPosts from './blogPosts';
export * as dailyReadingsCache from './dailyReadingsCache';
export * as premiumReadings from './premiumReadings';
export * as contentInteractions from './contentInteractions';
export * as rewardedAdUnlocks from './rewardedAdUnlocks';
export * as featureFlags from './featureFlags';
export * as community from './community';

export type { Result } from './dailyRituals';
