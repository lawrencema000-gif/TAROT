/**
 * Shared API contracts for astrology-{daily,weekly,monthly,transit-calendar,
 * compute-natal,get-chart,geocode} edge functions.
 *
 * Any change here is a breaking API change — follow the versioning rule in
 * .audit/SCALABILITY-PLAN.md (either keep the old fields as `.optional()`
 * or ship /v2/ alongside).
 */

import { z, Locale, ISODate, ZodiacSign, Planet, AspectType } from "./common.ts";

// ─── Daily ──────────────────────────────────────────────────────

export const DailyRequest = z.object({
  /** Optional explicit date override (default: today in timezone or UTC). */
  date: ISODate.optional(),
  /** IANA timezone. When present, "today" is computed in this TZ. */
  timezone: z.string().max(64).optional(),
  /** Locale for theme/summary/briefs. Default 'en'. */
  locale: Locale.optional(),
});
export type DailyRequest = z.infer<typeof DailyRequest>;

export const TransitHighlight = z.object({
  planet: Planet,
  aspect: AspectType,
  natalPlanet: Planet,
  brief: z.string(),
});

export const DailyResponse = z.object({
  date: ISODate,
  theme: z.string(),
  summary: z.string(),
  moonSign: ZodiacSign,
  /** Localized display name; client may fall back to localizeSignName(). */
  moonSignLocalized: z.string().optional(),
  moonHouse: z.number().int().min(1).max(12).nullable(),
  transitHighlights: z.array(TransitHighlight),
  categories: z.object({
    love: z.string(),
    career: z.string(),
    money: z.string(),
    energy: z.string(),
  }),
  doList: z.array(z.string()),
  avoidList: z.array(z.string()),
  powerMove: z.string(),
  ritual: z.string(),
  journalPrompt: z.string(),
});
export type DailyResponse = z.infer<typeof DailyResponse>;

// ─── Weekly ─────────────────────────────────────────────────────

export const WeeklyRequest = z.object({
  locale: Locale.optional(),
});
export type WeeklyRequest = z.infer<typeof WeeklyRequest>;

export const WeeklyResponse = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  mainStoryline: z.string(),
  keyMoments: z.array(z.object({
    day: z.string(),
    event: z.string(),
    advice: z.string(),
  })),
  bestDays: z.array(z.object({
    activity: z.string(),
    day: z.string(),
  })),
});
export type WeeklyResponse = z.infer<typeof WeeklyResponse>;

// ─── Monthly ────────────────────────────────────────────────────

export const MonthlyRequest = z.object({
  locale: Locale.optional(),
});
export type MonthlyRequest = z.infer<typeof MonthlyRequest>;

export const MonthlyResponse = z.object({
  month: z.string(),
  overview: z.string(),
  newMoon: z.object({
    date: z.string(),
    sign: ZodiacSign,
    house: z.number().int().min(1).max(12).nullable(),
    theme: z.string(),
  }).nullable(),
  fullMoon: z.object({
    date: z.string(),
    sign: ZodiacSign,
    house: z.number().int().min(1).max(12).nullable(),
    theme: z.string(),
  }).nullable(),
  keyDates: z.array(z.object({ date: z.string(), event: z.string() })),
  oneThingToDoThisMonth: z.string(),
  outerPlanetTransits: z.array(z.object({
    planet: Planet,
    sign: ZodiacSign,
    theme: z.string(),
  })),
});
export type MonthlyResponse = z.infer<typeof MonthlyResponse>;

// ─── Transit Calendar ──────────────────────────────────────────

export const TransitCalendarRequest = z.object({
  days: z.number().int().min(1).max(90).optional(),
  natalPlanet: Planet.optional(),
  locale: Locale.optional(),
});
export type TransitCalendarRequest = z.infer<typeof TransitCalendarRequest>;

export const TransitEvent = z.object({
  date: z.string(),
  transitPlanet: Planet,
  natalPlanet: Planet,
  aspectType: AspectType,
  orb: z.number(),
  transitSign: ZodiacSign,
  natalSign: ZodiacSign,
});
export type TransitEvent = z.infer<typeof TransitEvent>;

export const TransitCalendarResponse = z.object({
  events: z.array(TransitEvent),
});
export type TransitCalendarResponse = z.infer<typeof TransitCalendarResponse>;

// ─── Geocode ───────────────────────────────────────────────────

export const GeocodeRequest = z.object({
  birthPlace: z.string().min(1).max(200),
});
export type GeocodeRequest = z.infer<typeof GeocodeRequest>;

export const GeocodeResponse = z.object({
  results: z.array(z.object({
    lat: z.number(),
    lon: z.number(),
    displayName: z.string(),
  })),
});
export type GeocodeResponse = z.infer<typeof GeocodeResponse>;

// ─── Compute Natal + Get Chart ─────────────────────────────────

export const ComputeNatalRequest = z.object({
  birthDate: ISODate,
  birthTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  timezone: z.string().max(64),
  chartMode: z.string().max(32),
  locale: Locale.optional(),
});
export type ComputeNatalRequest = z.infer<typeof ComputeNatalRequest>;
