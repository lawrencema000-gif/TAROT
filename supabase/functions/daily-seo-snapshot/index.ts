import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "../_shared/handler.ts";
import { captureEdgeException } from "../_shared/sentry.ts";

/**
 * Daily SEO snapshot — pulls Google Search Console data via the
 * Search Console API and stores a daily roll-up in seo_daily_snapshots.
 *
 * Auth flow: requires a Google service-account JSON granted Search
 * Console access on the property `https://tarotlife.app/`. The JSON is
 * stored as the GSC_SERVICE_ACCOUNT_JSON edge-function secret.
 *
 * Without the service-account secret, the function no-ops gracefully —
 * useful while waiting for the user to verify the property + create
 * the service account.
 *
 * What it pulls (per the GSC searchAnalytics.query endpoint):
 *   - dimensions=query, daily summed across pages → top 25 queries
 *   - dimensions=page, summed across queries → top 25 pages
 *   - aggregate clicks/impressions/ctr/position
 *
 * Stores 16 days back from today as the comparison window so trends
 * are visible (rather than just same-day data, which is sparse).
 *
 * Auth: webhook-style. CRON_SECRET via X-Webhook-Secret.
 */

const SITE_URL = "https://tarotlife.app/";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// JWT signing for Google OAuth2 — minimal implementation since we don't
// want to pull in the full googleapis SDK on Deno.
async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const unsigned = `${enc(header)}.${enc(claims)}`;

  // Import RSA private key from PEM
  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsigned}.${sig}`;

  const tokenRes = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} ${body.slice(0, 200)}`);
  }
  const tokenJson = await tokenRes.json();
  return tokenJson.access_token as string;
}

async function gscQuery(accessToken: string, body: Record<string, unknown>) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GSC query failed: ${res.status} ${txt.slice(0, 300)}`);
  }
  return res.json();
}

Deno.serve(handler<unknown>({
  fn: "daily-seo-snapshot",
  auth: "webhook",
  webhookSecretEnv: "CRON_SECRET",
  rateLimit: { max: 5, windowMs: 60_000 },
  run: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const saJson = Deno.env.get("GSC_SERVICE_ACCOUNT_JSON");
    if (!saJson) {
      ctx.log.warn("daily_seo_snapshot.no_service_account", { reason: "GSC_SERVICE_ACCOUNT_JSON not set" });
      return { ok: true, skipped: true, reason: "service_account_not_configured" };
    }

    let sa: ServiceAccountKey;
    try {
      sa = JSON.parse(saJson) as ServiceAccountKey;
    } catch (e) {
      ctx.log.error("daily_seo_snapshot.invalid_json", { err: String(e) });
      return { ok: false, error: "GSC_SERVICE_ACCOUNT_JSON is not valid JSON" };
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken(sa);
    } catch (e) {
      captureEdgeException(e, {
        fn: "daily-seo-snapshot",
        correlationId: ctx.correlationId,
        level: "error",
        tags: { stage: "oauth" },
      });
      return { ok: false, error: `oauth: ${String(e)}` };
    }

    // GSC has ~2 day reporting lag. Pull data for the day before yesterday.
    const dataDate = new Date();
    dataDate.setDate(dataDate.getDate() - 2);
    const dateStr = dataDate.toISOString().split("T")[0];

    const baseBody = {
      startDate: dateStr,
      endDate: dateStr,
      rowLimit: 25,
      dataState: "all",
    };

    let aggregate, byQuery, byPage;
    try {
      [aggregate, byQuery, byPage] = await Promise.all([
        gscQuery(accessToken, { ...baseBody, dimensions: [] }),
        gscQuery(accessToken, { ...baseBody, dimensions: ["query"] }),
        gscQuery(accessToken, { ...baseBody, dimensions: ["page"] }),
      ]);
    } catch (e) {
      captureEdgeException(e, {
        fn: "daily-seo-snapshot",
        correlationId: ctx.correlationId,
        level: "error",
        tags: { stage: "gsc_query" },
      });
      return { ok: false, error: String(e) };
    }

    const aggRow = aggregate?.rows?.[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const top_queries = (byQuery?.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      q: r.keys[0],
      clicks: r.clicks,
      impr: r.impressions,
      ctr: r.ctr,
      pos: r.position,
    }));
    const top_pages = (byPage?.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      url: r.keys[0],
      clicks: r.clicks,
      impr: r.impressions,
      ctr: r.ctr,
      pos: r.position,
    }));

    const { error } = await ctx.supabase
      .from("seo_daily_snapshots")
      .upsert({
        snapshot_date: dateStr,
        total_clicks: aggRow.clicks,
        total_impressions: aggRow.impressions,
        avg_ctr: aggRow.ctr,
        avg_position: aggRow.position,
        top_queries,
        top_pages,
        raw_response: { aggregate, byQuery, byPage },
      }, { onConflict: "snapshot_date" });
    if (error) {
      captureEdgeException(error, {
        fn: "daily-seo-snapshot",
        correlationId: ctx.correlationId,
        level: "warning",
        tags: { stage: "upsert" },
      });
      return { ok: false, error: error.message };
    }

    ctx.log.info("daily_seo_snapshot.done", { dateStr, clicks: aggRow.clicks, impressions: aggRow.impressions });
    return {
      ok: true,
      snapshot_date: dateStr,
      total_clicks: aggRow.clicks,
      total_impressions: aggRow.impressions,
      top_queries: top_queries.length,
      top_pages: top_pages.length,
      run_at: today,
    };
  },
}));
