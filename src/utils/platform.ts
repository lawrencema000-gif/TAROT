import { Capacitor } from '@capacitor/core';

export type Platform = 'android' | 'ios' | 'web';

export function getPlatform(): Platform {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() as Platform;
  }
  return 'web';
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}

/**
 * Google Play's billing policy requires Play Store IAP for digital content
 * consumed in the app. Hide every third-party card-payment CTA on native.
 * iOS follows the same rule under App Store guidelines.
 *
 * Web (PWA / browser) keeps Stripe direct-pay as a legitimate channel.
 */
export function canPayWithCard(): boolean {
  return !isNative();
}
