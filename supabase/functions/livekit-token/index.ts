/**
 * LiveKit token mint — short-lived JWT for a user to join a specific room.
 *
 * Two supported room kinds:
 *   - advisor-session:<session_id> — 1:1 audio between client and advisor.
 *     Both participants must appear in public.advisor_sessions for that id.
 *     Token permits publish + subscribe (both can talk).
 *   - live-room:<room_id>          — scheduled group broadcast.
 *     The host (live_rooms.host_user_id) gets publish; all other participants
 *     get subscribe-only. RSVP is required (or admin override).
 *
 * Env required:
 *   LIVEKIT_API_KEY
 *   LIVEKIT_API_SECRET
 *   LIVEKIT_WS_URL  — e.g. wss://your-project.livekit.cloud
 *
 * If any env var is missing we return 503 cleanly — the client falls back
 * to the "audio coming soon" state.
 */

import { AppError, handler } from "../_shared/handler.ts";
import { z } from "npm:zod@3.24.1";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const RequestSchema = z.object({
  room: z.string().min(3).max(128),
});
type Req = z.infer<typeof RequestSchema>;

interface Resp {
  token: string;
  wsUrl: string;
  room: string;
  identity: string;
  canPublish: boolean;
  expiresAt: string;
}

interface VideoGrant {
  room: string;
  roomJoin: boolean;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData?: boolean;
}

async function signLiveKitToken(params: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string | null;
  grant: VideoGrant;
  ttlSeconds: number;
}): Promise<string> {
  const { apiKey, apiSecret, identity, name, grant, ttlSeconds } = params;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const payload: Record<string, unknown> = {
    iss: apiKey,
    sub: identity,
    exp: getNumericDate(ttlSeconds),
    nbf: getNumericDate(0),
    video: grant,
  };
  if (name) payload.name = name;
  return create({ alg: "HS256", typ: "JWT" }, payload, key);
}

export default handler<Req, Resp>({
  fn: "livekit-token",
  auth: "required",
  methods: ["POST"],
  rateLimit: { max: 30, windowMs: 60_000 },
  requestSchema: RequestSchema,
  run: async (ctx, body) => {
    const apiKey    = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const wsUrl     = Deno.env.get("LIVEKIT_WS_URL");
    if (!apiKey || !apiSecret || !wsUrl) {
      throw new AppError("LIVEKIT_NOT_CONFIGURED", "LiveKit is not yet configured", 503);
    }

    const userId = ctx.userId!;
    const roomName = body.room;

    // Parse room kind + id
    const match = roomName.match(/^(advisor-session|live-room):([a-f0-9-]{8,})$/i);
    if (!match) throw new AppError("INVALID_ROOM", "Unknown room format", 400);
    const [, kind, entityId] = match;

    let canPublish = false;
    let displayName: string | null = null;

    if (kind === "advisor-session") {
      const { data: session } = await ctx.supabase
        .from("advisor_sessions")
        .select("client_user_id, advisor_id, state")
        .eq("id", entityId)
        .maybeSingle();
      if (!session) throw new AppError("SESSION_NOT_FOUND", "Session not found", 404);
      if (!["scheduled", "active"].includes(session.state as string)) {
        throw new AppError("SESSION_NOT_LIVE", "Session is not live", 410);
      }
      const { data: advisor } = await ctx.supabase
        .from("advisor_profiles")
        .select("user_id, display_name")
        .eq("id", session.advisor_id)
        .maybeSingle();
      const clientId = session.client_user_id as string;
      const advisorUserId = (advisor?.user_id as string) ?? null;
      if (userId !== clientId && userId !== advisorUserId) {
        throw new AppError("NOT_PARTICIPANT", "Not a session participant", 403);
      }
      canPublish = true; // both parties can speak
      if (userId === advisorUserId) displayName = (advisor?.display_name as string) ?? null;
    } else if (kind === "live-room") {
      const { data: room } = await ctx.supabase
        .from("live_rooms")
        .select("host_user_id, state, capacity")
        .eq("id", entityId)
        .maybeSingle();
      if (!room) throw new AppError("ROOM_NOT_FOUND", "Room not found", 404);
      if (!["scheduled", "live"].includes(room.state as string)) {
        throw new AppError("ROOM_NOT_LIVE", "Room is not live", 410);
      }
      const isHost = userId === (room.host_user_id as string);
      if (!isHost) {
        // Must have an RSVP row
        const { data: rsvp } = await ctx.supabase
          .from("live_room_rsvps")
          .select("user_id")
          .eq("room_id", entityId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!rsvp) throw new AppError("NOT_RSVPD", "RSVP required to join", 403);
      }
      canPublish = isHost;
    } else {
      throw new AppError("INVALID_ROOM", "Unknown room kind", 400);
    }

    // Look up a display name for the token (best-effort)
    if (!displayName) {
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      displayName = (profile?.display_name as string) ?? null;
    }

    const ttlSeconds = 2 * 60 * 60; // 2 hours — LiveKit recommends short TTL
    const token = await signLiveKitToken({
      apiKey,
      apiSecret,
      identity: userId,
      name: displayName,
      grant: {
        room: roomName,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
        canPublishData: canPublish,
      },
      ttlSeconds,
    });

    ctx.log.info("livekit_token.minted", { room: roomName, canPublish });

    return {
      token,
      wsUrl,
      room: roomName,
      identity: userId,
      canPublish,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  },
});
