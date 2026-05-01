import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // iOS Bundle ID is com.arcanatarotapp (set at `npx cap add ios` time).
  // Android applicationId stays com.arcana.app (hardcoded in
  // android/app/build.gradle, not affected by this value at runtime).
  // Kept different across platforms intentionally — iOS App Store has a
  // separate namespace from Google Play; Apple did not have com.arcana.app
  // available so Lawrence registered com.arcanatarotapp on his Apple Team.
  // RevenueCat handles the cross-platform mapping via product attachments.
  appId: 'com.arcanatarotapp',
  appName: 'Arcana',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      'appleid.apple.com',
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a0a0f',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB',
    },
  },
  ios: {
    // iOS-specific settings. Bundle ID + signing handled in Xcode after
    // `npx cap add ios` is run on a Mac. The values here only affect the
    // runtime (background color, scheme, content inset, etc.).
    backgroundColor: '#0a0a0f',
    contentInset: 'always',
    // Allow the WebView to handle universal links / external schemes
    // (Sign in with Apple opens appleid.apple.com via system browser).
    handleApplicationNotifications: false,
    // Disable swipe-back gesture so users don't accidentally exit the
    // SPA when swiping inside in-app horizontal carousels.
    overrideUserInterfaceStyle: 'dark',
    scheme: 'Arcana',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a0a0f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    AdMob: {
      // Android AdMob app ID — leave as-is for Android builds.
      // iOS AdMob app ID is set in Info.plist after `npx cap add ios`
      // (key: GADApplicationIdentifier). Capacitor's AdMob plugin reads
      // the platform-appropriate ID at runtime.
      appId: 'ca-app-pub-9489106590476826~4064386281',
      initializeForTesting: false,
      testingDevices: [],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: 'G',
    },
    GoogleAuth: {
      scopes: ['email', 'profile'],
      // MUST be the Web Application OAuth Client ID — Android uses this for requestIdToken()
      // The Android SDK matches the app by package name + SHA-1 automatically.
      clientId: '804690093810-kb7q1v06or3dffgk0a0nv6vnr1lnc70o.apps.googleusercontent.com',
      // iOS Client ID — registered with Bundle ID com.arcanatarotapp in
      // Google Cloud Console → Credentials → OAuth 2.0 Client IDs (iOS).
      // The previous value ending in -1p3mklfai... was actually an
      // Android upload-key cert, mis-pasted into the iOS slot — Google
      // returned 400 invalid_request when GIDSignIn tried to use it
      // because the registration didn't match a real iOS client.
      iosClientId: '804690093810-j8vf4jphqt036lus8niqr6qhmrk5rk5q.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SignInWithApple: {
      // Sign in with Apple is REQUIRED by App Store guidelines if any other
      // social login (e.g. Google) is offered. Capacitor's SignInWithApple
      // plugin handles the native auth UI; we forward the credential to
      // Supabase via supabase.auth.signInWithIdToken({ provider: 'apple' }).
      // Web fallback on iOS Safari uses the OAuth web flow instead.
      //
      // clientId here is the Apple **Services ID** (used for the OAuth web
      // flow that Supabase invokes). The native iOS sign-in path uses the
      // app's Bundle ID (com.arcanatarotapp), which the plugin auto-detects
      // from the iOS project. Both com.arcanatarotapp and the Services ID
      // below are registered in Supabase Auth → Providers → Apple → Client IDs.
      clientId: 'com.arcanatarotapp.signinwithapple',
      redirectURI: 'https://ulzlthhkqjuohzjangcq.supabase.co/auth/v1/callback',
      scopes: 'email name',
      state: 'state',
    },
  },
};

export default config;
