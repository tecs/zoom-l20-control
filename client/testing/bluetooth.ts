import { it } from 'node:test';
import { createMockStorage } from './storage.ts';

type FakeCharacteristic = {
  writes: number;
  fail: null | (() => Error);
  writeValueWithoutResponse(packet: BufferSource): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  startNotifications(): Promise<void>;
  notify(packet: number[]): void;
  value?: DataView;
};

type FakeGatt = {
  connected: boolean;
  connect: () => Promise<{
    getPrimaryService(): Promise<{
      getCharacteristic(): Promise<FakeCharacteristic>;
    }>;
  }>;
  disconnect(): void;
};

type FakeDevice = {
  id: string;
  name: string;
  gatt: FakeGatt;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  watchAdvertisements?: () => Promise<void>;
};

export type FakeBluetooth = {
  characteristic: FakeCharacteristic;
  device: FakeDevice;
  gatt: FakeGatt;
  storage: ReturnType<typeof createMockStorage>;
  knownDevices: FakeDevice[];
  /** Fires `advertisementreceived` on the device (it came into range) */
  advertise: () => void;
  /** Makes the device chooser reject with `error` (dismissed, nothing found, ...) */
  failChooser: (error: unknown) => void;
  /** Removes `navigator.bluetooth` (wrong browser, insecure context, API switched off) */
  removeApi: () => void;
  /** Makes `getAvailability()` report no adapter (Bluetooth off or missing) */
  turnAdapterOff: () => void;
  restore(): void;
};

export const domError = (name: string, message: string): Error => Object.assign(new Error(message), { name });

export const mockBluetooth = (): FakeBluetooth => {
  const valueListeners: ((event: Event) => void)[] = [];
  const characteristic: FakeCharacteristic = {
    writes: 0,
    fail: null,
    async writeValueWithoutResponse() {
      this.writes++;
      if (this.fail) {
        throw this.fail();
      }
    },
    addEventListener(type, listener) {
      if (type === 'characteristicvaluechanged' && !valueListeners.includes(listener)) {
        valueListeners.push(listener);
      }
    },
    async startNotifications() {},
    notify(packet) {
      this.value = new DataView(Uint8Array.from(packet).buffer);
      valueListeners.forEach((listener) => listener.call(this, { target: this } as unknown as Event));
    },
  };
  const gatt: FakeGatt = {
    connected: true,
    connect: async () => ({
      getPrimaryService: async () => ({
        getCharacteristic: async () => characteristic,
      }),
    }),
    disconnect: () => {
      gatt.connected = false;
      disconnectListeners.forEach((listener) => listener());
    },
  };
  const disconnectListeners: (() => void)[] = [];
  const advertisementListeners = new Set<() => void>();
  const device: FakeDevice = {
    id: 'fake-l20',
    name: 'L-20',
    gatt,
    addEventListener: (type, listener) => {
      if (type === 'gattserverdisconnected') {
        disconnectListeners.push(listener);
      }
      if (type === 'advertisementreceived') {
        advertisementListeners.add(listener);
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'advertisementreceived') {
        advertisementListeners.delete(listener);
      }
    },
    watchAdvertisements: async () => {},
  };
  const knownDevices = [device];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = createMockStorage();

  const bluetooth = {
    requestDevice: async (): Promise<FakeDevice> => device,
    getAvailability: async () => true,
    getDevices: async () => knownDevices,
  };

  const fakeNavigator: { bluetooth?: typeof bluetooth } = { bluetooth };

  Object.defineProperty(globalThis, 'navigator', {
    value: fakeNavigator,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });

  return {
    characteristic,
    device,
    gatt,
    storage,
    knownDevices,
    advertise: () => [...advertisementListeners].forEach((listener) => listener()),
    failChooser: (error) => {
      bluetooth.requestDevice = async () => {
        throw error;
      };
    },
    removeApi: () => {
      delete fakeNavigator.bluetooth;
    },
    turnAdapterOff: () => {
      bluetooth.getAvailability = async () => false;
    },
    restore() {
      if (original) {
        Object.defineProperty(globalThis, 'navigator', original);
      } else {
        delete (globalThis as { navigator?: unknown }).navigator;
      }
      if (originalStorage) {
        Object.defineProperty(globalThis, 'localStorage', originalStorage);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    },
  };
};

/** `it()` with a fresh fake `navigator.bluetooth` */
export const withFakeBluetoothIt = (name: string, run: (bluetooth: FakeBluetooth) => Promise<void>): void => {
  it(name, async () => {
    const bluetooth = mockBluetooth();
    return run(bluetooth).finally(() => bluetooth.restore());
  });
};
