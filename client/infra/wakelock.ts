// Keep the display awake during a session

import { screenWakeLock } from './browser.ts';

export interface Lock {
  acquire(): Promise<void>;
  release(): Promise<void>;
}

export class WakeLock implements Lock {
  private sentinel: WakeLockSentinel | null = null;

  constructor() {
    // Browsers release the lock when the tab is hidden - re-acquire on focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.sentinel) {
        void this.acquire();
      }
    });
  }

  async acquire(): Promise<void> {
    const wakeLock = screenWakeLock();
    this.sentinel = wakeLock ? await wakeLock.request('screen').catch(() => null) : null;
  }

  async release(): Promise<void> {
    await this.sentinel?.release().catch(() => {});
    this.sentinel = null;
  }
}
