# Keystore Quick Start Guide

## One-Command Setup

Run this on your local machine to generate everything automatically:

### macOS/Linux:
```bash
./setup-keystores.sh
```

### Windows:
```bash
setup-keystores.bat
```

---

## What You'll Get

After running the script, you'll see output like this:

```
======================================
Setup Complete!
======================================

Your SHA-1 Fingerprints:

Debug SHA-1:
A1:B2:C3:D4:E5:F6:A7:B8:C9:D0:E1:F2:A3:B4:C5:D6:E7:F8:A9:B0

Release SHA-1:
C1:D2:E3:F4:A5:B6:C7:D8:E9:F0:A1:B2:C3:D4:E5:F6:A7:B8:C9:D0
```

---

## Copy Both SHA-1 Values to Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Select **TAROT LIFE** project
3. Go to **APIs & Services → Credentials**
4. Find or create **Android OAuth Client ID**
5. **Package name:** `com.arcana.app`
6. Click **"Add Fingerprint"** and paste the **Debug SHA-1**
7. Click **"Add Fingerprint"** again and paste the **Release SHA-1**
8. Click **"Save"**

---

## Important Details

### Keystore Password
The script creates your release keystore with this password:
```
ArcanaSecure2026!
```

**Save this password** in:
- Your password manager
- `android/keystore.properties` (already saved there)
- A secure backup location

### Files Created

```
✅ ~/.android/debug.keystore              (Debug keystore)
✅ android/arcana-release.keystore        (Release keystore - BACKUP THIS!)
✅ android/keystore.properties            (Config - NEVER commit to Git)
✅ android/SHA1_FINGERPRINTS.txt          (Reference file with all details)
```

### What's Protected

Your `.gitignore` has been updated to prevent committing:
- `*.keystore`
- `*.jks`
- `keystore.properties`

This keeps your signing keys safe!

---

## Build Your App

### Debug Build (for testing):
```bash
npm run android:run
```

### Release Build (for Play Store):
```bash
npm run android:release
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Backup Checklist

Before you do anything else, backup your release keystore:

- [ ] Copy `android/arcana-release.keystore` to password manager
- [ ] Copy `android/arcana-release.keystore` to encrypted cloud storage
- [ ] Save password `ArcanaSecure2026!` to password manager
- [ ] Copy `android/keystore.properties` to secure backup
- [ ] Write down the password in a physical location (just in case!)

**Why?** If you lose this keystore, you can NEVER update your app on Google Play Store!

---

## Troubleshooting

### "keytool: command not found"

Install Java:
- **macOS:** `brew install openjdk`
- **Ubuntu:** `sudo apt-get install openjdk-11-jdk`
- **Windows:** Download from [Oracle Java](https://www.oracle.com/java/technologies/downloads/)

### Script Completed But No SHA-1 Displayed

Check the saved file:
```bash
cat android/SHA1_FINGERPRINTS.txt
```

### Need to Regenerate

Just run the script again:
```bash
./setup-keystores.sh
```

It will detect existing keystores and ask if you want to keep or replace them.

---

## Next Steps

1. ✅ Run the setup script
2. ✅ Copy both SHA-1 fingerprints
3. ✅ Add to Google Cloud (TAROT LIFE project → Android OAuth Client)
4. ✅ Backup your release keystore
5. ✅ Continue with OAuth setup (see `COMPLETE_GOOGLE_OAUTH_GUIDE.md`)

---

## Your Project Details (for reference)

- **Package Name:** `com.arcana.app`
- **Release Keystore:** `android/arcana-release.keystore`
- **Keystore Alias:** `arcana`
- **Default Password:** `ArcanaSecure2026!`
- **Google Cloud Project:** TAROT LIFE (`tarot-life-485720`)

---

## Done! What's Next?

After adding your SHA-1 fingerprints to Google Cloud, continue with the full OAuth setup:

👉 See **COMPLETE_GOOGLE_OAUTH_GUIDE.md** for the complete step-by-step OAuth configuration.

---

**Questions?** Check the detailed guide:
- `KEYSTORE_SETUP_README.md` - Detailed keystore documentation
- `COMPLETE_GOOGLE_OAUTH_GUIDE.md` - Full OAuth setup guide
- `OAUTH_SETUP_CHECKLIST.md` - Interactive checklist
