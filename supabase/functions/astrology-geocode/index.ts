import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface GeocodeRequest {
  birthPlace?: unknown;
}

const MAX_BIRTH_PLACE_LEN = 200;
// Strip ASCII control chars (including tab / newline — neither belongs in a
// place name).
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/g;

function sanitizeBirthPlace(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(CONTROL_CHAR_RE, "").trim();
  if (trimmed.length < 1 || trimmed.length > MAX_BIRTH_PLACE_LEN) return null;
  return trimmed;
}

/**
 * Forward-geocode a birth place string via Nominatim. Called during
 * onboarding BEFORE the user is signed in, so auth is optional.
 * Rate limit (20 req / 60s / IP) is enforced by the handler wrapper using
 * the same in-isolate sliding window as before.
 */
Deno.serve(
  handler<GeocodeRequest>({
    fn: "astrology-geocode",
    auth: "optional",
    rateLimit: { max: 20, windowMs: 60_000 },
    run: async (ctx, body) => {
      const birthPlace = sanitizeBirthPlace(body.birthPlace);

      if (!birthPlace) {
        throw new AppError(
          "INVALID_BIRTH_PLACE",
          "birthPlace is required (string, 1..200 chars)",
          400,
        );
      }

      const encodedPlace = encodeURIComponent(birthPlace);
      const nominatimUrl =
        `https://nominatim.openstreetmap.org/search?q=${encodedPlace}&format=json&limit=5&addressdetails=1`;

      const response = await fetch(nominatimUrl, {
        headers: { "User-Agent": "Arcana-Astrology-App/1.0" },
      });

      if (!response.ok) {
        ctx.log.error("astrology_geocode.nominatim_failed", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new AppError(
          "GEOCODE_UPSTREAM_FAILED",
          "Geocoding service unavailable",
          502,
        );
      }

      const data = (await response.json()) as GeocodeResult[];

      const results = data.map((item) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
      }));

      ctx.log.info("astrology_geocode.served", { resultCount: results.length });

      // Preserve the `{ results }` shape callers already consume.
      return new Response(
        JSON.stringify({ results }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
