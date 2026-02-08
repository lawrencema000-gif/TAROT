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
  },
};

export default config;
