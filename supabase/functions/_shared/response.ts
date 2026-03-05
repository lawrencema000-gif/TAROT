import { getCorsHeaders } from "./cors.ts";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Return a JSON success response with CORS headers. */
export function jsonResponse(
  data: Record<string, JsonValue>,
  req: Request,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

/** Return a JSON error response with CORS headers. */
export function errorResponse(
  message: string,
  req: Request,
  status = 400
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

/** Return a 405 Method Not Allowed response. */
export function methodNotAllowed(req: Request): Response {
  return errorResponse("Method not allowed", req, 405);
}
