import { afterEach, beforeEach, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BluetoothTransport, TRANSPORT_STATUS, type TransportStatus } from './transport.ts';
import { domError, withFakeBluetoothIt } from '../testing/bluetooth.ts';
import { advance } from '../testing/async.ts';

const outOfRange = (): Promise<never> =>
  Promise.reject(domError('NetworkError', 'Bluetooth Device is no longer in range.'));

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
    assert.match(errors[0] ?? '', /write failed - NetworkError: Authentication canceled\./);
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
    withFakeBluetoothIt('rejects with a hint, never connecting, without Web Bluetooth', async ({ removeApi }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      removeApi();

      await assert.rejects(transport.connect(), /Web Bluetooth unavailable/);
      assert.deepEqual(seen, []);
    });

    withFakeBluetoothIt('rejects with a hint, never connecting, without an adapter', async ({ turnAdapterOff }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      turnAdapterOff();

      await assert.rejects(transport.connect(), /No Bluetooth adapter available/);
      assert.deepEqual(seen, []);
    });

    withFakeBluetoothIt('remembers the connected device for the next auto-connect', async ({ storage }) => {
      await transport.connect();
      assert.equal(storage.getItem('zoom-l20-control.lastDeviceId'), 'fake-l20');
    });

    withFakeBluetoothIt('resolves quietly and disconnected when the chooser is dismissed', async ({ failChooser }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      failChooser(domError('NotFoundError', 'User cancelled the requestDevice() chooser.'));

      await transport.connect();
      assert.equal(seen.at(-1), TRANSPORT_STATUS.DISCONNECTED);
    });

    for (const reason of [2, '2']) {
      withFakeBluetoothIt(
        `resolves quietly and disconnected when Bluefy's chooser is dismissed (${typeof reason})`,
        async ({ failChooser }) => {
          const seen: TransportStatus[] = [];
          transport.onStatus((status) => seen.push(status));
          failChooser(reason);

          await transport.connect();
          assert.equal(seen.at(-1), TRANSPORT_STATUS.DISCONNECTED);
        },
      );
    }

    withFakeBluetoothIt("rejects on Bluefy's dismissal code when it comes from GATT", async ({ gatt }) => {
      const reason: unknown = 2;
      gatt.connect = async () => {
        throw reason;
      };

      await assert.rejects(transport.connect(), (error) => error === 2);
    });

    withFakeBluetoothIt('rejects with the setup hint when the chooser finds nothing', async ({ failChooser }) => {
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

    withFakeBluetoothIt('ignores a failure when another attempt already connected', async ({ failChooser }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      await transport.connect();
      failChooser(domError('NetworkError', 'Connection already in progress'));

      await transport.connect();
      assert.equal(seen.at(-1), TRANSPORT_STATUS.CONNECTED);
    });
  });

  describe('autoConnect()', () => {
    beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'] }));
    afterEach(() => mock.timers.reset());

    withFakeBluetoothIt('reconnects to the remembered device first', async ({ device, knownDevices, storage }) => {
      knownDevices.unshift({ ...device, id: 'other-l20' });
      storage.setItem('zoom-l20-control.lastDeviceId', 'fake-l20');

      assert.equal(await transport.autoConnect(), true);
      assert.equal(storage.getItem('zoom-l20-control.lastDeviceId'), 'fake-l20');
    });

    withFakeBluetoothIt('falls back to a device named like an L-20', async ({ device, knownDevices, storage }) => {
      knownDevices.unshift({ ...device, id: 'headphones', name: 'Headphones' });

      assert.equal(await transport.autoConnect(), true);
      assert.equal(storage.getItem('zoom-l20-control.lastDeviceId'), 'fake-l20');
    });

    withFakeBluetoothIt('returns false, never connecting, with no known L-20', async ({ knownDevices }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      knownDevices.length = 0;

      assert.equal(await transport.autoConnect(), false);
      assert.deepEqual(seen, []);
    });

    withFakeBluetoothIt('retries a failed connect until it succeeds', async ({ gatt }) => {
      const connect = gatt.connect;
      let attempts = 0;
      gatt.connect = () => (++attempts < 3 ? outOfRange() : connect());

      const connected = transport.autoConnect();
      await advance(1000);

      assert.equal(await connected, true);
      assert.equal(attempts, 3);
    });

    withFakeBluetoothIt('connects on the next advertisement after the retries run out', async ({ gatt, advertise }) => {
      const connect = gatt.connect;
      gatt.connect = outOfRange;

      const connected = transport.autoConnect();
      await advance(4000);
      gatt.connect = connect;
      advertise();

      assert.equal(await connected, true);
    });

    withFakeBluetoothIt('gives up, disconnected, when no advertisement comes', async ({ gatt }) => {
      const seen: TransportStatus[] = [];
      transport.onStatus((status) => seen.push(status));
      gatt.connect = outOfRange;

      const connected = transport.autoConnect();
      await advance(20000); // 3 s of retries, ending in a 400 ms pause, then 15 s of waiting

      assert.equal(await connected, false);
      assert.deepEqual(seen, [TRANSPORT_STATUS.CONNECTING, TRANSPORT_STATUS.DISCONNECTED]);
    });

    withFakeBluetoothIt('gives up after the retries when the browser cannot watch advertisements', async (fake) => {
      delete fake.device.watchAdvertisements;
      fake.gatt.connect = outOfRange;

      const connected = transport.autoConnect();
      await advance(4000);

      assert.equal(await connected, false);
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
