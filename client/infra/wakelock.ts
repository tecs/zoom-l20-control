// Keep the display awake during a session

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
    this.sentinel = (await navigator.wakeLock?.request('screen').catch(() => {})) ?? null;
  }

  async release(): Promise<void> {
    await this.sentinel?.release().catch(() => {});
    this.sentinel = null;
  }
}
