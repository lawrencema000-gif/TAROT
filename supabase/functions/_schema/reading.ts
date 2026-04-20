/**
 * API contracts for generate-reading + ad-config + ad-events.
 */
import { z, Locale } from "./common.ts";

// ─── Generate Reading ──────────────────────────────────────────

export const TarotCardInput = z.object({
  id: z.number().int(),
  name: z.string().max(80),
  reversed: z.boolean(),
  keywords: z.array(z.string()).optional(),
  meaningUpright: z.string().optional(),
  meaningReversed: z.string().optional(),
  loveMeaning: z.string().optional(),
  careerMeaning: z.string().optional(),
});
export type TarotCardInput = z.infer<typeof TarotCardInput>;

export const ReadingRequest = z.object({
  cards: z.array(TarotCardInput).min(1).max(10),
  question: z.string().max(500).optional(),
  spreadType: z.string().max(40),
  zodiacSign: z.string().max(20).optional(),
  goals: z.array(z.string().max(40)).max(10).optional(),
  focusArea: z.enum(["love", "career", "general"]).optional(),
  locale: Locale.optional(),
});
export type ReadingRequest = z.infer<typeof ReadingRequest>;

export const ReadingResponse = z.object({
  interpretation: z.string(),
  usedLlm: z.boolean(),
  cardCount: z.number().int().min(1).max(10),
});
export type ReadingResponse = z.infer<typeof ReadingResponse>;

// ─── Ad Config ─────────────────────────────────────────────────

export const AdConfigRequest = z.object({
  platform: z.enum(["android", "ios"]).optional(),
});
export type AdConfigRequest = z.infer<typeof AdConfigRequest>;

export const AdUnitConfig = z.object({
  adUnitId: z.string(),
  isEnabled: z.boolean(),
  settings: z.record(z.unknown()).optional(),
});

export const AdConfigResponse = z.object({
  adUnits: z.record(AdUnitConfig),
  showAds: z.boolean(),
  isAdFree: z.boolean(),
  isPremium: z.boolean(),
  dailyStats: z.object({
    date: z.string(),
    totalImpressions: z.number().int(),
    rewardedWatched: z.number().int(),
    rewardedRemaining: z.number().int(),
    byType: z.object({
      banner: z.number().int(),
      interstitial: z.number().int(),
      rewarded: z.number().int(),
      app_open: z.number().int(),
    }).optional(),
  }).nullable(),
  timestamp: z.string(),
});
export type AdConfigResponse = z.infer<typeof AdConfigResponse>;

// ─── Ad Events ─────────────────────────────────────────────────

export const AdEvent = z.object({
  adType: z.enum(["banner", "interstitial", "rewarded", "app_open"]),
  platform: z.enum(["android", "ios"]),
  adUnitId: z.string(),
  actionTrigger: z.enum(["reading", "quiz", "journal", "app_launch", "navigation", "feature_unlock"]),
  durationMs: z.number().int().nonnegative().optional(),
  completed: z.boolean().optional(),
  clicked: z.boolean().optional(),
  rewardAmount: z.number().int().optional(),
  rewardType: z.string().max(40).optional(),
  errorCode: z.string().max(80).optional(),
});
export type AdEvent = z.infer<typeof AdEvent>;

export const AdEventsRequest = z.object({
  events: z.array(AdEvent).min(1).max(100),
});
export type AdEventsRequest = z.infer<typeof AdEventsRequest>;
