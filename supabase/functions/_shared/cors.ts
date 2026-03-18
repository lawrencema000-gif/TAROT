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

/**
 * Build CORS headers from the request Origin, allowing only known origins.
 * Falls back to the first allowed origin if the request origin is unknown.
 */
export function getCorsHeaders(
  req: Request,
  methods = "GET, POST, PUT, DELETE, OPTIONS"
): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, Apikey",
    Vary: "Origin",
  };
}

/** Standard response for CORS preflight (OPTIONS) requests. */
export function handleCorsPreFlight(req: Request): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
