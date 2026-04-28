import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "../_shared/handler.ts";
import { captureEdgeException } from "../_shared/sentry.ts";

/**
 * Daily SEO digest email — pulls latest seo + geo + backlinks snapshots
 * and emails a one-screen summary to the admin inbox.
 *
 * Sender: Resend API if RESEND_API_KEY is set; otherwise no-op (logs the
 * digest contents instead so it's still visible in edge function logs).
 *
 * Recipient: ADMIN_EMAIL env var (defaults to lawrence.ma000@gmail.com).
 *
 * Schedule: pg_cron at 09:30 UTC daily — 30 minutes after the snapshot
 * functions complete so all three data sources have landed.
 *
 * Auth: webhook-style. CRON_SECRET via X-Webhook-Secret.
 */

const SITE = "tarotlife.app";

interface SeoRow {
  snapshot_date: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  top_queries: Array<{ q: string; clicks: number; impr: number }>;
}

interface GeoRow {
  engine: string;
  query: string;
  mentioned: boolean;
  position: number | null;
}

interface BacklinkRow {
  snapshot_date: string;
  total_backlinks: number;
  referring_domains: number;
  new_domains_today: string[];
  lost_domains_today: string[];
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString();
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return `${(n * 100).toFixed(2)}%`;
}

function buildHtml(seo: SeoRow | null, geo: GeoRow[], backlinks: BacklinkRow | null): string {
  const today = new Date().toISOString().split("T")[0];
  const geoMentioned = geo.filter((g) => g.mentioned);
  const mentionRate = geo.length ? Math.round((geoMentioned.length / geo.length) * 100) : 0;
  const byEngine = new Map<string, { total: number; mentioned: number }>();
  for (const g of geo) {
    const e = byEngine.get(g.engine) || { total: 0, mentioned: 0 };
    e.total++;
    if (g.mentioned) e.mentioned++;
    byEngine.set(g.engine, e);
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Arcana SEO digest — ${today}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#f7f7fb;padding:20px;max-width:680px;margin:0 auto;">
  <div style="background:#fff;border-radius:14px;padding:28px;border:1px solid #e2e2ee;">
    <h1 style="margin:0 0 6px 0;font-size:22px;color:#0a0a0f;">Arcana / ${SITE} — SEO digest</h1>
    <p style="margin:0 0 24px 0;color:#706a82;font-size:14px;">${today}</p>

    <h2 style="font-size:16px;margin:0 0 8px 0;color:#0a0a0f;">Search performance (Google Search Console)</h2>
    ${seo ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#706a82;">Date covered</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${seo.snapshot_date}</td></tr>
        <tr><td style="padding:6px 0;color:#706a82;">Clicks</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${fmt(seo.total_clicks)}</td></tr>
        <tr><td style="padding:6px 0;color:#706a82;">Impressions</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${fmt(seo.total_impressions)}</td></tr>
        <tr><td style="padding:6px 0;color:#706a82;">CTR</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${pct(seo.avg_ctr)}</td></tr>
        <tr><td style="padding:6px 0;color:#706a82;">Avg. position</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${seo.avg_position?.toFixed(1) ?? "-"}</td></tr>
      </table>
      <h3 style="font-size:14px;margin:16px 0 8px 0;color:#0a0a0f;">Top queries</h3>
      <ol style="padding-left:20px;font-size:13px;color:#0a0a0f;line-height:1.6;">
        ${(seo.top_queries || []).slice(0, 10).map((q) => `<li>${q.q} — ${fmt(q.clicks)} clicks, ${fmt(q.impr)} impr</li>`).join("")}
      </ol>
    ` : `<p style="color:#a09bb1;font-size:14px;font-style:italic;margin-bottom:24px;">No GSC snapshot yet (verify the property + set GSC_SERVICE_ACCOUNT_JSON).</p>`}

    <h2 style="font-size:16px;margin:0 0 8px 0;color:#0a0a0f;">Generative engine mentions</h2>
    ${geo.length ? `
      <p style="font-size:14px;color:#0a0a0f;margin-bottom:8px;">Mentioned in <strong>${mentionRate}%</strong> of ${geo.length} AI-engine results.</p>
      <ul style="padding-left:20px;font-size:13px;color:#706a82;line-height:1.6;margin-bottom:8px;">
        ${[...byEngine.entries()].map(([e, v]) => `<li>${e}: ${v.mentioned}/${v.total} (${Math.round((v.mentioned / v.total) * 100)}%)</li>`).join("")}
      </ul>
      ${geoMentioned.length ? `
        <h3 style="font-size:14px;margin:16px 0 8px 0;color:#0a0a0f;">Where we appeared</h3>
        <ul style="padding-left:20px;font-size:13px;color:#0a0a0f;line-height:1.6;">
          ${geoMentioned.slice(0, 10).map((g) => `<li>${g.engine}: "${g.query}"${g.position ? ` (#${g.position})` : ""}</li>`).join("")}
        </ul>
      ` : ""}
    ` : `<p style="color:#a09bb1;font-size:14px;font-style:italic;margin-bottom:24px;">No GEO data — set GEMINI_API_KEY (already present) / PERPLEXITY_API_KEY / OPENAI_API_KEY.</p>`}

    <h2 style="font-size:16px;margin:24px 0 8px 0;color:#0a0a0f;">Backlinks</h2>
    ${backlinks ? `
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#706a82;">Total backlinks</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${fmt(backlinks.total_backlinks)}</td></tr>
        <tr><td style="padding:6px 0;color:#706a82;">Referring domains</td><td style="text-align:right;color:#0a0a0f;font-weight:600;">${fmt(backlinks.referring_domains)}</td></tr>
      </table>
      ${backlinks.new_domains_today?.length ? `<p style="font-size:13px;color:#0a8050;margin:8px 0;">+ New today: ${backlinks.new_domains_today.slice(0, 5).join(", ")}</p>` : ""}
      ${backlinks.lost_domains_today?.length ? `<p style="font-size:13px;color:#c44;margin:8px 0;">- Lost today: ${backlinks.lost_domains_today.slice(0, 5).join(", ")}</p>` : ""}
    ` : `<p style="color:#a09bb1;font-size:14px;font-style:italic;">No Bing Webmaster backlink data yet (set BING_WEBMASTER_API_KEY).</p>`}

    <hr style="border:none;border-top:1px solid #e2e2ee;margin:24px 0;">
    <p style="font-size:11px;color:#a09bb1;margin:0;">
      Auto-generated by daily-seo-digest. Powered by GSC + AI engines + Bing Webmaster Tools.
    </p>
  </div>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Arcana SEO <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, error: `${res.status}: ${txt.slice(0, 300)}` };
  }
  return { ok: true };
}

Deno.serve(handler<unknown>({
  fn: "daily-seo-digest",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    const { data: seoRows } = await ctx.supabase
      .from("seo_daily_snapshots")
      .select("snapshot_date, total_clicks, total_impressions, avg_ctr, avg_position, top_queries")
      .order("snapshot_date", { ascending: false })
      .limit(1);
    const seo = (seoRows?.[0] as SeoRow | undefined) || null;

    const { data: geoRows } = await ctx.supabase
      .from("geo_daily_mentions")
      .select("engine, query, mentioned, position")
      .eq("snapshot_date", today);
    const geo = (geoRows as GeoRow[] | null) || [];

    const { data: blRows } = await ctx.supabase
      .from("backlinks_daily_snapshots")
      .select("snapshot_date, total_backlinks, referring_domains, new_domains_today, lost_domains_today")
      .order("snapshot_date", { ascending: false })
      .limit(1);
    const backlinks = (blRows?.[0] as BacklinkRow | undefined) || null;

    const html = buildHtml(seo, geo, backlinks);
    const subject = `Arcana SEO digest — ${today}`;
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "lawrence.ma000@gmail.com";
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";

    if (!resendKey) {
      ctx.log.warn("daily_seo_digest.no_resend_key", { html_length: html.length });
      return { ok: true, sent: false, reason: "RESEND_API_KEY not configured", subject, recipient: adminEmail };
    }

    const result = await sendEmail(adminEmail, subject, html, resendKey);
    if (!result.ok) {
      captureEdgeException(new Error(result.error || "send failed"), {
        fn: "daily-seo-digest",
        correlationId: ctx.correlationId,
        level: "warning",
        tags: { stage: "resend" },
      });
      return { ok: false, error: result.error };
    }

    ctx.log.info("daily_seo_digest.sent", { recipient: adminEmail });
    return { ok: true, sent: true, recipient: adminEmail, subject };
  },
}));
