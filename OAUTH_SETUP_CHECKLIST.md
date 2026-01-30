# Google OAuth Setup Checklist

Use this checklist as you work through the setup process. Check off each item as you complete it.

---

## Phase 1: Get SHA-1 Fingerprints

### Debug SHA-1
- [ ] Open terminal
- [ ] Run command:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- [ ] Copy the SHA1 value
- [ ] Save to notes: `________________________`

### Release SHA-1
- [ ] Check if release keystore exists
  ```bash
  ls android/*.keystore android/*.jks
  ```

**If keystore exists:**
- [ ] Get SHA-1:
  ```bash
  keytool -list -v -keystore android/release-key.keystore -alias arcana
  ```
- [ ] Copy the SHA1 value
- [ ] Save to notes: `________________________`

**If keystore doesn't exist:**
- [ ] Create new keystore:
  ```bash
  cd android
  keytool -genkey -v -keystore release-key.keystore -alias arcana -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Save password in password manager: `________________________`
- [ ] Get SHA-1 from new keystore
- [ ] Create `android/keystore.properties` file
- [ ] Add keystore configuration (see guide)

---

## Phase 2: Google Cloud Setup (TAROT LIFE Project)

### Switch to Correct Project
- [ ] Go to https://console.cloud.google.com
- [ ] Click project dropdown at top
- [ ] Select "TAROT LIFE" (ID: tarot-life-485720)
- [ ] Verify "TAROT LIFE" appears in top bar

### Enable APIs
- [ ] Go to APIs & Services → Library
- [ ] Search "Google+ API" or "People API"
- [ ] Click Enable
- [ ] Search "Identity Toolkit"
- [ ] Click Enable
- [ ] Go to APIs & Services → Dashboard
- [ ] Verify both APIs are listed

### Configure OAuth Consent Screen (if needed)
- [ ] Go to APIs & Services → OAuth consent screen
- [ ] User Type: External
- [ ] App name: Arcana
- [ ] User support email: Your email
- [ ] Authorized domains: supabase.co
- [ ] Developer contact: Your email
- [ ] Add scopes: email, profile, openid
- [ ] Save and Continue

### Create Web OAuth Client
- [ ] Go to APIs & Services → Credentials
- [ ] Click "+ Create Credentials"
- [ ] Choose "OAuth 2.0 Client ID"
- [ ] Application type: Web application
- [ ] Name: Arcana Web / Supabase Auth
- [ ] Authorized JavaScript origins:
  - [ ] Add: `https://ulzlthhkqjuohzjangcq.supabase.co`
- [ ] Authorized redirect URIs:
  - [ ] Add: `https://ulzlthhkqjuohzjangcq.supabase.co/auth/v1/callback`
- [ ] Click Create
- [ ] Copy Client ID: `________________________`
- [ ] Copy Client Secret: `________________________`
- [ ] Save both to password manager

### Create Android OAuth Client
- [ ] Still in Credentials, click "+ Create Credentials"
- [ ] Choose "OAuth 2.0 Client ID"
- [ ] Application type: Android
- [ ] Name: Arcana Android App
- [ ] Package name: `com.arcana.app`
- [ ] SHA-1 fingerprint: Paste DEBUG SHA-1
- [ ] Click Create
- [ ] Click on the Android client you just created
- [ ] Click "Add Fingerprint"
- [ ] Paste RELEASE SHA-1
- [ ] Click Save
- [ ] Verify both fingerprints are listed

---

## Phase 3: Supabase Configuration

### Update Google Provider
- [ ] Go to https://supabase.com/dashboard
- [ ] Select project: ulzlthhkqjuohzjangcq
- [ ] Go to Authentication → Providers
- [ ] Find and expand "Google"
- [ ] Toggle Enabled: ON
- [ ] Client ID: Paste Web Client ID from TAROT LIFE
- [ ] Client Secret: Paste Client Secret from TAROT LIFE
- [ ] Expand Advanced Settings
- [ ] Skip nonce check: ON ✅ (IMPORTANT!)
- [ ] Click Save

### Configure Redirect URLs
- [ ] Go to Authentication → URL Configuration
- [ ] Site URL: `https://ulzlthhkqjuohzjangcq.supabase.co`
- [ ] Redirect URLs - verify these are listed:
  - [ ] `https://ulzlthhkqjuohzjangcq.supabase.co/**`
  - [ ] `com.arcana.app://auth`
  - [ ] `http://localhost:5173`
- [ ] Click Save

---

## Phase 4: Build and Test

### Build Debug APK
- [ ] Open terminal in project root
- [ ] Run: `npm install` (if needed)
- [ ] Run: `npm run build`
- [ ] Run: `npx cap sync android`
- [ ] Run: `cd android`
- [ ] Run: `./gradlew assembleDebug`
- [ ] APK created at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Install on Device
- [ ] Connect Android device via USB
- [ ] Enable USB debugging on device
- [ ] Run: `adb devices` (verify device appears)
- [ ] Run: `adb install app/build/outputs/apk/debug/app-debug.apk`
- [ ] Or run: `npm run android:run`

### Test OAuth Flow
- [ ] Open Arcana app on device
- [ ] Tap "Continue with Google"
- [ ] Verify: System browser opens (Chrome, Firefox, etc.)
- [ ] Verify: No 403 error - real Google sign-in page appears
- [ ] Sign in with your Google account
- [ ] Grant permissions when asked
- [ ] Verify: Browser closes automatically
- [ ] Verify: Back in app, signed in successfully
- [ ] Verify: Profile page shows Google account info

### Verify in Supabase
- [ ] Go to Supabase Dashboard
- [ ] Go to Authentication → Users
- [ ] Verify new user appears with Google provider

---

## Phase 5: Production Readiness

### Release Build Setup
- [ ] Verify `android/keystore.properties` exists
- [ ] Verify release keystore password is saved securely
- [ ] Verify `keystore.properties` is in `.gitignore`
- [ ] Backup release keystore to secure location

### Build Release Version
- [ ] Run: `npm run build`
- [ ] Run: `npx cap sync android`
- [ ] Run: `cd android`
- [ ] Run: `./gradlew bundleRelease`
- [ ] Or run: `npm run android:release`
- [ ] AAB created at: `android/app/build/outputs/bundle/release/app-release.aab`

### Test Release Build
- [ ] Install release build on device
- [ ] Test Google Sign-In works
- [ ] Verify no errors or warnings
- [ ] Test on multiple devices if possible

---

## Troubleshooting Section

If something doesn't work, check these:

### Still Getting 403 Error?
- [ ] Verified using system browser (not WebView)?
- [ ] Uninstalled old app version?
- [ ] Rebuilt with `npm run build && npx cap sync`?
- [ ] Reinstalled fresh APK?

### SHA-1 Errors?
- [ ] Verified correct SHA-1 for debug/release?
- [ ] Both SHA-1s added to Android OAuth client?
- [ ] Waited 5-10 minutes for Google Cloud changes?

### redirect_uri_mismatch?
- [ ] `com.arcana.app://auth` in Supabase redirect URLs?
- [ ] Package name exactly `com.arcana.app`?
- [ ] Rebuilt with `npx cap sync android`?

### Browser Opens But Doesn't Return?
- [ ] Deep link configured in Capacitor?
- [ ] Rebuilt with sync: `npx cap sync android`?
- [ ] Correct appId in `capacitor.config.ts`?

### Wrong Client ID?
- [ ] Using Web Client ID in Supabase (not Android)?
- [ ] Credentials from TAROT LIFE project (not Gemini)?
- [ ] Re-entered and saved in Supabase?

---

## Final Verification

Before considering setup complete:

- [ ] OAuth clients in TAROT LIFE project (confirmed)
- [ ] Both debug and release SHA-1s added (confirmed)
- [ ] Supabase has correct Web Client ID and Secret (confirmed)
- [ ] "Skip nonce check" enabled in Supabase (confirmed)
- [ ] Redirect URLs include `com.arcana.app://auth` (confirmed)
- [ ] Debug build tested successfully (confirmed)
- [ ] Google Sign-In works without 403 error (confirmed)
- [ ] User created in Supabase (confirmed)
- [ ] Release keystore created and secured (confirmed)
- [ ] Ready for production release (confirmed)

---

## Important Reminders

- **Project:** Always use TAROT LIFE for OAuth (not Gemini)
- **SHA-1:** Need both debug AND release fingerprints
- **Supabase:** Use Web Client ID (Android client has no secret)
- **Nonce:** Must enable "Skip nonce check" in Supabase
- **Browser:** System browser is key - no WebView
- **Security:** Never commit `keystore.properties` or keystore files

---

## Quick Commands

```bash
# Get debug SHA-1
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# Get release SHA-1
keytool -list -v -keystore android/release-key.keystore -alias arcana | grep SHA1

# Build and install debug
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat | grep -i "oauth\|google\|browser"

# Clear app data
adb shell pm clear com.arcana.app
```

---

**Setup Complete!** ✅

If all items are checked and tested, your Google OAuth is properly configured and ready for production!
