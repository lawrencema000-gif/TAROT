import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "../_shared/handler.ts";
import { captureEdgeException } from "../_shared/sentry.ts";

/**
 * Daily backlinks snapshot — pulls referring domain data from the Bing
 * Webmaster Tools API and stores a daily snapshot in
 * backlinks_daily_snapshots.
 *
 * Bing Webmaster's API is the only free authoritative source for
 * backlink data. Ahrefs/Semrush/Moz are paid; Google deprecated their
 * link report years ago. So Bing is the realistic option here.
 *
 * Auth flow: requires a Bing Webmaster API key with Site URL +
 * "Inbound Links" scope. The key is stored as the BING_WEBMASTER_API_KEY
 * edge-function secret. Without it, the function no-ops gracefully.
 *
 * What it pulls:
 *   - GET /webmaster/api.svc/json/GetLinkCounts (total backlinks)
 *   - GET /webmaster/api.svc/json/GetUrlLinks (top referring URLs)
 * Diffs against yesterday's snapshot to surface new + lost domains.
 *
 * Auth: webhook-style. CRON_SECRET via X-Webhook-Secret.
 */

const SITE_URL = "https://tarotlife.app/";
const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

interface LinkRow {
  Url: string;
  Count?: number;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

Deno.serve(handler<unknown>({
  fn: "daily-backlinks-snapshot",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const apiKey = Deno.env.get("BING_WEBMASTER_API_KEY") || "";
    if (!apiKey) {
      ctx.log.warn("daily_backlinks.no_api_key", { reason: "BING_WEBMASTER_API_KEY not set" });
      return { ok: true, skipped: true, reason: "bing_api_key_not_configured" };
    }

    let topRefs: LinkRow[] = [];
    let totalBacklinks = 0;
    try {
      const linkCountsRes = await fetch(
        `${BING_API_BASE}/GetLinkCounts?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${apiKey}`,
      );
      if (linkCountsRes.ok) {
        const data = await linkCountsRes.json();
        totalBacklinks = (data?.d ?? []).reduce((acc: number, r: { Count?: number }) => acc + (r.Count || 0), 0);
      }

      const topRefsRes = await fetch(
        `${BING_API_BASE}/GetUrlLinks?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${apiKey}`,
      );
      if (topRefsRes.ok) {
        const data = await topRefsRes.json();
        topRefs = (data?.d ?? []) as LinkRow[];
      }
    } catch (e) {
      captureEdgeException(e, {
        fn: "daily-backlinks-snapshot",
        correlationId: ctx.correlationId,
        level: "error",
        tags: { stage: "bing_fetch" },
      });
      return { ok: false, error: String(e) };
    }

    const domainCounts = new Map<string, { count: number; sample: string }>();
    for (const r of topRefs) {
      const d = extractDomain(r.Url);
      const cur = domainCounts.get(d) || { count: 0, sample: r.Url };
      cur.count += 1;
      domainCounts.set(d, cur);
    }
    const topDomains = [...domainCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50)
      .map(([domain, v]) => ({ domain, links: v.count, sample: v.sample }));

    // Diff against yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const { data: prevRow } = await ctx.supabase
      .from("backlinks_daily_snapshots")
      .select("top_referring_domains")
      .eq("snapshot_date", yesterdayStr)
      .maybeSingle();

    const prevDomains = new Set<string>(
      ((prevRow?.top_referring_domains as Array<{ domain: string }> | null) || []).map((d) => d.domain),
    );
    const todayDomains = new Set(topDomains.map((d) => d.domain));
    const newDomains = topDomains.filter((d) => !prevDomains.has(d.domain)).map((d) => d.domain);
    const lostDomains = [...prevDomains].filter((d) => !todayDomains.has(d));

    const { error } = await ctx.supabase
      .from("backlinks_daily_snapshots")
      .upsert({
        snapshot_date: today,
        total_backlinks: totalBacklinks,
        referring_domains: domainCounts.size,
        new_domains_today: newDomains,
        lost_domains_today: lostDomains,
        top_referring_domains: topDomains,
        raw_response: { topRefs: topRefs.slice(0, 100), totalBacklinks },
      }, { onConflict: "snapshot_date" });
    if (error) {
      captureEdgeException(error, {
        fn: "daily-backlinks-snapshot",
        correlationId: ctx.correlationId,
        level: "warning",
        tags: { stage: "upsert" },
      });
      return { ok: false, error: error.message };
    }

    ctx.log.info("daily_backlinks.done", {
      total: totalBacklinks,
      domains: domainCounts.size,
      newDomains: newDomains.length,
      lostDomains: lostDomains.length,
    });
    return {
      ok: true,
      snapshot_date: today,
      total_backlinks: totalBacklinks,
      referring_domains: domainCounts.size,
      new_domains: newDomains,
      lost_domains: lostDomains,
    };
  },
}));
