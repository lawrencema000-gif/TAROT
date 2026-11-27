# E2E smoke tests

Playwright specs that check the user-visible critical paths of the live app.

## What runs

`critical-paths.spec.ts` checks five invariants (its header comment lists them):

1. The signed-out landing renders the hero and a working Sign in: from the bar
   on a desktop, from the Menu sheet on a phone.
2. `ads.txt` and `app-ads.txt` serve the publisher line.
3. `/version.json` names the commit the live build was made from (a 40-character
   sha; never `"local"`, and on tarotlife.app never `-dirty`).
4. Email sign-in lands on the signed-in home with its bottom nav, and the
   Horoscope and Readings tabs render (needs the QA account, below).
5. `?lang=ja` renders the landing and the signed-in Horoscope in Japanese.

Every spec runs in two projects (`playwright.config.ts`):

- `mobile-safari`: WebKit, `devices['iPhone 13']`, 390px wide. Below 420px the
  landing moves Sign in from the bar into the Menu sheet (`src/styles/landing.css`).
- `chromium-desktop`: Desktop Chrome, 1280px wide.

Without the QA account the signed-in specs skip (they never fail for a missing
password): 11 passed and 7 skipped for `critical-paths.spec.ts`; 18 passed with it.

## Run locally

```bash
# Once
npx playwright install chromium webkit

# The dedicated QA account, never a real member's login
export E2E_EMAIL=arcana-qa-p7-nightly@example.com
export E2E_PASSWORD=…
# PowerShell: $env:E2E_EMAIL = '…'; $env:E2E_PASSWORD = '…'

# Against production
npx playwright test

# Against a pull request's preview deploy
E2E_BASE_URL=https://pr-<N>--arcana-ritual-app.netlify.app npx playwright test

# Against a local production build (the dev server serves no /version.json)
npm run build
npx vite preview --port 4173 --strictPort     # in a second terminal
E2E_BASE_URL=http://localhost:4173 npx playwright test
```

Stop the preview server afterwards: it keeps port 4173.

Pass `--project=mobile-safari` or `--project=chromium-desktop` to run one project.

## Writing specs

- Find the landing's Sign in only through `landingSignIn()` (`e2e/landing.ts`): it
  knows where the viewport puts the button.
- Sign in only through `signInAs()` (`e2e/fixtures.ts`), or use the `authedPage`
  fixture. It fills the `/signin` form itself and makes the language this
  device's choice; `?lang=en` alone is not a choice, and after sign-in the app
  would follow the account's saved language.
- Click bottom-nav items through `mainNavItem()`: it accepts tabs, buttons and
  links inside `nav[data-main-nav]`.
- Keep each `export const …_NAME = /…/;` on one line.
  `src/test/golden/e2eLandingSelectors.test.ts` reads them, keeps them in step
  with the locale files and the landing's breakpoint, and fails if any other
  e2e file looks the landing's Sign in up by name.
- No `waitForTimeout`, no `networkidle`, no `getByLabel(/password/)` (it also
  matches the "Show password" toggle): wait with auto-retrying assertions.

## In CI

See the header comments of `.github/workflows/e2e.yml` (production: nightly,
after the Deploy workflow, and by hand) and `.github/workflows/preview.yml`
(pull requests).

Repository secrets `E2E_EMAIL` and `E2E_PASSWORD` hold the dedicated,
non-Premium QA account. Until they exist the signed-in specs skip.

## When a spec fails

1. Open the Playwright HTML report artifact of the workflow run (trace viewer,
   screenshot, video).
2. On production, if the app is broken: Netlify → Deploys → the previous good
   deploy → Publish deploy, then fix forward in a pull request.
3. A flaky spec (fails once, passes on retry) is stabilised or split; never add a
   blanket retry to hide it.
