// Per-patform hints for connection issues

export type Platform = {
  secureContext: boolean;
  /** iPhone or iPad, where every browser is WebKit */
  ios: boolean;
  /** Desktop Linux, where Web Bluetooth sits behind a flag and BlueZ */
  linux: boolean;
  chromium: boolean;
  brave: boolean;
};

const LINUX_FLAG = 'chrome://flags/#enable-experimental-web-platform-features';
const BRAVE_FLAG = 'brave://flags/#brave-web-bluetooth-api';

const getBluetoothUnavailableReason = ({ secureContext, ios, linux, chromium, brave }: Platform): string => {
  if (!secureContext) {
    return 'Open this page over https:// or http://localhost.';
  }
  if (ios) {
    return 'iPhone and iPad browsers have no Web Bluetooth. Open this page in the free Bluefy browser.';
  }
  if (!chromium) {
    return 'This browser has no Web Bluetooth. Use Chrome, Edge or Brave.';
  }
  if (brave) {
    return linux
      ? `Enable ${BRAVE_FLAG} and ${LINUX_FLAG}, then relaunch Brave.`
      : `Enable ${BRAVE_FLAG}, then relaunch Brave.`;
  }
  if (linux) {
    return `Enable ${LINUX_FLAG}, then relaunch the browser.`;
  }
  return 'Check that Bluetooth is not blocked for this site.';
};

export function bluetoothUnavailableHint(platform: Platform): string {
  const reason = getBluetoothUnavailableReason(platform);
  return `Web Bluetooth unavailable. ${reason}`;
}

export function adapterNotFoundHint({ ios, linux }: Platform): string {
  if (linux) {
    return 'No Bluetooth adapter available. Start BlueZ (sudo systemctl enable --now bluetooth) and unblock the adapter (rfkill unblock bluetooth), then connect.';
  }
  if (ios) {
    // Bluefy can't tell the two apart: getAvailability() is false for both
    return 'No Bluetooth adapter available. Turn Bluetooth on, and allow it for this browser in Settings > Privacy & Security > Bluetooth, then connect.';
  }
  return 'No Bluetooth adapter available. Turn Bluetooth on, then connect.';
}

export function writeErrorHint({ linux }: Platform): string | null {
  return linux
    ? "If every write fails right after connecting, BlueZ's midi plugin holds the mixer: run bluetoothd with -P midi. Don't pair the mixer."
    : null;
}
