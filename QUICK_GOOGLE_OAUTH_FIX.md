# Quick Fix for Google OAuth on Android

## What Was Changed

The app now opens Google Sign-In in the **system browser** instead of a WebView, which fixes the `403: disallowed_useragent` error.

## What You Need to Do

### 1. Get Your Android SHA-1 Fingerprints

#### For Debug (Development):
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### For Release (Production):
```bash
keytool -list -v -keystore android/app/your-release-key.jks -alias your-key-alias
```

Copy the SHA-1 fingerprint from the output (looks like: `AA:BB:CC:DD:...`).

### 2. Create Android OAuth Client in TAROT LIFE Project

**CRITICAL:** Use the **TAROT LIFE** Google Cloud project (linked to Play Store), NOT the Gemini project.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Switch to **TAROT LIFE** project
3. Navigate to: **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Choose **Android**
6. Fill in:
   - **Name:** Arcana Android App
   - **Package name:** `com.arcana.app`
   - **SHA-1 certificate fingerprint:** (paste the SHA-1 you copied)
7. Click **Create**
8. **Add BOTH debug and release SHA-1 fingerprints** (click "Add fingerprint")

### 3. Verify Supabase Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Authentication → Providers → Google**
3. Ensure it's configured with credentials from the **TAROT LIFE** project
4. Enable **"Skip nonce checks"** (important for mobile)
5. Save changes

### 4. Verify Redirect URLs

1. In Supabase: **Authentication → URL Configuration**
2. Ensure these are in the Redirect URLs list:
   - `com.arcana.app://auth`
   - Your production domain (if applicable)

### 5. Build the Android App

On your local machine:

```bash
# Build the web app
npm run build

# Sync to Android (if the automated sync fails due to file issues, files are already copied)
npx cap sync android

# Build Android app
cd android
./gradlew assembleDebug  # for debug
# or
./gradlew bundleRelease  # for release
```

### 6. Test

1. Install the app on your device
2. Tap "Continue with Google"
3. Your **default browser should open** (Chrome, Firefox, etc.)
4. Sign in with Google
5. Browser closes and you're back in the app, signed in

## How It Works Now

**Before:** App → WebView → Google blocks with 403 error
**After:** App → System Browser → Google allows → Redirect to App → Success

## Troubleshooting

### Still Getting 403 Error?

- Ensure you created the Android OAuth client in TAROT LIFE project
- Verify SHA-1 fingerprint matches your keystore exactly
- Wait 5-10 minutes for Google Cloud changes to propagate
- Clear app data and try again

### Browser Opens But Doesn't Return to App?

- Verify `com.arcana.app://auth` is in Supabase redirect URLs
- Rebuild the app: `npm run build && npx cap sync android`
- Check that deep linking is configured (already done in the code)

### "Invalid Client" Error?

- Your OAuth client is in the wrong Google Cloud project
- Move OAuth credentials to TAROT LIFE project
- Update Supabase with new credentials

## Key Points

1. **Use TAROT LIFE project** for all OAuth credentials (the one linked to Play Store)
2. **Add BOTH debug AND release SHA-1** fingerprints to the Android OAuth client
3. **Enable "Skip nonce checks"** in Supabase Google provider settings
4. **System browser** is now used instead of WebView (this fixes the 403 error)
5. You need to **rebuild the Android app** for changes to take effect

## Files Changed

- `src/context/AuthContext.tsx` - Now uses Capacitor Browser for OAuth on mobile
- `capacitor.config.ts` - Added Google domains to allowNavigation
- `package.json` - Added @capacitor/browser dependency

## Need Help?

See the comprehensive guide: `GOOGLE_OAUTH_SETUP.md`
