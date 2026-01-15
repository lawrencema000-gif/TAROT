# Google Play Store Release Guide

This guide will walk you through the process of releasing your app to the Google Play Store internal testing track.

## Prerequisites

- Google Play Console account
- Android Studio installed (or access to keytool command)
- App registered in Google Play Console

## Step 1: Generate a Signing Keystore

You need a keystore file to sign your release builds. Run this command to generate one:

```bash
keytool -genkey -v -keystore android/release-key.keystore -alias arcana -keyalg RSA -keysize 2048 -validity 10000
```

This will prompt you for:
- Keystore password (choose a strong password)
- Key password (can be the same as keystore password)
- Your name, organization, city, state, country

**IMPORTANT**: Keep your keystore file and passwords safe! Store them securely. If you lose them, you cannot update your app.

## Step 2: Create keystore.properties File

Create a file named `keystore.properties` in the `android/` directory:

```bash
cd android
cp keystore.properties.example keystore.properties
```

Edit `android/keystore.properties` with your actual values:

```properties
storeFile=release-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=arcana
keyPassword=YOUR_KEY_PASSWORD
```

Replace `YOUR_KEYSTORE_PASSWORD` and `YOUR_KEY_PASSWORD` with the passwords you chose in Step 1.

**IMPORTANT**: This file is gitignored and should NEVER be committed to version control.

## Step 3: Build the Release AAB

Run the following command to build a signed release AAB:

```bash
npm run android:release
```

This will:
1. Build your web assets with Vite
2. Sync them to the Android project with Capacitor
3. Build a signed release AAB using Gradle

The AAB file will be located at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Step 4: Complete Advertising ID Declaration in Play Console

Before uploading, you need to complete the advertising ID declaration:

1. Log into Google Play Console
2. Select your app
3. Go to **App content** in the left sidebar
4. Find **Advertising ID** section
5. Complete the declaration form:
   - If your app doesn't use advertising: Select "No, my app doesn't use advertising ID"
   - If your app uses advertising: Select "Yes" and provide required information

The AndroidManifest.xml has been configured with the `AD_ID` permission to satisfy Android 13+ requirements.

## Step 5: Upload to Internal Testing Track

1. Go to Google Play Console
2. Navigate to **Testing** → **Internal testing** in the left sidebar
3. Click **Create new release**
4. Upload the AAB file from `android/app/build/outputs/bundle/release/app-release.aab`
5. Add release notes describing what testers should focus on
6. Give the release a descriptive name (e.g., "Internal Test v1.0.0")
7. Click **Save** then **Review release**
8. Click **Start rollout to Internal testing**

## Step 6: Add Testers

1. In **Testing** → **Internal testing**, click on the **Testers** tab
2. Create an email list or use an existing Google Group
3. Add tester email addresses
4. Save your changes

## Step 7: Share Test Link with Testers

1. Copy the opt-in URL from the Internal testing page
2. Send this link to your testers
3. Testers need to:
   - Click the opt-in link
   - Accept the invitation
   - Download the app from Google Play Store

## Troubleshooting

### Build Fails with Signing Error

- Verify your `keystore.properties` file has the correct values
- Check that the keystore file exists at `android/release-key.keystore`
- Ensure passwords are correct

### "This release does not add or remove any app bundles" Error

- This means you need to increment the version code
- Edit `android/app/build.gradle`
- Increase `versionCode` (e.g., from 1 to 2)
- Rebuild the AAB

### Advertising ID Warning in Play Console

- Complete the Advertising ID declaration in Play Console
- Go to App content → Advertising ID
- Fill out the form based on your app's advertising usage

## Version Incrementing

Before each new release, update the version in `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2  // Increment this for each release
    versionName "1.0.1"  // Update semantic version
}
```

## Security Best Practices

- Never commit `keystore.properties` or `.keystore` files
- Store keystore and passwords in a secure password manager
- Back up your keystore file to a secure location
- Share keystore access only with authorized team members
- Consider using Google Play App Signing for additional security

## Additional Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [Sign Your App](https://developer.android.com/studio/publish/app-signing)
