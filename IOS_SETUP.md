# iOS setup checklist for Arcana

The codebase is iOS-ready. Everything below is **what you need to do on
Apple's side + dashboards** to actually ship the iOS app.

Cross-references:
- Code is platform-aware via `isIOS()` / `isAndroid()` everywhere — no
  Android risk from any of the steps below.
- Same Supabase project, same GitHub repo, same RevenueCat project
  (proj9bfda005). iOS is a third build target alongside Android + web.
- Premium purchased on iOS unlocks Android (and vice versa) automatically
  via RevenueCat.

## Prerequisites

- [ ] Apple Developer Program enrollment ($99/year) — https://developer.apple.com/programs
- [ ] Mac with Xcode 15+ (or use Codemagic/Ionic Appflow if no Mac)

## Apple Developer (developer.apple.com)

- [ ] **Identifiers → App IDs** → register Bundle ID `com.arcana.app`
  - Capabilities: Sign in with Apple, In-App Purchase, Push Notifications, Associated Domains
- [ ] **Identifiers → Services IDs** → create Service ID for Sign in with Apple
  - Identifier suggestion: `com.arcana.app.signinwithapple`
  - Configure return URL: `https://ulzlthhkqjuohzjangcq.supabase.co/auth/v1/callback`
- [ ] **Keys** → create Sign in with Apple key
  - Download the `.p8` file (you can only download it once!)
  - Note the Key ID + Team ID
- [ ] **Keys** → (optional) APNs auth key for push notifications
  - Download `.p8` file
  - Note the Key ID + Team ID
- [ ] **Certificates** → create iOS Distribution certificate (.p12)
- [ ] **Profiles** → create App Store provisioning profile for `com.arcana.app`

## App Store Connect (appstoreconnect.apple.com)

- [ ] **My Apps → +** → create new iOS app
  - Bundle ID: `com.arcana.app`
  - SKU: `arcana-ios`
  - Primary language: English (US)
- [ ] Fill in the app listing (description, keywords, screenshots, privacy URL, support URL)
- [ ] **App Privacy** → declare data collection per the Supabase + Sentry + AdMob usage
- [ ] **In-App Purchases** → create subscriptions:
  - `com.arcana.app.premium.monthly` — Auto-Renewable Subscription, $3.99/month
  - `com.arcana.app.premium.yearly` — Auto-Renewable Subscription, $19.99/year, **Introductory offer: 3-day free trial for new subscribers**
  - `com.arcana.app.premium.lifetime` — Non-Consumable IAP, $29.99
- [ ] **In-App Purchases** → create consumables for credit packs:
  - `com.arcana.app.credits.starter` — Consumable, $0.99, 33 credits
  - `com.arcana.app.credits.standard` — Consumable, $4.99, 333 credits
  - `com.arcana.app.credits.value` — Consumable, $6.99, 777 credits
- [ ] **Users and Access → Keys** → create App Store Connect API key
  - Role: App Manager
  - Download `.p8`, note Key ID + Issuer ID

## RevenueCat (already have project proj9bfda005)

- [ ] **Apps → + Add app** → choose App Store
  - Bundle ID: `com.arcana.app`
- [ ] Generate **App-specific API key** (will start with `appl_`)
  - Save this — it goes into `VITE_REVENUECAT_API_KEY_IOS` secret
- [ ] **Products** → for each iOS subscription/IAP created in ASC, click "Import from App Store" and link to the same RC product as the Android counterpart so they share entitlements
- [ ] **Entitlements → premium** → ensure both Android + iOS subscriptions are attached
- [ ] (When credit packs ship) create entitlements `credits_starter`, `credits_standard`, `credits_value` and attach the iOS consumables

## AdMob (admob.google.com)

- [ ] **Apps → Add app** → iOS app for `com.arcana.app`
- [ ] Note the **App ID** (format `ca-app-pub-9489106590476826~XXXXXXXXXX`)
- [ ] Create 4 ad units:
  - Banner
  - Interstitial
  - Rewarded
  - App Open
- [ ] Note each unit ID — they go into the `VITE_ADMOB_*_IOS` secrets

## Supabase (already configured for Android, just add Apple provider)

- [ ] **Authentication → Providers → Apple** → Enable
  - Client ID: `com.arcana.app` (the Service ID)
  - Team ID: from Apple Developer
  - Key ID: from Apple Developer
  - Private Key: paste the contents of the `.p8` file you downloaded
- [ ] **Authentication → URL Configuration** → Redirect URLs already include `com.arcana.app://**` ✅

## GitHub secrets

Add these at https://github.com/lawrencema000-gif/TAROT/settings/secrets/actions:

| Secret | Value |
|---|---|
| `VITE_REVENUECAT_API_KEY_IOS` | `appl_...` from RevenueCat |
| `VITE_ADMOB_BANNER_IOS` | iOS banner ad unit ID |
| `VITE_ADMOB_INTERSTITIAL_IOS` | iOS interstitial ad unit ID |
| `VITE_ADMOB_REWARDED_IOS` | iOS rewarded ad unit ID |
| `VITE_ADMOB_APPOPEN_IOS` | iOS app-open ad unit ID |
| `APPLE_ID` | Your Apple Developer email |
| `APPLE_TEAM_ID` | 10-char Team ID from Apple Developer |
| `APPLE_APP_STORE_CONNECT_API_KEY_ID` | ASC API Key ID |
| `APPLE_APP_STORE_CONNECT_API_KEY_ISSUER_ID` | ASC API Issuer ID (UUID) |
| `APPLE_APP_STORE_CONNECT_API_KEY_P8` | Full contents of `AuthKey_*.p8` |
| `IOS_DIST_CERT_P12` | base64-encoded distribution `.p12` certificate |
| `IOS_DIST_CERT_PASSWORD` | password used when exporting `.p12` |
| `IOS_PROVISIONING_PROFILE` | base64-encoded `.mobileprovision` file |
| `IOS_KEYCHAIN_PASSWORD` | random password for the temporary keychain |

To base64-encode binary files: `base64 -i AuthKey_X.p8 | pbcopy`
(Mac) or `base64 -w 0 file.p12 | clip` (Linux/Windows).

## Bootstrap the iOS Xcode project (Mac only)

```bash
git pull origin main
npm install
npx cap add ios            # creates ios/ folder with Xcode project
npx cap sync ios           # syncs web bundle into iOS project
cd ios/App
pod install                # installs CocoaPods deps (capacitor plugins)
open App.xcworkspace       # opens Xcode
```

In Xcode:
- [ ] **Signing & Capabilities** → select your Apple Developer team
- [ ] Add **Sign in with Apple** capability
- [ ] Add **Push Notifications** capability (if using APNs)
- [ ] Add **In-App Purchase** capability
- [ ] **Info** tab → set `GADApplicationIdentifier` (AdMob iOS App ID)
- [ ] **Info** tab → set version + build number to match `VITE_APP_VERSION`
- [ ] Test once on a simulator (`Cmd+R`)
- [ ] Archive (`Product → Archive`) and upload to TestFlight via Organizer, OR run the GitHub Action `iOS build + TestFlight` once secrets are set

## fastlane (optional, for CI)

The `.github/workflows/ios.yml` uses fastlane. Setup once on Mac:

```bash
cd ios/App
bundle init && echo "gem 'fastlane'" >> Gemfile
bundle install
bundle exec fastlane init
```

Add lanes to `ios/App/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build + upload to TestFlight"
  lane :beta do
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_API_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_API_KEY_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY_P8"],
      is_key_content_base64: false,
    )
    build_app(scheme: "App", export_method: "app-store")
    upload_to_testflight(api_key: api_key, skip_waiting_for_build_processing: true)
  end

  desc "Archive only (smoke test)"
  lane :build_only do
    build_app(scheme: "App", export_method: "app-store", skip_archive: false)
  end
end
```

Commit `Gemfile`, `Gemfile.lock`, and `fastlane/` to git — `.gitignore`
already excludes runtime build artifacts.

## Verification checklist

After everything's wired:

- [ ] Sign in with Apple on TestFlight build → user lands on the home screen
- [ ] Subscribe to monthly on iOS → premium unlocks instantly + RC dashboard shows the purchase
- [ ] Cancel auto-renew in App Store settings → premium **stays active** until period ends (CANCELLATION fix verified)
- [ ] Wait for period to end → app shows "Your Premium subscription has ended" toast on next session
- [ ] Sign in to the same account on Android → premium recognized (cross-platform sync)
- [ ] AdMob banner / interstitial / rewarded / app-open all serve test ads on simulator with `initializeForTesting: true`
- [ ] Sentry receives a test crash from iOS device
