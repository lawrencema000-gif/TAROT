const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://arcana.app",
  "https://www.arcana.app",
  "https://tarotlife.app",
  "https://www.tarotlife.app",
  "https://arcana-ritual-app.netlify.app",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
];

// Netlify preview deploys land at `https://<branch-or-slug>--arcana-ritual-app.netlify.app`.
// Keep these allowed automatically so QA agents testing audit-smoke builds
// don't get `Access-Control-Allow-Origin: http://localhost:5173` back.
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+--arcana-ritual-app\.netlify\.app$/i,
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/**
 * Build CORS headers from the request Origin, allowing only known origins.
 * For unknown origins we reflect `null` (browsers treat that as "not allowed")
 * rather than falling back to localhost, which silently blocked every
 * preview-deploy call.
 */
export function getCorsHeaders(
  req: Request,
  methods = "GET, POST, PUT, DELETE, OPTIONS"
): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": methods,
    // Correlation ID header was added in Phase 1 i18n work (handler.ts
    // reads X-Correlation-Id from the client and propagates it into logs
    // + the response). It MUST be listed here or every authed
    // /functions/v1/* call fails preflight in the browser — horoscope,
    // generate-reading, ad-config, all of them.
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, Apikey, X-Correlation-Id",
    "Access-Control-Expose-Headers": "X-Correlation-Id",
    Vary: "Origin",
  };
}

/** Standard response for CORS preflight (OPTIONS) requests. */
export function handleCorsPreFlight(req: Request): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
