# Play Store Release Checklist — Arcana (com.arcana.app)

Last updated: 2026-04-20
Owner: lawrencema000-gif

## Gate 0 — Code (shipped)

- [x] Logout stale-write race fixed (`activeUserIdRef` guard in AuthContext)
- [x] Horoscope cache cleared on auth change (useAstrology)
- [x] Per-user caches purged on signOut (clearUserCache extended)
- [x] Dynamic viewport units (`dvh`) for Sheet + TarotSection card picker
- [x] Safe-area insets on PaywallSheet close + content
- [x] i18next `saveMissing` gated to DEV (silences 404 spam in prod)
- [x] i18n coverage at 3 acceptable residuals per locale (see I18N-PROGRESS.md)

## Gate 1 — Config (USER ACTION REQUIRED)

These cannot be completed autonomously. Without them the signed AAB will
likely ship with Google Sign-In broken or no crash telemetry.

- [ ] **google-services.json** placed at `android/app/google-services.json`
  - Get from: Firebase console → Project settings → Android app `com.arcana.app` → Download
  - Without this, GoogleAuth.initialize() falls back to web OAuth via in-app browser
- [ ] **Play Store App Signing SHA-1** registered in Google Cloud Console
  - Get from: Play Console → Setup → App signing → SHA-1 certificate fingerprint
  - Register at: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 client (Android) for `com.arcana.app`
  - Without this, native sign-in returns `ApiException: 10 DEVELOPER_ERROR`
- [ ] **Supabase OAuth redirect URI** includes `com.arcana.app://auth`
  - Check at: Supabase dashboard → Authentication → URL Configuration → Redirect URLs
- [ ] **VITE_SENTRY_DSN** set in Netlify env for production
  - Create project at: sentry.io (React + Vite template)
  - Set at: Netlify → Site settings → Environment variables
  - Also set `VITE_BUILD_SHA` (already wired via deploy workflow)
  - Without this, zero production crash reports

## Gate 2 — Pre-build verification (web)

Run on `https://tarotlife.app` with a fresh incognito window BEFORE triggering an Android build.

- [ ] Sign up with a new email → complete onboarding → profile persists
- [ ] Sign out → sign in with a different account → verify User A's data does NOT appear
  - Specifically: horoscope, daily-readings counter, saved items, XP
- [ ] Sign out → sign in with same account → full state restored
- [ ] Open a card meaning → share link → open in new tab → card renders with correct locale
- [ ] Switch language (EN → JA → KO → ZH) → all chrome, daily horoscope, and AI readings switch
- [ ] Trigger a paywall → close button is tappable (not cut off by notch)
- [ ] Open TarotSection card picker → grid scrolls, no overflow bug
- [ ] Open Settings → toggle theme / notifications → persist on reload
- [ ] Trigger an intentional error (e.g., pull plug during AI reading) → graceful toast, not blank screen

## Gate 3 — Android device test (native)

Run on a physical Android device (not emulator) with the signed release AAB
installed via internal testing track.

- [ ] First launch: no crash; onboarding carousel renders
- [ ] Google Sign-In: tap → Google account picker appears (NOT a browser)
  - If a browser opens → native Google Auth is falling back → check google-services.json + SHA-1
- [ ] Sign out → Sign in as a second Google account → no User A data leak
- [ ] Background the app for 10+ minutes → foreground → session still valid
- [ ] Kill the app from recents → relaunch → signed in (session persisted via @capacitor/preferences)
- [ ] Purchase a test subscription → RevenueCat records it → premium flags flip
- [ ] Rewarded ad: trigger → watch → feature unlocks
- [ ] Back gesture on each main screen → expected navigation, no crash
- [ ] Rotation (if supported) → no layout break
- [ ] Airplane mode → graceful offline UI, no white screens

## Gate 4 — Post-release monitoring (24h after rollout)

- [ ] Sentry: crash-free users > 99.5%
- [ ] Sentry: no new `TypeError: Cannot read property` spikes
- [ ] Play Console → Android vitals → ANR rate < 0.47%
- [ ] Play Console → Crash rate < 1.09%
- [ ] GA4: sign-in success rate > 95% (track `login` events vs `sign_in_attempt`)
- [ ] Supabase logs: no new RLS violations

## Rollback plan

If crash rate > 5% in first 24h or Google Sign-In success < 80%:
1. Halt staged rollout in Play Console (freeze at current %)
2. `git revert` the offending commit(s) on `main`
3. Bump `versionCode` in `android/app/build.gradle`
4. Rebuild + sign + upload new AAB to same track
5. Promote new version to 100% of the affected rollout slice

## Contacts / links

- GitHub repo: https://github.com/lawrencema000-gif/TAROT
- Supabase project: ulzlthhkqjuohzjangcq (South Asia Mumbai)
- Play Console: com.arcana.app
- Netlify: tarotlife.app
- RevenueCat: (dashboard URL in env)
