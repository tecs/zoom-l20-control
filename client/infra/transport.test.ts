import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BluetoothTransport, TRANSPORT_STATUS, type TransportStatus } from './transport.ts';

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

type FakeBluetooth = {
  characteristic: FakeCharacteristic;
  device: FakeDevice;
  gatt: FakeGatt;
  restore(): void;
};

// DOMException.name is what the transport branches on
const domError = (name: string, message: string): Error => Object.assign(new Error(message), { name });

// Minimal navigator.bluetooth stand-in
const mockBluetooth = (): FakeBluetooth => {
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

  Object.defineProperty(globalThis, 'navigator', {
    value: {
      bluetooth: {
        requestDevice: async () => device,
        getAvailability: async () => true,
      },
    },
    configurable: true,
    writable: true,
  });

  return {
    characteristic,
    device,
    gatt,
    restore() {
      if (original) {
        Object.defineProperty(globalThis, 'navigator', original);
      } else {
        delete (globalThis as { navigator?: unknown }).navigator;
      }
    },
  };
};

const withFakeBluetoothIt = (name: string, run: (bluetooth: FakeBluetooth) => Promise<void>) =>
  it(name, async () => {
    const bluetooth = mockBluetooth();
    return run(bluetooth).finally(bluetooth.restore);
  });

describe('BluetoothTransport', () => {
  let transport: BluetoothTransport;

  beforeEach(() => void (transport = new BluetoothTransport()));
  afterEach(() => transport.disconnect());

  withFakeBluetoothIt('reports nothing after a successful write', async ({ characteristic }) => {
    const errors: string[] = [];

    transport.onError((message) => errors.push(message));

    await transport.connect();
    await transport.sendMessage({ status: 0xb0, d1: 0x3c, d2: 100 });
    assert.equal(characteristic.writes, 1);
    assert.deepEqual(errors, []);
  });

  withFakeBluetoothIt('reports a failed write instead of throwing', async ({ characteristic }) => {
    const errors: string[] = [];

    transport.onError((message) => errors.push(message));

    await transport.connect();

    characteristic.fail = () => domError('NetworkError', 'Authentication canceled.');

    await transport.sendMessage({ status: 0xb0, d1: 0x3c, d2: 100 });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /write failed - NetworkError: Authentication canceled\./);
  });

  withFakeBluetoothIt('settles the status to disconnected on a NetworkError', async ({ characteristic }) => {
    const seen: TransportStatus[] = [];

    transport.onStatus((status) => seen.push(status));

    await transport.connect();
    assert.equal(seen.at(-1), TRANSPORT_STATUS.CONNECTED);

    characteristic.fail = () => domError('NetworkError', 'Authentication canceled.');
    await transport.sendMessage({ status: 0xb0, d1: 0x3c, d2: 100 });
    assert.equal(seen.at(-1), TRANSPORT_STATUS.DISCONNECTED);
  });

  withFakeBluetoothIt('collapses a burst of identical failures into one report', async ({ characteristic }) => {
    const errors: string[] = [];

    transport.onError((message) => errors.push(message));

    await transport.connect();

    characteristic.fail = () => domError('NetworkError', 'Authentication canceled.');

    for (let i = 0; i < 60; i++) {
      await transport.sendMessage({ status: 0xb0, d1: 0x3c, d2: i });
    }
    assert.equal(errors.length, 1);
  });

  withFakeBluetoothIt('abandons the rest of a multi-packet SysEx after a failure', async ({ characteristic }) => {
    await transport.connect();

    characteristic.fail = () => domError('NetworkError', 'Authentication canceled.');

    await transport.sendSysEx([0xf0, 0x52, 0x00, 0x00, 0x2a, 0xf7]);
    assert.equal(characteristic.writes, 1);
  });

  describe('onMessage()', () => {
    withFakeBluetoothIt('delivers the messages decoded from incoming packets', async ({ characteristic }) => {
      const received: number[][] = [];
      transport.onMessage(({ bytes }) => received.push([...bytes]));
      await transport.connect();

      characteristic.notify([0x80, 0x80, 0xb0, 0x3c, 0x41]);
      assert.deepEqual(received, [[0xb0, 0x3c, 0x41]]);
    });

    withFakeBluetoothIt('delivers each message once after a reconnect', async ({ characteristic }) => {
      const received: number[][] = [];
      transport.onMessage(({ bytes }) => received.push([...bytes]));
      await transport.connect();
      transport.disconnect();
      await transport.connect();

      characteristic.notify([0x80, 0x80, 0xb0, 0x3c, 0x41]);
      assert.deepEqual(received, [[0xb0, 0x3c, 0x41]]);
    });
  });

  describe('disconnect()', () => {
    withFakeBluetoothIt('reports the disconnect once', async () => {
      const seen: TransportStatus[] = [];
      await transport.connect();
      transport.onStatus((status) => seen.push(status));

      transport.disconnect();
      assert.deepEqual(seen, [TRANSPORT_STATUS.DISCONNECTED]);
    });
  });

  describe('connect()', () => {
    const failChooser = (error: Error): void => {
      (navigator.bluetooth as unknown as { requestDevice(): Promise<never> }).requestDevice = async () => {
        throw error;
      };
    };

    withFakeBluetoothIt('resolves quietly and disconnected when the chooser is dismissed', async () => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      failChooser(domError('NotFoundError', 'User cancelled the requestDevice() chooser.'));

      await transport.connect();
      assert.equal(seen.at(-1), TRANSPORT_STATUS.DISCONNECTED);
    });

    withFakeBluetoothIt('rejects with the setup hint when the chooser finds nothing', async () => {
      const original = domError('NotFoundError', 'Bluetooth adapter not available.');
      failChooser(original);

      await assert.rejects(transport.connect(), (error: Error) => {
        assert.equal(error.cause, original);
        assert.match(error.message, /^Bluetooth adapter not available\. - /);
        return true;
      });
    });

    withFakeBluetoothIt('rejects on a GATT failure, even when its message says "canceled"', async ({ gatt }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      gatt.connect = async () => {
        throw domError('NetworkError', 'Authentication canceled.');
      };

      await assert.rejects(transport.connect(), /Authentication canceled/);
      assert.equal(seen.at(-1), TRANSPORT_STATUS.DISCONNECTED);
    });

    withFakeBluetoothIt('ignores a failure when another attempt already connected', async () => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      await transport.connect();
      failChooser(domError('NetworkError', 'Connection already in progress'));

      await transport.connect();
      assert.equal(seen.at(-1), TRANSPORT_STATUS.CONNECTED);
    });
  });

  withFakeBluetoothIt('reports a non-NetworkError but leaves the status alone', async ({ characteristic }) => {
    const errors: string[] = [];
    const seen: TransportStatus[] = [];

    transport.onError((message) => errors.push(message));
    transport.onStatus((status) => seen.push(status));

    await transport.connect();

    characteristic.fail = () => domError('NotSupportedError', 'GATT operation not permitted.');

    await transport.sendMessage({ status: 0xb0, d1: 0x3c, d2: 100 });
    assert.equal(errors.length, 1);
    assert.equal(seen.at(-1), TRANSPORT_STATUS.CONNECTED);
  });
});
