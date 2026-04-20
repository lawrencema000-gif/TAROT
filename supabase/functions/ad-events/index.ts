import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

type AdType = "banner" | "interstitial" | "rewarded" | "app_open";
type ActionTrigger =
  | "reading"
  | "quiz"
  | "journal"
  | "app_launch"
  | "navigation"
  | "feature_unlock";

interface AdEvent {
  adType: AdType;
  platform: "android" | "ios";
  adUnitId: string;
  actionTrigger: ActionTrigger;
  durationMs?: number;
  completed?: boolean;
  clicked?: boolean;
  rewardAmount?: number;
  rewardType?: string;
  errorCode?: string;
}

interface AdEventsRequest {
  events?: AdEvent[];
}

const MAX_EVENTS_PER_REQUEST = 100;

function isValidAdType(adType: string): adType is AdType {
  return ["banner", "interstitial", "rewarded", "app_open"].includes(adType);
}

function isValidPlatform(platform: string): platform is "android" | "ios" {
  return ["android", "ios"].includes(platform);
}

function isValidActionTrigger(trigger: string): trigger is ActionTrigger {
  return [
    "reading",
    "quiz",
    "journal",
    "app_launch",
    "navigation",
    "feature_unlock",
  ].includes(trigger);
}

Deno.serve(
  handler<AdEventsRequest>({
    fn: "ad-events",
    auth: "required",
    rateLimit: { max: 120, windowMs: 60_000 },
    run: async (ctx, body) => {
      const events = body.events;
      if (!events || !Array.isArray(events) || events.length === 0) {
        throw new AppError("NO_EVENTS", "events[] must contain at least one event", 400);
      }

      if (events.length > MAX_EVENTS_PER_REQUEST) {
        throw new AppError(
          "TOO_MANY_EVENTS",
          `Maximum ${MAX_EVENTS_PER_REQUEST} events per request`,
          400,
          { limit: MAX_EVENTS_PER_REQUEST, provided: events.length },
        );
      }

      const results: { success: boolean; id?: string; error?: string }[] = [];

      for (const event of events) {
        if (!isValidAdType(event.adType)) {
          results.push({ success: false, error: `Invalid ad type: ${event.adType}` });
          continue;
        }

        if (!isValidPlatform(event.platform)) {
          results.push({ success: false, error: `Invalid platform: ${event.platform}` });
          continue;
        }

        if (!isValidActionTrigger(event.actionTrigger)) {
          results.push({ success: false, error: `Invalid action trigger: ${event.actionTrigger}` });
          continue;
        }

        const { data, error } = await ctx.supabase.rpc("record_ad_impression", {
          p_user_id: ctx.userId,
          p_ad_type: event.adType,
          p_platform: event.platform,
          p_ad_unit_id: event.adUnitId,
          p_action_trigger: event.actionTrigger,
          p_duration_ms: event.durationMs || 0,
          p_completed: event.completed || false,
          p_clicked: event.clicked || false,
          p_reward_amount: event.rewardAmount || 0,
          p_reward_type: event.rewardType || null,
          p_error_code: event.errorCode || null,
        });

        if (error) {
          ctx.log.error("ad_events.record_failed", { err: error });
          results.push({ success: false, error: error.message });
        } else {
          results.push({ success: true, id: data });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      ctx.log.info("ad_events.processed", {
        count: events.length,
        success: successCount,
        failed: failCount,
      });

      return new Response(
        JSON.stringify({
          processed: events.length,
          success: successCount,
          failed: failCount,
          results,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
