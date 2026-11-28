/**
 * A cached horoscope reading belongs to one natal chart (p12 WP-P2-06,
 * gap-1-04).
 *
 * astrology_horoscope_cache rows carry chart_computed_at: the
 * astrology_natal_charts.computed_at of the chart the reading was built from.
 * A row is served only while that is still the member's chart, so after a
 * recast (a birth-detail correction) the next open builds the reading of the
 * new chart. A stamp, unlike deleting rows on recast, gives the right answer
 * whatever order a daily request and a recast commit in.
 *
 * Pure: no Deno or npm imports, so vitest imports it statically.
 */

/** The cache columns the freshness rule reads. */
export interface CacheStampRow {
  chart_computed_at?: string | null;
  generated_at?: string | null;
}

/** The chart columns the freshness rule reads. */
export interface ChartStamp {
  computed_at?: string | null;
}

/**
 * True only when the member has a chart and the row was built from it: its
 * stamp names the chart's computed_at, or the row predates the stamp column
 * (stamp null) and was generated at or after the chart was cast. No row, no
 * chart, or an unreadable time is a miss.
 */
export function isFreshFor(row: CacheStampRow | null | undefined, chart: ChartStamp | null | undefined): boolean {
  if (!row || !chart) return false;
  const cast = Date.parse(chart.computed_at ?? "");
  if (Number.isNaN(cast)) return false;
  if (row.chart_computed_at != null) return Date.parse(row.chart_computed_at) === cast;
  const generated = Date.parse(row.generated_at ?? "");
  return !Number.isNaN(generated) && generated >= cast;
}

/** The upsert row of a reading built from the chart cast at `chartComputedAt` (onConflict "user_id,date,type"). */
export function stampedRow(
  userId: string,
  date: string,
  type: string,
  content: unknown,
  chartComputedAt: string | null | undefined,
  now: Date,
): {
  user_id: string;
  date: string;
  type: string;
  content_json: unknown;
  generated_at: string;
  chart_computed_at: string | null;
} {
  return {
    user_id: userId,
    date,
    type,
    content_json: content,
    generated_at: now.toISOString(),
    chart_computed_at: chartComputedAt ?? null,
  };
}
