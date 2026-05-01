# tarotlife.app — n8n SEO automation

Free SEO automation, Gmail-as-source, lives alongside the existing
Supabase edge-function pipeline (`daily-seo-boost`, `daily-seo-digest`,
`daily-seo-snapshot`, `daily-backlinks-snapshot`, `daily-geo-mentions`,
`daily-seo-blog-generator`).

## What's running where

| Layer | Where | Cadence |
|---|---|---|
| GSC clicks/impressions/positions roll-up | Supabase edge fn `daily-seo-snapshot` | daily, pg_cron |
| Daily SEO blog post (gpt-5 → Gemini fallback) | Supabase edge fn `daily-seo-blog-generator` | daily, pg_cron |
| GEO mentions monitor | Supabase edge fn `daily-geo-mentions` | daily, pg_cron |
| Backlink count snapshot | Supabase edge fn `daily-backlinks-snapshot` | daily, pg_cron |
| Email digest (yesterday's snapshot) | Supabase edge fn `daily-seo-digest` | daily, pg_cron |
| **Backlink pitch digest** (this folder) | n8n | daily, 2pm UTC |

## Workflows

### `backlink-pitch-digest.json` — Daily HARO/Qwoted/etc digest

HARO shut down in 2024. This workflow fans out across the modern free
replacements (Qwoted, SourceBottle, Help-a-B2B-Writer, Featured) by
filtering your Gmail for niche-relevant journalist queries.

**Setup:**

1. Sign up to at least one of the source services (free tiers exist
   for Qwoted, SourceBottle, HelpaB2BWriter):
   - https://qwoted.com — strongest free tier, weekly digest
   - https://www.sourcebottle.com — free, smaller
   - https://helpab2bwriter.com — free, B2B-leaning
   - https://featured.com — limited free
2. Confirm you receive their email digests in `lawrence.ma000@gmail.com`
3. Import `backlink-pitch-digest.json` into n8n
4. Connect Gmail OAuth credential (label it `Gmail (lawrence.ma000)`
   to match the workflow)
5. Activate the workflow

The workflow fires every day at 14:00 UTC (mid-morning Sydney, late-
morning London) and sends a digest to `lawrence.ma000@gmail.com` with
matched queries, deadlines surfaced, and Gmail deep-links.

If no queries matched, it sends a quiet "nothing today" note (not spam,
just a heartbeat). Average yield in this niche: 2-3 pitchable queries
per week.

## What's blocked on you (the human)

### GSC service-account JSON — for `daily-seo-snapshot`

The daily snapshot edge function needs a Google service-account JSON
to call the Search Console API. Until this is set, `daily-seo-snapshot`
no-ops gracefully and you don't see top-query/top-page roll-ups in
the digest email.

**Setup steps:**

1. Open https://console.cloud.google.com → create a new project
   (or pick the existing one you use for Arcana)
2. Enable the **Search Console API**
3. **IAM & Admin → Service accounts → Create service account**.
   Name: `tarotlife-gsc-reader`. No roles required at the project
   level (GSC permissions are property-scoped).
4. **Keys → Add key → Create new key → JSON.** Download.
5. Open https://search.google.com/search-console → tarotlife.app
   property → **Settings → Users and permissions → Add user**.
   Email: the service account's `client_email` (from the JSON,
   ends in `@*.iam.gserviceaccount.com`). Permission: `Restricted`.
6. Set the JSON as a Supabase edge-function secret:
   ```bash
   supabase secrets set GSC_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/tarotlife-gsc-reader-xxxxx.json)" --project-ref ulzlthhkqjuohzjangcq
   ```
7. Trigger a manual run to confirm:
   ```bash
   curl -X POST https://ulzlthhkqjuohzjangcq.supabase.co/functions/v1/daily-seo-snapshot \
     -H "X-Webhook-Secret: $CRON_SECRET"
   ```

After that the daily digest emails start including your top
clicks/impressions/positions tables and the trend windows turn into
useful data.

### Sign up to at least one HARO replacement (free)

See workflow setup above. Without this the `backlink-pitch-digest`
workflow will keep sending "nothing today" notes.

### Optional: Bing Webmaster Tools API key

For the IndexNow ping in `daily-seo-blog-generator` — already coded,
already pushing the slug to indexnow.org each time a fresh blog post
goes live. No human action needed unless you want to add Bing as a
deeper telemetry source (Yandex/DuckDuckGo are auto via IndexNow).
