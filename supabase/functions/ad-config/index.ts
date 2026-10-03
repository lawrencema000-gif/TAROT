import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";
import { AdConfigRequest, type AdConfigRequest as TAdConfigRequest } from "../_schema/reading.ts";
import { rewardedAdStatus } from "../_shared/rewarded-ads.ts";

/**
 * Returns the client's ad configuration (ad-unit IDs, show/hide flags, daily
 * stats). Callable pre-sign-in; authenticated calls also get dailyStats.
 *
 * Migrated to _shared/handler.ts — auth, CORS, rate-limit, logging, and
 * error envelope are all handled by the wrapper. This file contains only
 * the business logic.
 */
Deno.serve(
  handler<TAdConfigRequest>({
    fn: "ad-config",
    auth: "optional",
    methods: ["GET", "POST"],
    rateLimit: { max: 60, windowMs: 60_000 },
    // Phase 2: body shape validated. GET requests use query string instead
    // of body, so the schema is only applied to POST payloads (handler skips
    // validation when there's no body).
    requestSchema: AdConfigRequest,
    run: async (ctx, body) => {
      // Platform can come from query string (GET) or body (POST).
      const url = new URL(ctx.req.url);
      const platform = (ctx.req.method === "GET"
        ? url.searchParams.get("platform") ?? "android"
        : body.platform ?? "android").toLowerCase();

      if (!["android", "ios"].includes(platform)) {
        throw new AppError("INVALID_PLATFORM", "platform must be 'android' or 'ios'", 400);
      }

      const { data: configData, error: configError } = await ctx.supabase.rpc(
        "get_ad_config",
        { p_platform: platform, p_user_id: ctx.userId },
      );
      if (configError) {
        ctx.log.error("ad_config.rpc_failed", { err: configError, platform });
        throw new AppError("AD_CONFIG_FETCH_FAILED", "Failed to fetch ad configuration", 500);
      }

      let dailyStats: Record<string, unknown> | null = null;
      if (ctx.userId) {
        const [{ data }, status] = await Promise.all([
          ctx.supabase.rpc("get_user_daily_ad_stats", { p_user_id: ctx.userId }),
          rewardedAdStatus(ctx.supabase, ctx.userId),
        ]);
        dailyStats = data && typeof data === "object" ? { ...(data as Record<string, unknown>) } : null;
        // get_user_daily_ad_stats still returns the 999999 "unlimited"
        // sentinel from 2026-05-22, but the credit has been capped at 6 a
        // day since 20261003000005. Tell the client the truth so it stops
        // offering an ad that would earn nothing (p7 #33).
        if (status) {
          dailyStats = {
            ...(dailyStats ?? {}),
            rewardedRemaining: status.creditsRemaining,
            rewardedCreditsToday: status.creditsToday,
            rewardedResetAt: status.resetAt,
            rewardedNextAt: status.nextAvailableAt,
          };
        }
      }

      ctx.log.info("ad_config.served", { platform, hasUser: !!ctx.userId });

      // Shape-preserving return: the client currently consumes this object
      // directly (not `{data: ...}`). Use a raw Response so we don't break
      // that contract during Phase 1. Phase 2 will migrate callers to the
      // `{data}` envelope with a typed zod schema.
      return new Response(
        JSON.stringify({
          ...configData,
          dailyStats,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
