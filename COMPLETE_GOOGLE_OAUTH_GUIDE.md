# Complete Google OAuth Setup Guide for Arcana Android App

This is your complete guide to fix the Google OAuth 403 error and get Google Sign-In working perfectly in your Android app.

---

## Table of Contents

1. [What's the Problem?](#whats-the-problem)
2. [What to Remove/Keep from Current Setup](#what-to-removekeep-from-current-setup)
3. [Getting SHA-1 Certificate Fingerprints](#getting-sha-1-certificate-fingerprints)
4. [Step-by-Step Setup Process](#step-by-step-setup-process)
5. [What's Already Added to Your Bolt Project](#whats-already-added-to-your-bolt-project)
6. [Building and Testing](#building-and-testing)
7. [Troubleshooting](#troubleshooting)

---

## What's the Problem?

You're getting a `403: disallowed_useragent` error because Google blocks OAuth sign-in from embedded WebViews for security reasons.

**The Fix:** Open OAuth in the device's system browser (Chrome, Firefox, etc.) instead of a WebView.

**Status:** ✅ The code fix is already implemented in your project using Capacitor's Browser plugin.

---

## What to Remove/Keep from Current Setup

### ❌ What to REMOVE

**Nothing needs to be removed!** Here's what stays:

#### From Gemini Google Cloud Project:
- **Keep:** The entire project (you need it for Gemini API if you're using it)
- **Keep:** All existing credentials
- **Note:** You just won't use these credentials for mobile OAuth anymore

#### From Your Code:
- **Nothing to remove** - All code changes have already been made
- Your existing `.env` file is correct
- Your Capacitor configuration is correct

### ✅ What to KEEP

#### In Your Current Setup:
- ✅ `.env` file with Supabase credentials
- ✅ `capacitor.config.ts` configuration
- ✅ All existing code and dependencies
- ✅ Your Android project structure
- ✅ RevenueCat API key (for in-app purchases)

#### What You're Adding (Not Replacing):
- New OAuth clients in **TAROT LIFE** Google Cloud project
- Updated Supabase OAuth provider settings
- SHA-1 fingerprints for your app

---

## Getting SHA-1 Certificate Fingerprints

You need **TWO** SHA-1 fingerprints: one for development (debug) and one for production (release).

### Method 1: Debug SHA-1 (For Development/Testing)

The debug keystore is automatically created by Android SDK. Run this command:

**On macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**On Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**You'll see output like this:**
```
Alias name: androiddebugkey
Creation date: Jan 30, 2024
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Android Debug, O=Android, C=US
Issuer: CN=Android Debug, O=Android, C=US
Serial number: 1
Valid from: Wed Jan 30 10:00:00 PST 2024 until: Fri Jan 22 10:00:00 PST 2054
Certificate fingerprints:
     MD5:  AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
     SHA1: 9A:8B:7C:6D:5E:4F:3A:2B:1C:0D:9E:8F:7A:6B:5C:4D:3E:2F:1A:0B
     SHA256: 1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B
```

**Copy the SHA1 value** (the line starting with `SHA1:`). Example: `9A:8B:7C:6D:5E:4F:3A:2B:1C:0D:9E:8F:7A:6B:5C:4D:3E:2F:1A:0B`

### Method 2: Release SHA-1 (For Production)

#### Option A: If You Already Have a Release Keystore

Check if you have a release keystore:
```bash
ls -la android/*.keystore android/*.jks android/app/*.keystore android/app/*.jks
```

If found, get the SHA-1:
```bash
keytool -list -v -keystore android/release-key.keystore -alias arcana
```

You'll be asked for the keystore password. Enter it, then copy the SHA1 fingerprint.

#### Option B: If You Don't Have a Release Keystore Yet

**Create one now** (you'll need it for production anyway):

```bash
cd android

keytool -genkey -v -keystore release-key.keystore -alias arcana -keyalg RSA -keysize 2048 -validity 10000
```

**You'll be prompted for:**
- Keystore password: **Create a strong password** (WRITE THIS DOWN - you'll need it forever!)
- Re-enter password: Same password
- First and last name: Your name or company name
- Organizational unit: Your team/department (e.g., "Development")
- Organization: Your company name (e.g., "Arcana")
- City or Locality: Your city
- State or Province: Your state/province
- Two-letter country code: Your country (e.g., "US")
- Is this correct? Type `yes`
- Key password: Press Enter to use same password as keystore

**Then get the SHA-1:**
```bash
keytool -list -v -keystore android/release-key.keystore -alias arcana
```

Enter the password you just created and copy the SHA1 fingerprint.

**IMPORTANT:** Create a `keystore.properties` file:
```bash
cd android
nano keystore.properties
```

Add this content (replace with your actual password):
```properties
storeFile=release-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=arcana
keyPassword=YOUR_KEY_PASSWORD
```

**Save this file** and **NEVER commit it to Git** (it's already in `.gitignore`).

### Quick Reference: Common Keystore Locations

- Debug keystore: `~/.android/debug.keystore` (macOS/Linux) or `%USERPROFILE%\.android\debug.keystore` (Windows)
- Release keystore: Usually in `android/` directory or specified in your CI/CD
- Default debug alias: `androiddebugkey`
- Default debug passwords: store=`android`, key=`android`

---

## Step-by-Step Setup Process

### Step 1: Switch to TAROT LIFE Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the **project dropdown** at the very top (next to "Google Cloud")
3. You'll see a list of your projects
4. **Select "TAROT LIFE"** (Project ID: `tarot-life-485720`)
5. Verify the project name appears in the top bar: "TAROT LIFE"

**Why TAROT LIFE?** This is your Play Store linked project - keeping everything in one project makes management easier and avoids configuration issues.

### Step 2: Enable Required APIs

1. In TAROT LIFE project, go to **☰ Menu → APIs & Services → Library**
2. Search for and enable these APIs:

   **Google+ API** (or People API):
   - Search: "Google+ API" or "People API"
   - Click the result
   - Click **"Enable"** button
   - Wait for confirmation

   **Google Identity Toolkit API**:
   - Search: "Identity Toolkit"
   - Click the result
   - Click **"Enable"** button

3. Verify enabled APIs:
   - Go to **APIs & Services → Dashboard**
   - You should see:
     - ✅ Google+ API (or People API)
     - ✅ Identity Toolkit API
     - ✅ Google Sign-In API (usually auto-enabled)

### Step 3: Configure OAuth Consent Screen

Before creating OAuth clients, you need to set up the consent screen (if not already done):

1. Go to **APIs & Services → OAuth consent screen**

2. **User Type:**
   - Choose **"External"** (unless you have a Google Workspace organization)
   - Click **"Create"**

3. **App Information:**
   - App name: `Arcana` or `Tarot Life`
   - User support email: Your email address
   - App logo: (optional, can add later)

4. **App domain:**
   - Application home page: Your website (optional)
   - Privacy policy: Your privacy policy URL (optional for testing)
   - Terms of service: Your terms URL (optional for testing)

5. **Authorized domains:**
   - Add: `supabase.co`

6. **Developer contact information:**
   - Email addresses: Your email
   - Click **"Save and Continue"**

7. **Scopes:**
   - Click **"Add or Remove Scopes"**
   - Select these scopes:
     - `./auth/userinfo.email`
     - `./auth/userinfo.profile`
     - `openid`
   - Click **"Update"**
   - Click **"Save and Continue"**

8. **Test users** (optional for now):
   - You can add test email addresses if needed
   - Click **"Save and Continue"**

9. **Summary:**
   - Review and click **"Back to Dashboard"**

### Step 4: Create OAuth Client ID for Supabase (Web)

1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth 2.0 Client ID"**

4. **Configure the Web Application:**
   - Application type: **Web application**
   - Name: `Arcana Web / Supabase Auth`

5. **Authorized JavaScript origins:**
   - Click **"+ Add URI"**
   - Add: `https://ulzlthhkqjuohzjangcq.supabase.co`

6. **Authorized redirect URIs:**
   - Click **"+ Add URI"**
   - Add: `https://ulzlthhkqjuohzjangcq.supabase.co/auth/v1/callback`

7. Click **"Create"**

8. **SAVE THESE VALUES** (you'll need them soon):
   ```
   Client ID: xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   **Copy both values to a secure location** (e.g., password manager or notes)

9. Click **"OK"** to close the dialog

### Step 5: Create OAuth Client ID for Android

1. Still in **APIs & Services → Credentials**
2. Click **"+ Create Credentials"** again
3. Select **"OAuth 2.0 Client ID"**

4. **Configure the Android Application:**
   - Application type: **Android**
   - Name: `Arcana Android App`

5. **Package name:**
   ```
   com.arcana.app
   ```

   **IMPORTANT:** This must exactly match your Android app's package name!

6. **SHA-1 certificate fingerprint:**
   - Paste your **DEBUG SHA-1** that you got earlier
   - Format should be like: `9A:8B:7C:6D:5E:4F:3A:2B:1C:0D:9E:8F:7A:6B:5C:4D:3E:2F:1A:0B`

7. Click **"Create"**

8. **Note:** Android clients don't get a Client Secret - this is normal!

9. **Add your RELEASE SHA-1:**
   - Click on the Android client you just created (in the OAuth 2.0 Client IDs list)
   - Click **"Add Fingerprint"** button
   - Paste your **RELEASE SHA-1**
   - Click **"Save"**

**You should now see TWO fingerprints in your Android OAuth client:**
- Debug SHA-1 (for development)
- Release SHA-1 (for production)

### Step 6: Configure Supabase OAuth Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (the one with ID: `ulzlthhkqjuohzjangcq`)
3. Go to **🔐 Authentication** in the left sidebar
4. Click **"Providers"** tab

5. **Find Google Provider:**
   - Scroll down to find "Google"
   - Click on it to expand

6. **Enable and Configure:**
   - Toggle: **Enabled** = ON
   - **Client ID (for OAuth):** Paste the Web Client ID from Step 4
   - **Client Secret (for OAuth):** Paste the Web Client Secret from Step 4

7. **Advanced Settings** (expand if collapsed):
   - ✅ **Skip nonce check** = ON (IMPORTANT for mobile!)
   - Authorized Client IDs: Leave empty
   - Scopes: Leave default or use: `openid email profile`

8. Click **"Save"** at the bottom

### Step 7: Configure Supabase Redirect URLs

1. Still in **Authentication**, click **"URL Configuration"** tab

2. **Site URL:**
   ```
   https://ulzlthhkqjuohzjangcq.supabase.co
   ```
   (This should already be set)

3. **Redirect URLs** section:
   - Click **"Add URL"** or edit the existing list
   - Ensure these URLs are listed (one per line):
   ```
   https://ulzlthhkqjuohzjangcq.supabase.co/**
   com.arcana.app://auth
   http://localhost:5173
   ```

4. **Additional settings:**
   - Redirect URL Validation: Disabled or add patterns as needed
   - Rate Limiting: Keep default settings

5. Click **"Save"**

---

## What's Already Added to Your Bolt Project

Good news! The code changes are already implemented. Here's what's in place:

### ✅ Installed Packages

From `package.json`:
```json
"@capacitor/browser": "^8.0.0"  // For opening system browser
```

This package enables opening OAuth flows in the system browser instead of a WebView.

### ✅ Capacitor Configuration

From `capacitor.config.ts`:
```typescript
server: {
  allowNavigation: [
    '*.supabase.co',
    'accounts.google.com',
    '*.google.com',
    '*.googleapis.com',
  ],
}
```

This allows the app to navigate to Google and Supabase domains.

### ✅ Authentication Code

The `AuthContext.tsx` file has been updated to:
- Detect when running on Android (vs web)
- Use `Browser.open()` to open OAuth in system browser on mobile
- Automatically close the browser when authentication completes
- Handle the deep link callback when returning to the app

**The fix is already implemented** - you just need to configure the Google Cloud and Supabase settings!

### ✅ Android Configuration

- Package name: `com.arcana.app`
- Deep linking scheme: `com.arcana.app://auth`
- Release keystore configuration in `android/app/build.gradle`

### ✅ Environment Variables

Your `.env` file already has:
```env
VITE_SUPABASE_URL=https://ulzlthhkqjuohzjangcq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_REVENUECAT_API_KEY=goog_UfsNCwfdvoXsFGRGrIFnZvhXPPx
```

**No changes needed to your `.env` file!**

---

## Building and Testing

### Build Process

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Build the web assets:**
   ```bash
   npm run build
   ```

3. **Sync to Android:**
   ```bash
   npx cap sync android
   ```

### Debug Build (For Testing)

Build a debug APK:
```bash
cd android
./gradlew assembleDebug
```

**Output location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Install on device:**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or use the helper script:
```bash
npm run android:run
```

### Release Build (For Production)

Build a release bundle for Play Store:
```bash
cd android
./gradlew bundleRelease
```

**Output location:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

Or use the helper script:
```bash
npm run android:release
```

### Testing OAuth

1. **Launch the app** on your device
2. **Tap "Continue with Google"**
3. **Expected behavior:**
   - ✅ Your device's system browser opens (Chrome, Firefox, etc.)
   - ✅ You see the real Google sign-in page (not a 403 error!)
   - ✅ You can select/sign in to your Google account
   - ✅ Google asks for permission (email, profile)
   - ✅ After granting permission, browser closes automatically
   - ✅ You're back in the app, signed in successfully
   - ✅ Your profile page shows your Google account info

4. **If successful:**
   - Your user will be created in Supabase
   - Check Supabase Dashboard → Authentication → Users to see the new user

### Checking Logs

If something doesn't work, check the Android logs:

```bash
# All logs
adb logcat

# Filter for relevant logs
adb logcat | grep -i "oauth\|supabase\|google\|browser"

# Filter for your app only
adb logcat | grep "com.arcana.app"
```

---

## Troubleshooting

### Problem: Still Getting 403 Error

**Possible Causes:**
1. OAuth is still opening in WebView (not system browser)
2. App wasn't rebuilt after code changes

**Solutions:**
- Uninstall the old app completely
- Rebuild with `npm run build && npx cap sync android`
- Reinstall the app
- Ensure you're using the latest code

### Problem: "Invalid SHA-1 Certificate"

**Cause:** The SHA-1 in Google Cloud doesn't match your app's signing key.

**Solutions:**
1. **Verify the correct SHA-1:**
   ```bash
   # For debug
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

   # For release
   keytool -list -v -keystore android/release-key.keystore -alias arcana | grep SHA1
   ```

2. **Update in Google Cloud:**
   - Go to your Android OAuth client
   - Remove incorrect fingerprints
   - Add the correct SHA-1
   - Save changes
   - Wait 5-10 minutes for changes to propagate

3. **Rebuild and test**

### Problem: "redirect_uri_mismatch"

**Cause:** Redirect URI isn't properly configured.

**Solutions:**
1. **Check Supabase redirect URLs:**
   - Must include: `com.arcana.app://auth`
   - Format matters - no trailing slashes

2. **Check Android package name:**
   - Must be exactly: `com.arcana.app`
   - Check in `capacitor.config.ts` and `android/app/build.gradle`

3. **Rebuild after any changes:**
   ```bash
   npx cap sync android
   ```

### Problem: Browser Opens But Doesn't Return to App

**Cause:** Deep linking not working.

**Solutions:**
1. **Verify Capacitor config:**
   - Check `capacitor.config.ts` has correct `appId`: `com.arcana.app`

2. **Rebuild to sync deep link configuration:**
   ```bash
   npx cap sync android
   cd android
   ./gradlew assembleDebug
   ```

3. **Check AndroidManifest.xml:**
   - Should have intent filter for `com.arcana.app`
   - This is auto-generated by Capacitor

### Problem: "Client ID doesn't match"

**Cause:** Using wrong OAuth client or wrong project.

**Solutions:**
1. **Verify you're using TAROT LIFE project:**
   - Check Google Cloud Console shows "TAROT LIFE" at top
   - OAuth clients should be in this project

2. **Verify correct Client IDs in Supabase:**
   - Should be the **Web Client ID** from TAROT LIFE project
   - NOT the Android Client ID
   - NOT credentials from Gemini project

3. **Re-enter credentials in Supabase:**
   - Copy the Web Client ID from TAROT LIFE
   - Copy the Client Secret
   - Paste both into Supabase Google provider
   - Save

### Problem: Changes Not Taking Effect

**Solutions:**
1. **Clear app data:**
   ```
   Settings → Apps → Arcana → Storage → Clear Data
   ```

2. **Uninstall and reinstall:**
   ```bash
   adb uninstall com.arcana.app
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

3. **Wait for Google Cloud changes:**
   - Changes to OAuth clients can take 5-10 minutes to propagate
   - Try again after waiting

### Problem: "No matching Client ID found"

**Cause:** Android OAuth client not properly configured.

**Solutions:**
1. **Verify Android OAuth client has:**
   - Package name: `com.arcana.app`
   - Both debug AND release SHA-1 fingerprints
   - Both fingerprints are correct

2. **Verify you're testing with the correct build:**
   - Debug build = needs debug SHA-1
   - Release build = needs release SHA-1

---

## Checklist: Before Going to Production

Use this checklist to ensure everything is configured correctly:

### Google Cloud (TAROT LIFE Project)

- [ ] Logged into Google Cloud Console
- [ ] Switched to **TAROT LIFE** project (not Gemini)
- [ ] Google+ API (or People API) is enabled
- [ ] Identity Toolkit API is enabled
- [ ] OAuth consent screen is configured
- [ ] Web OAuth Client created with:
  - [ ] JavaScript origin: `https://ulzlthhkqjuohzjangcq.supabase.co`
  - [ ] Redirect URI: `https://ulzlthhkqjuohzjangcq.supabase.co/auth/v1/callback`
- [ ] Android OAuth Client created with:
  - [ ] Package name: `com.arcana.app`
  - [ ] Debug SHA-1 fingerprint added
  - [ ] Release SHA-1 fingerprint added

### Supabase Configuration

- [ ] Google provider is enabled
- [ ] Web Client ID from TAROT LIFE entered
- [ ] Client Secret from TAROT LIFE entered
- [ ] "Skip nonce check" is enabled
- [ ] Redirect URLs include: `com.arcana.app://auth`
- [ ] Site URL is set correctly

### Local Development

- [ ] Release keystore created
- [ ] `android/keystore.properties` file created
- [ ] Release SHA-1 obtained and added to Google Cloud
- [ ] Keystore password saved securely (NOT in Git!)

### Testing

- [ ] Debug build installs successfully
- [ ] "Continue with Google" opens system browser
- [ ] Google sign-in completes without errors
- [ ] Browser closes automatically after sign-in
- [ ] User is logged into the app
- [ ] User profile appears in Supabase Dashboard
- [ ] Tested on physical device
- [ ] Release build created successfully
- [ ] Release build tested and works

### Security

- [ ] `keystore.properties` is in `.gitignore`
- [ ] Release keystore is backed up securely
- [ ] Client Secret is not committed to Git
- [ ] OAuth credentials are from correct project (TAROT LIFE)

---

## Quick Command Reference

### Get SHA-1 Fingerprints

```bash
# Debug SHA-1 (macOS/Linux)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# Debug SHA-1 (Windows)
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr SHA1

# Release SHA-1
keytool -list -v -keystore android/release-key.keystore -alias arcana | grep SHA1
```

### Build Commands

```bash
# Full build and install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk

# Quick run (with helper script)
npm run android:run

# Release build
npm run android:release
```

### Debug Commands

```bash
# View logs
adb logcat

# View OAuth-related logs
adb logcat | grep -i "oauth\|google\|browser"

# Clear app data
adb shell pm clear com.arcana.app

# Uninstall app
adb uninstall com.arcana.app

# List installed packages (verify app is installed)
adb shell pm list packages | grep arcana
```

---

## Summary: What Changes You Need to Make

### In Google Cloud (TAROT LIFE Project):
1. ✅ Enable APIs: Google+ API, Identity Toolkit API
2. ✅ Create Web OAuth Client (for Supabase)
3. ✅ Create Android OAuth Client (with both SHA-1 fingerprints)

### In Supabase:
1. ✅ Update Google provider with TAROT LIFE credentials
2. ✅ Enable "Skip nonce check"
3. ✅ Add `com.arcana.app://auth` to redirect URLs

### In Your Project:
1. ✅ **Nothing!** Code is already updated
2. ✅ Create release keystore (if you don't have one)
3. ✅ Create `keystore.properties` file (for signing)
4. ✅ Build and test

### What NOT to Change:
- ❌ Don't modify `.env` file
- ❌ Don't remove Gemini project
- ❌ Don't change existing code
- ❌ Don't modify Capacitor config

---

## Support & Resources

- **Google OAuth Docs:** https://developers.google.com/identity/protocols/oauth2/native-app
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth/social-login/auth-google
- **Capacitor Browser Plugin:** https://capacitorjs.com/docs/apis/browser
- **Android App Signing:** https://developer.android.com/studio/publish/app-signing

---

## Final Notes

1. **The code fix is already done** - you just need to configure Google Cloud and Supabase
2. **Use TAROT LIFE project** for OAuth (not Gemini)
3. **Add both SHA-1 fingerprints** (debug and release)
4. **"Skip nonce check"** must be enabled in Supabase
5. **System browser** is the key - no more WebView!
6. **Test thoroughly** before releasing to production

Once you complete the setup, your Google Sign-In will work perfectly with the system browser, and the 403 error will be gone forever!

---

**Questions or issues?** Double-check each step in this guide. The most common issues are:
- Wrong Google Cloud project (use TAROT LIFE)
- Missing SHA-1 fingerprints
- Incorrect Client ID in Supabase
- Not enabling "Skip nonce check"
- Not rebuilding after changes

Good luck! 🚀
