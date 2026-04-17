import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcana.app',
  appName: 'Arcana',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
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
      // The Android SDK matches the app by package name + SHA-1 automatically
      clientId: '804690093810-kb7q1v06or3dffgk0a0nv6vnr1lnc70o.apps.googleusercontent.com',
      iosClientId: '804690093810-1p3mklfai9ejlbk7dr87od51qf7in56d.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
