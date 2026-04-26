# Backup + Restore Runbook

Last reviewed: 2026-04-26

## What gets backed up

Supabase project `ulzlthhkqjuohzjangcq` (TAROT, Mumbai region).

| Tier | Database backups | Frequency | Retention | PITR |
|---|---|---|---|---|
| Free | None | — | — | ❌ |
| Pro ($25/mo) | Daily logical | Daily | 7 days | Optional add-on |
| Team ($599/mo) | Daily + PITR | Continuous | 14 days | ✅ included |
| Enterprise | Custom | Custom | Up to 90 days | ✅ |

**Verify which tier you're on:** https://supabase.com/dashboard/project/ulzlthhkqjuohzjangcq/settings/billing

If on Free tier and you have actual users — **upgrade to Pro now**. A bad migration or accidental TRUNCATE on Free tier means total data loss.

## What is NOT covered by Supabase backups

- **Storage bucket files** (blog covers, profile avatars). Survive logical backups because the bucket configs are in DB, but the actual files would NOT be restored if Supabase storage itself had a catastrophic failure.
- **Edge function source code** — lives in this Git repo. No data loss risk.
- **Edge function secrets** — stored separately in Supabase. Document them in a 1Password vault as a fallback.
- **Vault secrets** — `cron_secret` lives in `vault.secrets`. Included in DB backup but if Vault encryption key rotates, the value is unrecoverable.
- **External services** — Stripe, RevenueCat, Netlify, AdMob — each has its own backup story. Recovery from those is via the dashboard.

## Pre-disaster checklist (do once)

- [ ] Confirm Supabase tier ≥ Pro
- [ ] Test a restore against a fork project once (don't operate in prod)
- [ ] Document keystore.properties location for AAB signing
- [ ] Save `.env` (with all `VITE_*` and Supabase keys) in 1Password
- [ ] Save `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BLOG_WEBHOOK_SECRET`, `GEMINI_API_KEY` in 1Password
- [ ] Add a calendar reminder every 90 days to verify backups still exist

## Restoring from accidental data loss

### Single table corruption (e.g. accidental DELETE)

```bash
# 1. Find the latest pre-incident backup in Supabase dashboard:
#    https://supabase.com/dashboard/project/ulzlthhkqjuohzjangcq/database/backups
# 2. Click "Restore" → "Restore to a new project"
# 3. Once new project is up, dump the affected table from it:
PGPASSWORD=<new_db_pw> pg_dump \
  -h <new_db_host> -U postgres -d postgres \
  --table=public.<table_name> --data-only \
  --on-conflict-do-nothing > <table>.sql

# 4. Apply to live:
PGPASSWORD=<live_db_pw> psql \
  -h db.ulzlthhkqjuohzjangcq.supabase.co -U postgres -d postgres < <table>.sql
```

### Whole-project disaster

```bash
# 1. Provision a new Supabase project (note the new ref)
# 2. Restore the latest backup into it from the dashboard
# 3. Update VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY:
#    - Local .env
#    - GitHub Actions secrets
#    - Netlify env vars
# 4. Re-deploy edge functions:
#      supabase link --project-ref <new-ref>
#      supabase functions deploy <each>
# 5. Re-set edge function secrets:
#      supabase secrets set CRON_SECRET=<from 1Password>
#      supabase secrets set STRIPE_SECRET_KEY=<from 1Password>
#      ... etc
# 6. Update Stripe webhook endpoint URL to point at new project
# 7. Trigger a deploy from GitHub Actions to flip the live site
```

### Storage files lost (blog-covers bucket)

The `daily-seo-blog-generator` will regenerate images on next run for new posts, but old post covers are gone. To regenerate covers for ALL existing posts:

```bash
# Set cover_image to NULL for all posts to mark them eligible for backfill
psql ... -c "UPDATE blog_posts SET cover_image = NULL;"

# Run the backfill function repeatedly until it processes all of them
CRON_SECRET=$(supabase secrets list --output env | grep CRON_SECRET | cut -d= -f2)
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -X POST "https://<ref>.supabase.co/functions/v1/backfill-blog-covers" \
    -H "x-webhook-secret: $CRON_SECRET" -d '{"limit": 5}'
  sleep 30
done
```

## Recovery time objective (RTO)

- **Single table:** 30 minutes (find backup, dump, apply)
- **Whole project:** 2-4 hours (provision, restore, reconfigure all secrets, redeploy, smoke test)

## Recovery point objective (RPO)

- Pro tier: up to 24h data loss (last daily backup)
- Team + PITR: up to 5 min data loss

## Test the restore

**Once a quarter**, fork the latest Supabase backup into a temporary project and verify it boots cleanly. Don't operate in production.
