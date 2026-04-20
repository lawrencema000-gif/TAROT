/**
 * Client-side entry point for shared zod schemas.
 *
 * The canonical schemas live in `supabase/functions/_schema/` so Deno
 * (edge functions) and Vite (client) import the same file. This folder
 * is just a re-export barrel so callers can `import { DailyResponse } from '../schema'`.
 *
 * Edge functions use `npm:zod@3`; the client uses the `zod` package from
 * node_modules. The schema definitions are identical in both.
 */

export * from '../../supabase/functions/_schema/common';
export * from '../../supabase/functions/_schema/astrology';
export * from '../../supabase/functions/_schema/reading';
