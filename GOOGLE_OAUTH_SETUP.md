# Google OAuth Setup for Android App

This guide explains how to properly configure Google Sign-In for your Android app to avoid the `403: disallowed_useragent` error.

## The Problem

Google blocks OAuth sign-in from embedded WebViews for security reasons. The error `403: disallowed_useragent` occurs when you try to authenticate using Google OAuth within a WebView.

## The Solution

This app uses Capacitor's Browser plugin to open OAuth flows in the **system browser** instead of a WebView. System browsers are allowed by Google and provide a secure authentication experience.

## Prerequisites

- Google Cloud project (preferably the one linked to your Play Store Console)
- Supabase project with authentication enabled
- Android app package name: `com.arcana.app`

---

## Step 1: Consolidate Google Cloud Projects

**IMPORTANT:** Use the **TAROT LIFE** Google Cloud project (the one linked to your Play Store Console), NOT the Gemini project.

Why? Having OAuth credentials in a different project than your Play Store connection can cause configuration issues and make it harder to manage app credentials.

### Option A: Move OAuth to TAROT LIFE Project (Recommended)

1. Go to the TAROT LIFE Google Cloud project
2. Set up OAuth credentials there (follow Step 2 below)
3. Update Supabase with the new credentials

### Option B: Link Both Projects

If you must keep OAuth in the Gemini project:
1. Ensure both projects are in the same Google Cloud organization
2. Grant necessary permissions between projects
3. Be prepared for additional complexity in credential management

---

## Step 2: Create OAuth 2.0 Client IDs

You need **TWO** OAuth Client IDs in your Google Cloud project:

### A. Web Application Client (for Supabase)

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Name it: "Arcana Web/Supabase"
5. Add Authorized JavaScript origins:
   - `https://your-supabase-project.supabase.co`
6. Add Authorized redirect URIs:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
7. Click "Create"
8. **Save the Client ID and Client Secret** - you'll need these for Supabase

### B. Android Client (for Mobile App)

1. In the same Credentials page, click "Create Credentials" → "OAuth 2.0 Client ID"
2. Choose "Android"
3. Name it: "Arcana Android App"
4. Package name: `com.arcana.app`
5. Add SHA-1 certificate fingerprints:

#### Get Debug SHA-1 (for development):
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Get Release SHA-1 (for production):
```bash
keytool -list -v -keystore /path/to/your-release-key.jks -alias your-key-alias
```

6. Copy the SHA-1 fingerprint and paste it in the Google Cloud Console
7. Click "Create"
8. **Note:** You don't get a Client Secret for Android clients - this is normal

---

## Step 3: Configure Supabase

### A. Add OAuth Provider

1. Go to your Supabase Dashboard → Authentication → Providers
2. Find "Google" and click to configure
3. Enable the provider
4. Enter the **Web Application Client ID** and **Client Secret** from Step 2A
5. **Important:** Enable "Skip nonce checks" for mobile compatibility
6. Save changes

### B. Configure Redirect URLs

1. Go to Authentication → URL Configuration
2. Add these redirect URLs:
   - `com.arcana.app://auth` (for Android app)
   - `https://yourdomain.com` (for web version, if applicable)
3. Set Site URL to your production domain

---

## Step 4: Update Your Android App

### A. Get Your Keystore SHA-1

For debug builds (development):
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For release builds (production):
```bash
keytool -list -v -keystore android/app/my-release-key.jks -alias your-alias
```

Copy the SHA-1 fingerprint that appears in the output.

### B. Add SHA-1 to Google Cloud

1. Go back to your Android OAuth Client in Google Cloud Console
2. Click "Edit"
3. Add the SHA-1 fingerprint
4. **Important:** Add BOTH debug AND release SHA-1 fingerprints
5. Save

---

## Step 5: Build and Test

### Build the Android App

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug  # for debug build
```

### Test Google Sign-In

1. Install the app on a physical device or emulator
2. Tap "Continue with Google"
3. The system browser should open (not a WebView)
4. Complete the Google authentication
5. The browser should close and redirect back to your app
6. You should be signed in

---

## Troubleshooting

### Error: 403: disallowed_useragent

**Cause:** OAuth is opening in a WebView instead of the system browser.

**Fix:**
- Ensure you're using the latest version of the app with the Browser plugin
- The code has been updated to use `Browser.open()` on mobile devices
- Rebuild and reinstall the app

### Error: Invalid SHA-1 certificate fingerprint

**Cause:** The SHA-1 fingerprint in Google Cloud doesn't match your app's signing key.

**Fix:**
1. Get the correct SHA-1 from your keystore (see Step 4A)
2. Update the Android OAuth Client in Google Cloud Console
3. Wait a few minutes for changes to propagate
4. Try again

### Error: redirect_uri_mismatch

**Cause:** The redirect URI in Supabase doesn't match what Google expects.

**Fix:**
1. Verify `com.arcana.app://auth` is in Supabase redirect URLs
2. Check that your app's package name is exactly `com.arcana.app`
3. Ensure the OAuth callback handler is working correctly

### Error: OAuth session expired

**Cause:** Multiple projects or stale authentication state.

**Fix:**
1. Clear app data: Settings → Apps → Arcana → Storage → Clear Data
2. Uninstall and reinstall the app
3. Try signing in again

### Sign-in opens browser but doesn't return to app

**Cause:** Deep linking not configured properly.

**Fix:**
1. Verify `com.arcana.app://auth` scheme is configured in Capacitor
2. Check Android manifest has the intent filter
3. Rebuild the app with `npx cap sync android`

---

## Architecture Overview

### How It Works

1. User taps "Continue with Google" in the app
2. App calls `signInWithGoogle()` in AuthContext
3. On mobile:
   - Supabase generates OAuth URL with `skipBrowserRedirect: true`
   - App opens URL in **system browser** using `Browser.open()`
   - User authenticates with Google in the browser
   - Google redirects to `com.arcana.app://auth` with auth code
   - Deep link opens the app
   - App closes the browser with `Browser.close()`
   - App exchanges code for session with Supabase
   - User is signed in
4. On web:
   - Standard OAuth flow with page redirects

### Key Code Changes

The `signInWithGoogle` function in `AuthContext.tsx` now:
- Detects if running on mobile with `isNative()`
- Uses `Browser.open()` for mobile OAuth (system browser)
- Uses standard OAuth redirect for web
- Closes browser when callback is received

---

## Production Checklist

Before releasing to production:

- [ ] OAuth Client IDs created in TAROT LIFE project
- [ ] Both Web and Android OAuth clients configured
- [ ] Release keystore SHA-1 added to Android OAuth client
- [ ] Supabase configured with Web Client ID and Secret
- [ ] Supabase redirect URLs include `com.arcana.app://auth`
- [ ] "Skip nonce checks" enabled in Supabase Google provider
- [ ] Tested on multiple physical Android devices
- [ ] Tested both debug and release builds
- [ ] Verified OAuth flow completes successfully
- [ ] Verified user profile is created in database

---

## Security Notes

- The system browser approach is **more secure** than WebViews
- OAuth credentials are never exposed to the app
- Google's OAuth security policies are fully respected
- Users can see they're authenticating with the real Google domain
- Browser has its own security sandbox separate from the app

---

## Support

If you continue to experience issues:

1. Check Google Cloud Console → APIs & Services → Credentials
2. Verify all Client IDs are in the TAROT LIFE project
3. Double-check SHA-1 fingerprints match your keystores
4. Clear app data and try fresh installation
5. Check Capacitor logs for detailed error messages
6. Verify Supabase authentication logs

---

## References

- [Google OAuth 2.0 for Mobile Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Capacitor Browser Plugin](https://capacitorjs.com/docs/apis/browser)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
