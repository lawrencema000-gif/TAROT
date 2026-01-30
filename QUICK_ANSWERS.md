# Quick Answers to Your OAuth Setup Questions

## Question 1: What Do I Need to Remove from My Current Setup?

### Answer: Nothing! 🎉

**You DON'T need to remove anything:**

- ✅ **Keep** your Gemini Google Cloud project (you may need it for Gemini API)
- ✅ **Keep** all existing OAuth credentials in Gemini project
- ✅ **Keep** your current `.env` file (no changes needed)
- ✅ **Keep** all your code and dependencies
- ✅ **Keep** your existing Supabase configuration

**What you're doing is ADDING to your setup, not removing:**
- Adding new OAuth clients in the TAROT LIFE project
- Updating (not replacing) Supabase OAuth settings
- Adding SHA-1 fingerprints

**Why keep the Gemini project?**
- You might be using it for other APIs (like Gemini AI)
- It won't interfere with your mobile OAuth
- You just won't use its OAuth credentials for mobile

---

## Question 2: Which APIs Do I Need to Enable/Disable?

### In TAROT LIFE Google Cloud Project:

**✅ APIs to ENABLE:**

1. **Google+ API** (or **People API**)
   - Why: To access user profile information
   - Where: APIs & Services → Library → Search "Google+ API" → Enable

2. **Identity Toolkit API**
   - Why: Required for Google Sign-In
   - Where: APIs & Services → Library → Search "Identity Toolkit" → Enable

3. **Google Sign-In API** (usually auto-enabled)
   - Why: Core OAuth functionality
   - Where: Should automatically enable when you create OAuth clients

**❌ APIs to DISABLE:**

None! Don't disable anything.

**Current Status Check:**

Go to: APIs & Services → Dashboard

You should see these enabled:
- ✅ Google+ API (or People API)
- ✅ Identity Toolkit API
- ✅ Google Sign-In API

---

## Question 3: What's Already Added to My Bolt Project?

### Already Implemented ✅

**1. Dependencies Added:**
```json
"@capacitor/browser": "^8.0.0"
```
This is already in your `package.json`.

**2. Capacitor Configuration:**
Your `capacitor.config.ts` already has:
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

**3. Authentication Code:**
Your `AuthContext.tsx` has been updated to:
- Detect mobile vs web platform
- Open OAuth in system browser on mobile (using `Browser.open()`)
- Handle the callback when authentication completes
- Automatically close the browser

**4. Android Configuration:**
- Package name: `com.arcana.app`
- Deep link scheme: `com.arcana.app://auth`
- Keystore signing configuration in `android/app/build.gradle`

**5. Environment Variables:**
Your `.env` is already correct:
```env
VITE_SUPABASE_URL=https://ulzlthhkqjuohzjangcq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### What You Need to Do:

**The code is done!** You just need to configure:

1. **Google Cloud (TAROT LIFE project):**
   - Create Web OAuth Client
   - Create Android OAuth Client
   - Add SHA-1 fingerprints

2. **Supabase:**
   - Update Google provider with new credentials
   - Enable "Skip nonce check"
   - Verify redirect URLs

3. **Local:**
   - Get your SHA-1 fingerprints
   - Create release keystore (if needed)

**That's it!** No code changes needed in your Bolt project.

---

## Question 4: How Do I Get the SHA-1 Certificate Fingerprint?

### Debug SHA-1 (For Development)

**On macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**On Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**Look for this in the output:**
```
Certificate fingerprints:
     SHA1: 9A:8B:7C:6D:5E:4F:3A:2B:1C:0D:9E:8F:7A:6B:5C:4D:3E:2F:1A:0B
```

Copy the entire SHA1 value (including the colons).

### Release SHA-1 (For Production)

**First, check if you have a release keystore:**
```bash
ls -la android/*.keystore android/*.jks
```

**If you have one:**
```bash
keytool -list -v -keystore android/release-key.keystore -alias arcana
```

Enter the keystore password when prompted, then copy the SHA1.

**If you DON'T have one, create it:**
```bash
cd android

keytool -genkey -v -keystore release-key.keystore -alias arcana -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- Keystore password (create a strong one!)
- Name, organization, location details
- Confirm with "yes"

Then get the SHA-1:
```bash
keytool -list -v -keystore android/release-key.keystore -alias arcana
```

**Important:** After creating the keystore, create a `keystore.properties` file:
```properties
storeFile=release-key.keystore
storePassword=YOUR_PASSWORD_HERE
keyAlias=arcana
keyPassword=YOUR_PASSWORD_HERE
```

Save this file in the `android/` directory.

---

## Summary: Your Action Items

### 1. Get SHA-1 Fingerprints
- [ ] Run the keytool command for debug
- [ ] Run the keytool command for release (or create keystore first)
- [ ] Save both SHA-1 values

### 2. Configure Google Cloud (TAROT LIFE)
- [ ] Switch to TAROT LIFE project
- [ ] Enable Google+ API and Identity Toolkit API
- [ ] Create Web OAuth Client (save Client ID and Secret)
- [ ] Create Android OAuth Client (add both SHA-1 fingerprints)

### 3. Configure Supabase
- [ ] Update Google provider with Web Client ID and Secret
- [ ] Enable "Skip nonce check"
- [ ] Verify redirect URLs include `com.arcana.app://auth`

### 4. Build and Test
- [ ] Run: `npm run build && npx cap sync android`
- [ ] Build debug APK and install on device
- [ ] Test Google Sign-In (should open system browser, not WebView)
- [ ] Verify successful sign-in

---

## What's Changed from Before?

**Before:**
- OAuth opened in WebView
- Google blocked with 403 error
- OAuth credentials maybe in wrong project

**After:**
- OAuth opens in system browser ✅
- Google allows authentication ✅
- OAuth credentials in TAROT LIFE project ✅
- Code already updated to use system browser ✅

**The key fix:** Opening OAuth in the system browser instead of a WebView. This is already implemented in your code!

---

## Need More Details?

- **Full Setup Guide:** See `COMPLETE_GOOGLE_OAUTH_GUIDE.md`
- **Step-by-Step Checklist:** See `OAUTH_SETUP_CHECKLIST.md`
- **Original Guide:** See `GOOGLE_OAUTH_SETUP.md`

---

## Still Have Questions?

### "Do I need to change my .env file?"
**No!** Your `.env` is already correct. OAuth configuration is in Google Cloud and Supabase, not in `.env`.

### "Do I need to modify any code?"
**No!** All code changes are already implemented. You just need to configure Google Cloud and Supabase.

### "Will this break my existing setup?"
**No!** This is purely additive. Your existing functionality won't be affected.

### "Do I need both SHA-1 fingerprints?"
**Yes!** You need:
- Debug SHA-1 for development/testing
- Release SHA-1 for production/Play Store

### "Which Google Cloud project should I use?"
**TAROT LIFE** - the one linked to your Play Store Console. Don't use the Gemini project for mobile OAuth.

### "What's the difference between Web and Android OAuth clients?"
- **Web OAuth Client:** Used by Supabase to handle OAuth flow (has Client ID + Secret)
- **Android OAuth Client:** Validates your app can use OAuth (has package name + SHA-1, no secret)

You need BOTH!

---

## Quick Reference: Key Values

### Your Project Details:
- **Package Name:** `com.arcana.app`
- **Supabase URL:** `https://ulzlthhkqjuohzjangcq.supabase.co`
- **Supabase Project ID:** `ulzlthhkqjuohzjangcq`
- **Google Cloud Project:** TAROT LIFE (`tarot-life-485720`)
- **Deep Link Scheme:** `com.arcana.app://auth`
- **Keystore Alias:** `arcana`
- **Keystore File:** `release-key.keystore`

### What You Need to Get:
- [ ] Web OAuth Client ID from TAROT LIFE
- [ ] Web OAuth Client Secret from TAROT LIFE
- [ ] Debug SHA-1 fingerprint
- [ ] Release SHA-1 fingerprint

---

**That's everything you need to know!** The setup is straightforward once you have these pieces in place.

Good luck! 🚀
