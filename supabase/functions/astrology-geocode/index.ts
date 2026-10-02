import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * Forward-geocode a birth place string. Called during onboarding BEFORE the
 * user is signed in, so auth is optional. Rate limit (20 req / 60s / IP) is
 * enforced by the handler wrapper.
 *
 * Polish R5 M-6: Nominatim rejected every call (502 GEOCODE_UPSTREAM_FAILED)
 * because the request carried a generic User-Agent and no contact, which
 * its usage policy requires, and nothing throttled us to its 1 req/s. Even
 * with a proper identity Nominatim still refuses calls from the edge runtime
 * (the same request succeeds from a developer machine — shared cloud egress
 * is rate-limited on their side), so this version:
 *   - asks Open-Meteo's geocoder first (free, no key, city-level, ~1 s,
 *     carries the IANA timezone) — it answers "Tokyo", "Osaka", "Melbourne"
 *     and "Shibuya, Tokyo" correctly,
 *   - falls back to Nominatim for free-text places Open-Meteo cannot match,
 *     now identifying itself (User-Agent "Arcana/1.2 (support@arcana.app)" +
 *     the `email=` parameter) and serialised per isolate at ≥ 1.1 s apart,
 *   - remembers answers per isolate for a day so repeated searches cost nothing.
 * The response keeps the `{ results: [{ lat, lon, displayName }] }` shape
 * callers consume; `source`, `timezone` and `upstream` (provider failures,
 * for a non-blocking notice) are additive.
 */

interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
  /** IANA zone when the provider knows it (Open-Meteo does). */
  timezone?: string;
}

interface GeocodeRequest {
  birthPlace?: unknown;
}

const MAX_BIRTH_PLACE_LEN = 200;
// Strip ASCII control chars (including tab / newline — neither belongs in a
// place name).
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/g;

const USER_AGENT = "Arcana/1.2 (support@arcana.app)";
const CONTACT_EMAIL = "support@arcana.app";
const UPSTREAM_TIMEOUT_MS = 7_000;
// Nominatim usage policy: at most one request per second.
const NOMINATIM_MIN_INTERVAL_MS = 1_100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

function sanitizeBirthPlace(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(CONTROL_CHAR_RE, "").replace(/\s+/g, " ").trim();
  if (trimmed.length < 1 || trimmed.length > MAX_BIRTH_PLACE_LEN) return null;
  return trimmed;
}

// ── Per-isolate throttle (promise chain = mutex) ──────────────────────────
let lastNominatimAt = 0;
let nominatimLane: Promise<void> = Promise.resolve();

function nominatimSlot(): Promise<void> {
  const slot = nominatimLane.then(async () => {
    const wait = lastNominatimAt + NOMINATIM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatimAt = Date.now();
  });
  nominatimLane = slot.catch(() => {});
  return slot;
}

// ── Per-isolate answer cache ──────────────────────────────────────────────
const cache = new Map<string, { at: number; results: GeoResult[]; source: string }>();

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit;
}

function cacheSet(key: string, results: GeoResult[], source: string) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), results, source });
}

// ── Providers ─────────────────────────────────────────────────────────────
interface NominatimRow {
  lat: string;
  lon: string;
  display_name: string;
}

async function nominatim(place: string, acceptLanguage: string): Promise<GeoResult[]> {
  await nominatimSlot();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", place);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("email", CONTACT_EMAIL);
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
      "Accept-Language": acceptLanguage,
      "Referer": "https://tarotlife.app/",
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`nominatim ${res.status}`);
  }
  const data = (await res.json()) as NominatimRow[];
  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.displayName);
}

interface OpenMeteoRow {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
}

async function openMeteo(place: string, language: string): Promise<GeoResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  // Open-Meteo matches on the place NAME; a "City, Country" string finds
  // nothing, so search on the first comma-separated part.
  url.searchParams.set("name", place.split(",")[0].trim().slice(0, 100));
  url.searchParams.set("count", "5");
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`open-meteo ${res.status}`);
  }
  const data = await res.json();
  const rows: OpenMeteoRow[] = Array.isArray(data?.results) ? data.results : [];
  return rows
    .map((r) => {
      const parts = [r.name, r.admin1, r.country].filter(
        (p, i, arr): p is string => typeof p === "string" && p.length > 0 && arr.indexOf(p) === i,
      );
      return {
        lat: r.latitude,
        lon: r.longitude,
        displayName: parts.join(", "),
        timezone: r.timezone,
      };
    })
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.displayName);
}

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

      const acceptLanguage = (ctx.req.headers.get("accept-language") || "en").slice(0, 64);
      const language = acceptLanguage.split(",")[0].split("-")[0].trim().toLowerCase() || "en";
      const cacheKey = `${language}|${birthPlace.toLowerCase()}`;

      const cached = cacheGet(cacheKey);
      if (cached) {
        ctx.log.info("astrology_geocode.served", { resultCount: cached.results.length, source: cached.source, cached: true });
        return new Response(
          JSON.stringify({ results: cached.results, source: cached.source }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      let results: GeoResult[] = [];
      let source = "open-meteo";
      const failures: string[] = [];

      try {
        results = await openMeteo(birthPlace, language);
      } catch (e) {
        failures.push(String(e).slice(0, 120));
      }

      if (results.length === 0) {
        try {
          const alt = await nominatim(birthPlace, acceptLanguage);
          if (alt.length > 0) {
            results = alt;
            source = "nominatim";
          }
        } catch (e) {
          failures.push(String(e).slice(0, 120));
        }
      }

      if (results.length === 0 && failures.length >= 2) {
        ctx.log.error("astrology_geocode.upstream_failed", { failures });
        throw new AppError(
          "GEOCODE_UPSTREAM_FAILED",
          "Geocoding service unavailable",
          502,
        );
      }

      if (failures.length) {
        ctx.log.warn("astrology_geocode.provider_failed", { failures, servedBy: source, resultCount: results.length });
      }

      if (results.length > 0) cacheSet(cacheKey, results, source);
      ctx.log.info("astrology_geocode.served", { resultCount: results.length, source });

      // Preserve the `{ results }` shape callers already consume.
      return new Response(
        JSON.stringify({ results, source, upstream: failures }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
