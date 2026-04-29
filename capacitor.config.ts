import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcana.app',
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
      iosClientId: '804690093810-1p3mklfai9ejlbk7dr87od51qf7in56d.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SignInWithApple: {
      // Sign in with Apple is REQUIRED by App Store guidelines if any other
      // social login (e.g. Google) is offered. Capacitor's SignInWithApple
      // plugin handles the native auth UI; we forward the credential to
      // Supabase via supabase.auth.signInWithIdToken({ provider: 'apple' }).
      // Web fallback on iOS Safari uses the OAuth web flow instead.
      clientId: 'com.arcana.app',
      redirectURI: 'https://ulzlthhkqjuohzjangcq.supabase.co/auth/v1/callback',
      scopes: 'email name',
      state: 'state',
    },
  },
};

export default config;
