# Arcana

A mystical tarot and astrology app built with React, TypeScript, Capacitor, and Supabase.

## Developer Diagnostics

The app includes a comprehensive diagnostics system for debugging authentication and other issues, especially useful for OAuth troubleshooting.

### How to Access Diagnostics

**In Development Mode:**
- Go to Settings > Support > Developer Diagnostics
- The diagnostics option is always visible in dev builds

**In Production Mode:**
- Go to Settings
- Tap the version number at the bottom (e.g., "Arcana v1.0.0") 5 times
- "Developer Diagnostics" will appear in the Support section

**From Error Toasts:**
- When an auth error occurs, a toast will appear with a "View details" button
- Tap it to open the diagnostics panel focused on the current error

**From Crash Screens:**
- If a render error occurs, the error boundary shows a "View Diagnostics" button

### Where Logs Are Stored

- **Memory:** Last 200 log entries are kept in memory during the session
- **Persistent Storage:**
  - Web: `localStorage` under key `arcana-diagnostics-logs`
  - Native (Capacitor): `@capacitor/preferences` under the same key
  - Last 50 entries are persisted

### Log Structure

Each log entry includes:
- `correlationId`: Groups related auth operations (e.g., `oauth-1706789012345-abc123`)
- `step`: The operation name (e.g., `auth.google.initiate`, `auth.callback.exchangeCode`)
- `level`: `info`, `warn`, or `error`
- `message`: Human-readable description
- `timestamp`: Unix timestamp in milliseconds
- `elapsed`: Duration in ms (for span-based logs)
- `data`: Additional context (sanitized)
- `platform`: `web`, `android`, or `ios`

### Debugging OAuth Issues

When OAuth fails, the diagnostics panel shows:

1. **Correlation ID** - Copy this to filter all logs for a single auth attempt
2. **Step-by-step timeline** showing:
   - OAuth URL generation
   - Browser opening (native)
   - Callback URL receipt
   - Code extraction and analysis
   - `exchangeCodeForSession` result
   - Session establishment
3. **Error details** including:
   - Supabase error code and message
   - Likely cause suggestions
   - Whether the error is retryable
4. **URL analysis** showing:
   - Whether code is in query (`?`) or hash (`#`)
   - Detected issues (wrong flow type, missing params, etc.)
   - Scheme, host, and path (sensitive values masked)

### Copying Diagnostics

1. Open the diagnostics panel
2. Click "Copy Diagnostics" to copy a formatted text report
3. Or click "Export JSON" to download a JSON file

The report is sanitized:
- Access tokens, refresh tokens, and OAuth codes are masked
- Email addresses show only first/last characters (e.g., `j***n@example.com`)
- URLs have sensitive query parameters replaced with `[REDACTED:Nchars]`

### Common OAuth Error Codes

| Code | Meaning | Likely Cause |
|------|---------|--------------|
| `INVALID_GRANT` | Authorization code expired | OAuth flow took too long; try again |
| `FLOW_STATE_NOT_FOUND` | PKCE state missing | App reloaded during OAuth; storage issue |
| `PKCE_VERIFIER_MISSING` | Code verifier not found | Storage not persisting on native |
| `ACCESS_DENIED` | User cancelled | User closed consent screen |
| `UNAUTHORIZED_CLIENT` | App not authorized | OAuth client ID misconfigured |

### Enabling Dev Mode

Dev mode shows additional details like full stack traces:
- Toggle "Dev Mode" switch in the diagnostics panel
- Or set `import.meta.env.DEV` to `true` in your build

## Deploys

Production deploys are fully automated. No more `netlify deploy --prod` by hand.

### Flow

- **Push to `main`** -> `.github/workflows/deploy.yml` runs: CI (`typecheck` + `lint` + `test` + `build`) -> Netlify prod deploy of `dist/` -> `supabase db push --linked` -> `supabase functions deploy` for each function folder changed in the last commit. Deploy URL and list of deployed functions are written to the GitHub Actions step summary.
- **Open a PR** -> `.github/workflows/preview.yml` runs CI + ships a Netlify deploy preview and comments the unique URL on the PR.
- **Android AAB** still comes from the existing `android` job in `ci.yml` on main.

### Required GitHub secrets

Add these at <https://github.com/lawrencema000-gif/TAROT/settings/secrets/actions>:

| Secret | Source |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | <https://app.netlify.com/user/applications#personal-access-tokens> |
| `NETLIFY_SITE_ID` | `ff59834d-82e1-44a8-8ae5-0aef6d1621e1` |
| `SUPABASE_ACCESS_TOKEN` | <https://supabase.com/dashboard/account/tokens> |
| `SUPABASE_DB_PASSWORD` | DB password for project `ulzlthhkqjuohzjangcq` |
| `SUPABASE_PROJECT_ID` | `ulzlthhkqjuohzjangcq` |
| `VITE_SUPABASE_URL` | Same value as in local `.env` |
| `VITE_SUPABASE_ANON_KEY` | Same value as in local `.env` |

### What's live right now

Every build emits `/version.json` with the git SHA, build time, and package version. It's served with `Cache-Control: no-store`.

```bash
curl https://tarotlife.app/version.json
npm run deploy:check              # compare live SHA vs local HEAD
npm run deploy:check -- <preview-url>
```

### Rollback

One click, no CLI:

1. Open <https://app.netlify.com/sites/arcana-ritual-app/deploys>
2. Find the last known-good deploy
3. Click **Publish deploy** (Netlify keeps every prior build and republishes instantly).

For DB migrations, roll back by pushing a forward-fix migration — do not `supabase db reset` against prod.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Android development
npm run android:build
npm run android:run
```

## Observability

### Core Web Vitals → GA4

Every page load auto-reports the five standard Core Web Vitals (LCP, CLS,
INP, FCP, TTFB) to GA4 as `web_vital` custom events. Each event carries
the build SHA (`VITE_BUILD_SHA`) so regressions surface per-deploy.

- Wired in `src/utils/webVitals.ts`, called from `src/main.tsx` after
  `initAnalytics()` so the gtag queue is primed first.
- On slow connections (`navigator.connection.effectiveType` = 2g/3g),
  reporting is deferred through `requestIdleCallback` with a 1-second
  timeout to avoid stealing CPU from render.
- If gtag is blocked (DNT, ad-block, Capacitor), reporting silently
  no-ops — same contract as the rest of `analytics.ts`.

**View the data:** GA4 → Reports → Engagement → Events → filter on
`web_vital`. Pivot by the `release` param to compare builds.

**Custom timings:** emit any additional timing (e.g. sign-in duration,
horoscope fetch time) via `reportCustomVital(name, value)` from
`src/utils/webVitals.ts`. It lands in the same `web_vital` stream with
`rating = 'custom'`.
