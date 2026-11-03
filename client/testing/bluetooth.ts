import { it } from 'node:test';

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
  connect(): Promise<{
    getPrimaryService(): Promise<{
      getCharacteristic(): Promise<FakeCharacteristic>;
    }>;
  }>;
  disconnect(): void;
};

type FakeDevice = {
  id: string;
  gatt: FakeGatt;
  addEventListener(type: string, listener: () => void): void;
};

export type FakeBluetooth = {
  characteristic: FakeCharacteristic;
  device: FakeDevice;
  gatt: FakeGatt;
  /** Makes the device chooser reject with `error` (dismissed, nothing found, ...) */
  failChooser: (error: Error) => void;
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
  const device: FakeDevice = {
    id: 'fake-l20',
    gatt,
    addEventListener: (type, listener) => {
      if (type === 'gattserverdisconnected') {
        disconnectListeners.push(listener);
      }
    },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  const bluetooth = {
    requestDevice: async (): Promise<FakeDevice> => device,
    getAvailability: async () => true,
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: { bluetooth },
    configurable: true,
    writable: true,
  });

  return {
    characteristic,
    device,
    gatt,
    failChooser: (error) => {
      bluetooth.requestDevice = async () => {
        throw error;
      };
    },
    restore() {
      if (original) {
        Object.defineProperty(globalThis, 'navigator', original);
      } else {
        delete (globalThis as { navigator?: unknown }).navigator;
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
