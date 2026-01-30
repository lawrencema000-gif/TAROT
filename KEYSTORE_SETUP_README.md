# Keystore Setup for Arcana App

This guide helps you set up your Android keystores and SHA-1 fingerprints for Google OAuth.

---

## Why You Need This

To use Google Sign-In in your Android app, you need:
1. **Debug Keystore** - For testing during development
2. **Release Keystore** - For publishing to Google Play Store
3. **SHA-1 Fingerprints** - From both keystores to add to Google Cloud Console

---

## Quick Setup (Automated)

We've created automated scripts to set everything up for you!

### On macOS/Linux:

```bash
# Make the script executable
chmod +x setup-keystores.sh

# Run the script
./setup-keystores.sh
```

### On Windows:

```bash
# Run the batch script
setup-keystores.bat
```

The script will:
- ✅ Create debug keystore (if needed)
- ✅ Create release keystore with a secure password
- ✅ Extract both SHA-1 fingerprints
- ✅ Create `android/keystore.properties` file
- ✅ Save all details to `android/SHA1_FINGERPRINTS.txt`
- ✅ Display your SHA-1 fingerprints to copy

---

## What Gets Created

### 1. Debug Keystore
- **Location:** `~/.android/debug.keystore` (macOS/Linux) or `%USERPROFILE%\.android\debug.keystore` (Windows)
- **Alias:** `androiddebugkey`
- **Password:** `android` / `android`
- **Purpose:** Used automatically for debug builds

### 2. Release Keystore
- **Location:** `android/arcana-release.keystore`
- **Alias:** `arcana`
- **Password:** `ArcanaSecure2026!` (or custom if you change it)
- **Purpose:** Used for release builds and Play Store uploads

### 3. Keystore Properties File
- **Location:** `android/keystore.properties`
- **Purpose:** Tells Gradle how to sign your release builds
- **IMPORTANT:** Never commit this file to Git! (Already in `.gitignore`)

### 4. SHA-1 Fingerprints File
- **Location:** `android/SHA1_FINGERPRINTS.txt`
- **Purpose:** Contains both SHA-1 fingerprints and instructions
- **Use:** Copy these fingerprints to Google Cloud Console

---

## Manual Setup (If Scripts Don't Work)

### Step 1: Create Debug Keystore

**On macOS/Linux:**
```bash
keytool -genkey -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass android \
  -keypass android \
  -dname "CN=Android Debug,O=Android,C=US"
```

**On Windows:**
```bash
keytool -genkey -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
```

### Step 2: Create Release Keystore

```bash
cd android

keytool -genkey -v \
  -keystore arcana-release.keystore \
  -alias arcana \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You'll be prompted for:
- Keystore password (create a strong one!)
- Key password (use the same as keystore password)
- Your name, organization, location details

**IMPORTANT:** Write down your password! You'll need it forever.

### Step 3: Get Debug SHA-1

**On macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

**On Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr SHA1
```

Copy the SHA1 value (e.g., `A1:B2:C3:D4:...`)

### Step 4: Get Release SHA-1

```bash
keytool -list -v -keystore android/arcana-release.keystore -alias arcana | grep SHA1
```

Enter your keystore password when prompted, then copy the SHA1 value.

### Step 5: Create keystore.properties

Create `android/keystore.properties`:

```properties
storeFile=arcana-release.keystore
storePassword=YOUR_PASSWORD_HERE
keyAlias=arcana
keyPassword=YOUR_PASSWORD_HERE
```

Replace `YOUR_PASSWORD_HERE` with your actual password.

---

## Using Your SHA-1 Fingerprints

### Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select **TAROT LIFE** project
3. Go to **APIs & Services → Credentials**
4. Click on your **Android OAuth Client ID** (or create one if you haven't)
5. Add **both SHA-1 fingerprints**:
   - Debug SHA-1 (from `~/.android/debug.keystore`)
   - Release SHA-1 (from `android/arcana-release.keystore`)
6. Click **Save**
7. Wait 5-10 minutes for changes to propagate

### Verify in Your Build

Debug builds automatically use the debug keystore.

Release builds use the release keystore if `keystore.properties` exists:

```bash
# Build release APK
cd android
./gradlew assembleRelease

# Build release AAB (for Play Store)
./gradlew bundleRelease
```

Or use the npm scripts:
```bash
npm run android:release
```

---

## Security Best Practices

### ✅ DO:
- ✅ Backup your release keystore to multiple secure locations
- ✅ Store keystore password in a password manager
- ✅ Keep `keystore.properties` file secret
- ✅ Use a strong, unique password for release keystore
- ✅ Add `*.keystore`, `*.jks`, and `keystore.properties` to `.gitignore`

### ❌ DON'T:
- ❌ Never commit keystores to Git/GitHub
- ❌ Never commit `keystore.properties` to Git
- ❌ Never share your keystore password publicly
- ❌ Never lose your release keystore (you can't update your app without it!)
- ❌ Never use the same keystore for multiple apps

---

## Backup Your Release Keystore

**CRITICAL:** If you lose your release keystore, you **cannot** update your app on Google Play Store. You'd have to publish a completely new app with a new package name.

### Recommended Backup Locations:

1. **Password Manager** (1Password, LastPass, Bitwarden)
   - Store the keystore file
   - Store the password
   - Add notes about the app

2. **Encrypted Cloud Storage** (Google Drive, Dropbox, iCloud)
   - Upload `arcana-release.keystore`
   - Store password separately in password manager

3. **Physical Backup** (USB drive, external hard drive)
   - Copy `arcana-release.keystore`
   - Store in a safe location

4. **Team Share** (if applicable)
   - Share with team via secure method (not email!)
   - Use encrypted file sharing service

---

## Troubleshooting

### Problem: "keytool: command not found"

**Solution:**
- Install Java JDK
- **macOS:** `brew install openjdk`
- **Ubuntu:** `sudo apt-get install openjdk-11-jdk`
- **Windows:** Download from [Oracle](https://www.oracle.com/java/technologies/downloads/)

### Problem: "Cannot find debug.keystore"

**Solution:**
The debug keystore is usually auto-created by Android SDK. If it doesn't exist:
- Run the setup script: `./setup-keystores.sh`
- Or manually create it using the commands above

### Problem: "Incorrect keystore password"

**Solution:**
- Debug keystore password is always `android`
- Release keystore password is what you set (check `keystore.properties`)
- If you forgot it, you need to create a new release keystore

### Problem: "SHA-1 doesn't work in Google Cloud"

**Solution:**
1. Verify you're using the correct keystore (debug for debug builds, release for release builds)
2. Ensure SHA-1 format includes colons (e.g., `A1:B2:C3:...`)
3. Wait 5-10 minutes after adding to Google Cloud
4. Try removing and re-adding the SHA-1
5. Ensure package name matches exactly: `com.arcana.app`

### Problem: "Release build fails to sign"

**Solution:**
1. Verify `android/keystore.properties` exists
2. Verify `android/arcana-release.keystore` exists
3. Check that passwords in `keystore.properties` are correct
4. Verify `storeFile` path is relative to `android/` directory

---

## File Structure After Setup

```
project/
├── android/
│   ├── arcana-release.keystore          # Release keystore (keep secret!)
│   ├── keystore.properties              # Keystore config (keep secret!)
│   ├── SHA1_FINGERPRINTS.txt            # Your SHA-1 values
│   ├── .gitignore                       # Ensures secrets not committed
│   └── app/
│       └── build.gradle                 # Uses keystore.properties
├── setup-keystores.sh                   # Setup script (macOS/Linux)
├── setup-keystores.bat                  # Setup script (Windows)
└── ~/.android/
    └── debug.keystore                   # Debug keystore (auto-used)
```

---

## Quick Commands Reference

### Get SHA-1 Fingerprints

```bash
# Debug SHA-1 (macOS/Linux)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# Debug SHA-1 (Windows)
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr SHA1

# Release SHA-1
keytool -list -v -keystore android/arcana-release.keystore -alias arcana | grep SHA1
```

### Build Commands

```bash
# Debug build
npm run android:run

# Release build (creates AAB for Play Store)
npm run android:release

# Or manually
cd android
./gradlew assembleDebug    # Debug APK
./gradlew assembleRelease  # Release APK
./gradlew bundleRelease    # Release AAB (for Play Store)
```

---

## Next Steps

After setting up your keystores:

1. ✅ Run the setup script to create keystores
2. ✅ Copy SHA-1 fingerprints from `android/SHA1_FINGERPRINTS.txt`
3. ✅ Add both SHA-1 fingerprints to Google Cloud Console (TAROT LIFE project)
4. ✅ Update Supabase Google OAuth provider (see `COMPLETE_GOOGLE_OAUTH_GUIDE.md`)
5. ✅ Backup your release keystore securely
6. ✅ Build and test your app
7. ✅ Test Google Sign-In on a physical device

---

## Support

For complete OAuth setup instructions, see:
- `COMPLETE_GOOGLE_OAUTH_GUIDE.md` - Full setup guide
- `OAUTH_SETUP_CHECKLIST.md` - Step-by-step checklist
- `QUICK_ANSWERS.md` - Quick reference

---

**Remember:** Your release keystore is irreplaceable. Back it up now! 🔐
