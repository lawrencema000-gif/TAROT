# Load testing

Synthetic traffic harness for verifying the system holds at planned scale milestones.

## Install

```bash
# Windows
winget install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Run

```bash
# 1-minute smoke test, 10 virtual users, public endpoints only.
k6 run loadtest/smoke.js

# 7-minute scale test, ramping up to 500 concurrent users.
k6 run loadtest/scale.js

# Override target.
BASE_URL=https://staging.tarotlife.app k6 run loadtest/smoke.js
```

## When to run

- **Before any Play Store release** — `k6 run loadtest/smoke.js` to confirm nothing's regressed
- **Before any marketing push** — `k6 run loadtest/scale.js` to verify the system can handle the expected spike
- **Monthly health check** — verify p95 hasn't drifted

## What we test

| Path | Risk we're checking |
|---|---|
| `/` (homepage) | CDN serves the index; Netlify cache headers correct |
| `/blog` | Blog index fetches via Supabase REST without timeout |
| `/blog/<slug>` | Individual posts render; Supabase query for the post is fast |
| `/version.json` | Cache-Control: no-store is honored (so deploys reach users) |
| `/sitemap.xml` | Generated sitemap is served, not a 404 |
| `/robots.txt` | Crawler basics still work |
| `/llms.txt` | AI-engine discovery file exists |

## What we DO NOT test (yet)

- **Authenticated paths** (tarot draw, AI interpretation, billing) — these need a real Supabase session per VU. Build a separate `auth-flow.js` when ready.
- **Heavy AI workload** — would burn Gemini quota in seconds. Better tested via mocked responses or a dedicated synthetic Gemini key.
- **Webhook ingest** — Stripe / Apple/Google IAP webhooks. Test with `stripe trigger` CLI commands.

## Pass thresholds

| Test | p(95) | p(99) | 5xx rate | Notes |
|---|---|---|---|---|
| smoke (10 vus) | <800ms | — | 0% | Run before every push |
| scale (500 vus) | <1500ms | <3000ms | <0.1% | Pre-launch verify |
| scale (5000 vus) | TBD | — | <0.5% | When Cloudflare CDN added |

## Reading the output

k6 prints a summary at the end. Key metrics:

- `http_req_duration ........: avg=X p(95)=Y` — request latency
- `http_req_failed ...........: 0.00%` — fraction of non-2xx responses
- `iterations .................: <count>` — total user actions completed
- `errors .....................: 0.00%` — custom error rate (4xx/5xx counted)

If p(95) exceeds threshold, dig into per-URL via `--summary-export=results.json` then inspect.

## Why this matters

We've never actually stressed the system. The materialised balance, AI cache, killswitch, etc are theoretically correct but never load-tested. Run smoke before every release; scale before every marketing push.
