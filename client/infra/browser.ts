import type { Platform } from './hints.ts';

export const isDesktopLinux = (): boolean => {
  const { userAgent } = navigator;
  return /Linux/.test(userAgent) && !/Android/.test(userAgent);
};

export const platform = (): Platform => {
  const { userAgent, maxTouchPoints } = navigator;
  return {
    secureContext: globalThis.isSecureContext,
    // iPadOS reports itself as a Mac
    ios: /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1),
    linux: isDesktopLinux(),
    chromium: /Chrome\/|Chromium\//.test(userAgent),
    brave: 'brave' in navigator,
  };
};

// Type-hardened features the DOM declares as present, though a browser may lack

export const bluetooth = (): WithOptional<Bluetooth, 'getAvailability' | 'getDevices'> | undefined =>
  navigator.bluetooth;

export const watchAdvertisements = (
  device: BluetoothDevice,
): ((options?: WatchAdvertisementsOptions) => Promise<void>) | undefined =>
  (device as WithOptional<BluetoothDevice, 'watchAdvertisements'>).watchAdvertisements?.bind(device);

export const screenWakeLock = (): WakeLock | undefined => navigator.wakeLock;
