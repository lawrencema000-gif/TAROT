import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AppError, handler } from "../_shared/handler.ts";

/**
 * Returns the caller's saved natal chart (single row from
 * `astrology_natal_charts`). Response shape is the legacy one the client
 * reads directly — `{ natalChart, bigThree, dominants, aspects }` — so we
 * return a raw Response to bypass the default `{data}` envelope.
 */
Deno.serve(
  handler({
    fn: "astrology-get-chart",
    auth: "required",
    rateLimit: { max: 60, windowMs: 60_000 },
    run: async (ctx) => {
      const { data: chart, error: chartError } = await ctx.supabase
        .from("astrology_natal_charts")
        .select("*")
        .eq("user_id", ctx.userId!)
        .maybeSingle();

      if (chartError) {
        ctx.log.error("astrology_get_chart.query_failed", { err: chartError });
        throw new AppError("CHART_FETCH_FAILED", "Failed to retrieve chart", 500);
      }

      if (!chart) {
        ctx.log.info("astrology_get_chart.not_found");
        return new Response(
          JSON.stringify({
            error: "No chart found",
            natalChart: null,
            bigThree: null,
            dominants: null,
            aspects: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const natalChart = {
        ...(chart.natal_json || {}),
        bigThree: chart.big_three_json || null,
        dominants: chart.dominants_json || null,
        aspects: chart.aspects_json || [],
      };

      ctx.log.info("astrology_get_chart.served");

      return new Response(
        JSON.stringify({
          natalChart,
          bigThree: chart.big_three_json || null,
          dominants: chart.dominants_json || null,
          aspects: chart.aspects_json || [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  }),
);
