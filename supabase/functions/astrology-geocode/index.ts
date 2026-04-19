import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  callerKey,
  checkRateLimit,
  rateLimitHeaders,
} from "../_shared/rate-limit.ts";

interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
}

const MAX_BIRTH_PLACE_LEN = 200;
// Strip ASCII control chars (except tab/newline will also be stripped — we
// don't want either in a place name).
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/g;

function sanitizeBirthPlace(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(CONTROL_CHAR_RE, "").trim();
  if (trimmed.length < 1 || trimmed.length > MAX_BIRTH_PLACE_LEN) return null;
  return trimmed;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req, "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Rate limit first (IP-keyed — this function runs pre-sign-in during
  // onboarding, so there's no user id yet). 20 req / 60s per caller.
  const rl = checkRateLimit(callerKey(req, null), 20, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", results: [] }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders(rl),
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const birthPlace = sanitizeBirthPlace((body as { birthPlace?: unknown }).birthPlace);

    if (!birthPlace) {
      return new Response(
        JSON.stringify({
          error: "birthPlace is required (string, 1..200 chars)",
          results: [],
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const encodedPlace = encodeURIComponent(birthPlace);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedPlace}&format=json&limit=5&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Arcana-Astrology-App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data: GeocodeResult[] = await response.json();

    const results = data.map((item) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
    }));

    return new Response(
      JSON.stringify({ results }),
      {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders(rl),
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Geocoding error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Geocoding failed",
        results: [],
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
