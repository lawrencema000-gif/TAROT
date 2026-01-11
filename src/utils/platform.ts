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
