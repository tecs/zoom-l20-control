import { afterEach, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BluetoothTransport, TRANSPORT_STATUS, type TransportStatus } from './transport.ts';
import { domError, withFakeBluetoothIt } from '../testing/bluetooth.ts';

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
