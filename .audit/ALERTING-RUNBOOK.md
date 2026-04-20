# Alerting Runbook — Sentry + UptimeRobot

Phase 5 item: "you'll know before users do." Two vendors, both free, both UI-driven.
Paste the rules below into each dashboard — 20 min total, no code deploy.

Once configured, update the checklist at the bottom and commit this file to mark
the runbook as live.

---

## Part 1 — Sentry alert rules

Sentry release tagging is already wired (`arcana@${VITE_BUILD_SHA}` in `main.tsx`,
`Sentry.setUser`/`clearUser` in `AuthContext`). Correlation IDs flow through every
edge-function log (`_shared/log.ts`) and every client apiCall. Edge functions emit
structured JSON to `console.error` with `code`, `correlationId`, `userId`, `fn`.

Sentry picks these up automatically if you wire the Sentry Supabase integration,
but today most edge-function errors arrive as front-end Sentry events via the
`ApiError` throw path. That's enough for the rules below.

### How to add a rule

1. Go to https://sentry.io → Arcana project → **Alerts** → **Create Alert**
2. Choose **Issues** for error-based rules, **Metric** for rate/volume-based rules
3. Paste the config from the relevant section below
4. Under **Actions**, add at minimum: *Send a notification to email → lawrence.ma000@gmail.com*
5. Optional: add Slack webhook / mobile push

### Rule 1 — Sign-in regression (P0)

Intent: if sign-in starts throwing for multiple users, page me immediately.

| Field | Value |
|---|---|
| Type | Issue alert |
| Condition (when) | A new issue is created |
| Filter (if) | The event's `tags[route]` equals `sign-in` **OR** the event's message contains `AuthApiError` **OR** the event's `exception.type` equals `AuthRetryableFetchError` |
| Filter (if) | The event's `tags[environment]` equals `production` |
| Action (then) | Send a notification to email — lawrence.ma000@gmail.com |
| Frequency | Perform actions at most once every **5 minutes** for an issue |

### Rule 2 — generate-reading failure spike (P0)

Intent: the Gemini call is the single most expensive code path and the highest-ROI
feature. If it starts failing, users lose their core value prop immediately.

| Field | Value |
|---|---|
| Type | Metric alert |
| Metric | `count()` of events where `tags[fn]` equals `generate-reading` AND `level` equals `error` |
| Time window | 5 minutes |
| Trigger: critical | when count **> 10** |
| Trigger: warning | when count **> 3** |
| Resolution | when count **< 1** for 5 minutes |
| Action (critical) | Email lawrence.ma000@gmail.com |

### Rule 3 — Horoscope failure spike (P1)

| Field | Value |
|---|---|
| Type | Metric alert |
| Metric | `count()` of events where `tags[fn]` is one of `astrology-daily,astrology-weekly,astrology-monthly,astrology-transit-calendar` AND `level` equals `error` |
| Time window | 10 minutes |
| Trigger: critical | when count **> 20** |
| Trigger: warning | when count **> 5** |
| Action | Email lawrence.ma000@gmail.com |

### Rule 4 — Any 5xx envelope spike (P1)

Intent: broad safety net — any edge function returning INTERNAL error code.

| Field | Value |
|---|---|
| Type | Metric alert |
| Metric | `count()` of events where `exception.type` equals `ApiError` AND `tags[apiError.code]` equals `INTERNAL` |
| Time window | 10 minutes |
| Trigger: critical | when count **> 25** |
| Action | Email lawrence.ma000@gmail.com |

### Rule 5 — Release health regression (P1)

Intent: catch a bad deploy via crash-free-session rate, scoped per release.

| Field | Value |
|---|---|
| Type | Metric alert |
| Metric | `crash_free_rate(session)` in environment `production` |
| Time window | 1 hour, rolling |
| Trigger: critical | **< 98%** |
| Trigger: warning | **< 99.5%** |
| Comparison | vs. previous release, degraded by more than 1 percentage point |
| Action | Email lawrence.ma000@gmail.com |

### Rule 6 — Gemini cost spike (P2, manual-check alert)

Intent: if the feature-flag rollout of gemini-2.0-flash gets reverted or a prompt
regression explodes token count, catch it before the monthly bill does.

This one runs in Supabase (not Sentry) because `ai_usage_ledger` is the source of
truth. Create a pg_cron job that emits to Sentry via a function when the 1-hour
cost crosses a threshold. **Skip for v1** — revisit once ledger has 30 days of
baseline data to know what "normal" looks like.

Baseline-gathering SQL (run weekly, eyeball the number):

```sql
select
  date_trunc('hour', created_at) as hour,
  sum(cost_cents) / 100.0 as dollars,
  sum(total_tokens) as tokens,
  count(*) as calls
from ai_usage_ledger
where created_at > now() - interval '7 days'
group by 1
order by 1 desc
limit 48;
```

---

## Part 2 — UptimeRobot probes

UptimeRobot free tier gives 50 monitors @ 5-minute intervals. We'll use 7.

### Setup

1. Sign up / sign in at https://uptimerobot.com
2. **My Settings** → **Alert Contacts** → confirm lawrence.ma000@gmail.com
3. **Dashboard** → **Add New Monitor**
4. For each row below: monitor type **HTTP(s)**, interval **5 min**, alert contact
   **lawrence.ma000@gmail.com**, timeout **30 s**, HTTP method **GET** unless noted

### Monitor list

| # | Friendly Name | URL | Keyword / Expected | Why |
|---|---|---|---|---|
| 1 | Arcana — landing page | `https://tarotlife.app/` | HTTP 200 | Netlify + DNS alive |
| 2 | Arcana — ads.txt | `https://tarotlife.app/ads.txt` | keyword `pub-` | AdSense compliance; breaks = revenue loss |
| 3 | Arcana — app-ads.txt | `https://tarotlife.app/app-ads.txt` | keyword `pub-` | AdMob compliance |
| 4 | Arcana — version.json | `https://tarotlife.app/version.json` | keyword `sha` | Deploy pipeline produced an artifact |
| 5 | Arcana — sitemap | `https://tarotlife.app/sitemap.xml` | keyword `urlset` | SEO |
| 6 | Arcana — Supabase REST | `https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/` + header `apikey: <anon>` | HTTP 200 | Supabase project alive (paid-tier concern) |
| 7 | Arcana — feature_flags probe | `https://ulzlthhkqjuohzjangcq.supabase.co/rest/v1/feature_flags?select=key&limit=1` + header `apikey: <anon>` | keyword `gemini-flash-default` | RLS + seeded flag still visible to anon |

For #6 and #7 you add custom HTTP headers in UptimeRobot's advanced settings.
The anon key is the same value in `VITE_SUPABASE_ANON_KEY` — safe to hand to
UptimeRobot since it's already public on the client.

### Public status page (optional, free)

UptimeRobot → **Status Pages** → **Add New Status Page** → name `Arcana Status`,
select all 7 monitors, custom domain `status.tarotlife.app` if you want it pretty
(CNAME to `stats.uptimerobot.com`). Otherwise the generated URL is fine.

Announce the URL in the app's support footer so users can self-serve incident
status. This also deflects support email when something is down.

---

## Part 3 — Response playbook

When an alert fires, in order:

1. **Check UptimeRobot status page** — is it a platform-wide outage (Netlify /
   Supabase / Google)? If yes, no action needed; status pages of each vendor will
   tell you ETA.
2. **Check Sentry latest release** — did we just deploy? If the release timestamp
   precedes the alert by < 15 min, revert first, diagnose second.
   - Revert = `git revert <sha> && git push origin main` — auto-deploy handles the rest.
3. **Check `ai_usage_ledger`** — did a cost spike precede the error spike?
   ```sql
   select function_name, count(*), sum(cost_cents)/100.0 as dollars
   from ai_usage_ledger
   where created_at > now() - interval '1 hour'
   group by function_name order by dollars desc;
   ```
4. **Check Supabase function logs** — filter by the `correlationId` from the
   Sentry event. Every edge function logs request/response/errors as JSON.
5. **Check feature flags** — was a flag flipped recently? The `feature_flags`
   table has `updated_at` — `select key, enabled, rollout_percent, updated_at
   from feature_flags order by updated_at desc`.

Escalation only needed if #1–5 don't resolve within 30 min.

---

## Checklist — mark as you complete

- [ ] Sentry Rule 1 (sign-in regression) configured
- [ ] Sentry Rule 2 (generate-reading failure spike) configured
- [ ] Sentry Rule 3 (horoscope failure spike) configured
- [ ] Sentry Rule 4 (any 5xx envelope spike) configured
- [ ] Sentry Rule 5 (release health regression) configured
- [ ] Sentry Rule 6 (Gemini cost spike) — DEFERRED, revisit 2026-05-20 when ledger has 30 days of data
- [ ] UptimeRobot Monitor 1 (landing)
- [ ] UptimeRobot Monitor 2 (ads.txt)
- [ ] UptimeRobot Monitor 3 (app-ads.txt)
- [ ] UptimeRobot Monitor 4 (version.json)
- [ ] UptimeRobot Monitor 5 (sitemap)
- [ ] UptimeRobot Monitor 6 (Supabase REST)
- [ ] UptimeRobot Monitor 7 (feature_flags probe)
- [ ] UptimeRobot status page at status.tarotlife.app (optional)
- [ ] Support footer links to status page (optional)

Once all boxes checked, update `.audit/PHASE-PROGRESS.md` Phase 5 to mark
"Sentry alerts + UptimeRobot runbook" done (4 of 7 → 5 of 7).
