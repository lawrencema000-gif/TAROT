/**
 * Shared zod primitives + the canonical error envelope.
 *
 * Both client and edge functions import from this folder. Deno uses
 * `npm:zod@3`; the client uses the `zod` package from node_modules. The
 * schemas compile identically in both environments.
 *
 * Import pattern:
 *   Edge function:  import { z, ErrorResponse } from "../_schema/common.ts";
 *   Client:         import { z, ErrorResponse } from "../schema";
 */

// The `"zod"` specifier resolves via the import map in supabase/functions/deno.json
// when compiled by Deno (edge functions), and via package.json dependency when
// compiled by Vite/tsc (client). Same schema code runs in both environments.
import { z } from "zod";
export { z };

/**
 * The universal error envelope every edge function returns for 4xx/5xx.
 * The handler wrapper in _shared/handler.ts constructs this shape; the
 * client's apiClient parses it so callers get a typed error.
 */
export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlationId: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/**
 * Success envelope for handlers that return a plain object. Not every
 * endpoint uses this — some return raw shapes for backward compatibility
 * during Phase 1/2 migration. New endpoints SHOULD use the envelope.
 */
export const SuccessEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    correlationId: z.string().optional(),
  });

/** Locale set the app supports. Shared between every localized endpoint. */
export const Locale = z.enum(["en", "ja", "ko", "zh"]);
export type Locale = z.infer<typeof Locale>;

/** ISO date (YYYY-MM-DD). */
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** UUID v4/v5 — accepted from external services and the client. */
export const UUID = z.string().uuid();

/** Zodiac sign enum — used in horoscope/compatibility responses. */
export const ZodiacSign = z.enum([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]);
export type ZodiacSign = z.infer<typeof ZodiacSign>;

export const Planet = z.enum([
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
]);
export type Planet = z.infer<typeof Planet>;

export const AspectType = z.enum([
  "conjunction", "opposition", "trine", "square", "sextile",
]);
export type AspectType = z.infer<typeof AspectType>;
