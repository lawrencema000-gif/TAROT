# E2E Tests

Playwright specs that protect the user-visible critical paths called out in
`.audit/SCALABILITY-PLAN.md` Phase 4: sign-in, home, readings, horoscope,
paywall, blog, version.json, ads.txt.

## Run locally

```bash
# One-time
npx playwright install chromium

# Set creds for tests that exercise the authed surface
export E2E_EMAIL=<real@account>
export E2E_PASSWORD=<password>

# Against prod
npx playwright test

# Against a Netlify preview
E2E_BASE_URL=https://deploy-preview-42--arcana-ritual-app.netlify.app npx playwright test

# Against local dev
E2E_BASE_URL=http://localhost:5173 npx playwright test
```

The mobile-viewport project runs by default; pass `--project=chromium-desktop`
to exercise the desktop layout.

## Run in CI

GitHub Actions runs `.github/workflows/e2e.yml` on every PR to main and on
pushes to main after the deploy completes. Secrets required:
- `E2E_EMAIL` — shared test account email
- `E2E_PASSWORD` — shared test account password

## When a spec fails

1. Check the Playwright HTML report artifact attached to the workflow run
   (trace viewer + screenshot + video).
2. If the regression is confirmed, `netlify rollback` to the previous green
   deploy and open a PR to fix.
3. Specs that are flaky (pass on retry but fail once) should either be
   stabilized or split — never add a catch-all retry to hide flake.
