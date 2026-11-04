// Web Bluetooth transport

import {
  BLE_MIDI_SERVICE_UUID,
  BLE_MIDI_CHARACTERISTIC_UUID,
  BleMidiDecoder,
  encodeShortMessage,
  encodeSysEx,
  type MidiMessage,
} from '../../core/messaging/blemidi.ts';
import type { ShortMessage } from '../../core/protocol/midi.ts';
import { sleep } from './timers.ts';
import { bluetooth, watchAdvertisements } from './browser.ts';
import { Coalescer } from '../../lib/coalescer.ts';
import { describeError } from '../../lib/errors.ts';

const DEVICE_NAME_PREFIX = 'L-20';
const LAST_DEVICE_KEY = 'zoom-l20-control.lastDeviceId';
const WRITE_ERROR_WINDOW_MS = 1000; // collapse a burst of identical write failures into one log

export const TRANSPORT_STATUS = {
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  DISCONNECTED: 'DISCONNECTED',
} as const;

export type TransportStatus = keyof typeof TRANSPORT_STATUS;

export type ErrorHandler = ((message: string) => void) | null;
export type MessageHandler = ((message: MidiMessage) => void) | null;
export type StatusHandler = ((status: TransportStatus) => void) | null;

export interface Transport {
  onError(handler: ErrorHandler): void;
  onMessage(handler: MessageHandler): void;
  onStatus(handler: StatusHandler): void;
  connect(): Promise<void>;
  autoConnect(): Promise<boolean>;
  disconnect(): void;
  sendMessage(message: ShortMessage): Promise<void>;
  sendSysEx(bytes: number[]): Promise<void>;
}

const HINT_BLUETOOTH_NOT_AVAILABLE = 'Web Bluetooth unavailable.';
const HINT_ADAPTER_NOT_FOUND = 'No Bluetooth adapter available. Turn Bluetooth on, then retry.';
const HINT_DEVICE_NOT_FOUND =
  'Check if Bluetooth is on, the mixer is powered with the BTA-1 seated, and no other device is already connected to it.';

// Bluefy rejects a dismissed chooser with a `2`...
const isBluefyDismissal = (error: unknown): boolean => String(error) === '2';
const CHOOSER_DISMISSED = new Error('chooser dismissed');

export class BluetoothTransport implements Transport {
  private errorHandler: ErrorHandler = null;
  private messageHandler: MessageHandler = null;
  private statusHandler: StatusHandler = null;
  private status: TransportStatus = TRANSPORT_STATUS.DISCONNECTED;

  private device: BluetoothDevice | null = null;
  private decoder: BleMidiDecoder | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private listened = new WeakSet<BluetoothDevice>();

  private writeErrors = new Coalescer<string>(WRITE_ERROR_WINDOW_MS, (message, repeats) =>
    this.errorHandler?.(`write failed - ${message} ${repeats > 0 ? `(repeated ${repeats} more times)` : ''}`),
  );

  // Not a method as it needs to be passed by value for referential equality while having `this` bound to the instance
  private readonly valueListener = (event: Event): void => this.onValue(event);

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  onStatus(handler: StatusHandler) {
    this.statusHandler = handler;
  }

  /** Manual connect via UI chooser (needs a user gesture) */
  async connect(): Promise<void> {
    // Wrong browser, insecure context or the API is switched off
    const webBluetooth = bluetooth();
    if (!webBluetooth) {
      this.setStatus(TRANSPORT_STATUS.DISCONNECTED);
      throw new Error(HINT_BLUETOOTH_NOT_AVAILABLE);
    }

    const adapterAvailable = await webBluetooth.getAvailability?.();
    if (!adapterAvailable) {
      this.setStatus(TRANSPORT_STATUS.DISCONNECTED);
      throw new Error(HINT_ADAPTER_NOT_FOUND);
    }

    this.setStatus(TRANSPORT_STATUS.CONNECTING);
    try {
      const device = await webBluetooth
        .requestDevice({
          filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
          optionalServices: [BLE_MIDI_SERVICE_UUID],
        })
        .catch((error: unknown) => {
          throw isBluefyDismissal(error) ? CHOOSER_DISMISSED : error;
        });
      await this.attach(device);
    } catch (error) {
      // Another attempt managed to connect first, ignore the error
      if (this.characteristic) {
        this.setStatus(TRANSPORT_STATUS.CONNECTED);
        return;
      }
      this.setStatus(TRANSPORT_STATUS.DISCONNECTED);

      if (error === CHOOSER_DISMISSED) {
        return;
      }
      if (error instanceof Error && error.name === 'NotFoundError') {
        // A dismissed chooser
        if (/cancel/i.test(error.message)) {
          return;
        }
        // Chooser found nothing or Bluetooth is off
        throw new Error(`${error.message} - ${HINT_DEVICE_NOT_FOUND}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Silent reconnect to a previously-connected device.
   * Needs Chrome flags:
   * - #enable-web-bluetooth-new-permissions-backend (getDevices persistence)
   * - #enable-experimental-web-platform-features (watchAdvertisements)
   */
  async autoConnect(): Promise<boolean> {
    const webBluetooth = bluetooth();
    if (!webBluetooth?.getDevices) {
      return false;
    }

    const devices = await webBluetooth.getDevices().catch(() => []);
    let lastId: string | null = null;
    try {
      lastId = localStorage.getItem(LAST_DEVICE_KEY);
    } catch {}

    const device =
      devices.find(({ id }) => id === lastId) ?? devices.find(({ name }) => name?.startsWith(DEVICE_NAME_PREFIX));
    if (!device) {
      return false;
    }

    this.setStatus(TRANSPORT_STATUS.CONNECTING);

    const connected = (await this.directConnect(device, 3000)) || (await this.passiveConnect(device, 15000));
    if (!connected && !this.characteristic) {
      this.setStatus(TRANSPORT_STATUS.DISCONNECTED);
    }
    return connected;
  }

  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.characteristic = null;
    this.writeErrors.flush();
    this.setStatus(TRANSPORT_STATUS.DISCONNECTED);
  }

  async sendMessage(message: ShortMessage): Promise<void> {
    await this.write(encodeShortMessage(message));
  }

  async sendSysEx(bytes: number[]): Promise<void> {
    for (const packet of encodeSysEx(bytes)) {
      const success = await this.write(packet);
      if (!success) {
        return;
      }
    }
  }

  private reportWriteError(error: unknown): void {
    this.writeErrors.push(describeError(error));
    if (error instanceof Error && error.name === 'NetworkError') {
      this.disconnect();
    }
  }

  private onValue({ target }: Event): void {
    const characteristic = target as BluetoothRemoteGATTCharacteristic;
    const dataView = characteristic.value;
    if (!dataView || !this.decoder) {
      return;
    }
    const packet = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    for (const message of this.decoder.decodePacket(packet)) {
      this.messageHandler?.(message);
    }
  }

  private setStatus(status: TransportStatus): void {
    if (status === this.status) {
      return;
    }
    this.status = status;
    this.statusHandler?.(status);
  }

  private async write(packet: Uint8Array): Promise<boolean> {
    if (!this.characteristic) {
      return false;
    }

    try {
      await this.characteristic.writeValueWithoutResponse(packet as BufferSource);
      return true;
    } catch (error) {
      this.reportWriteError(error);
      return false;
    }
  }

  private async attach(device: BluetoothDevice): Promise<void> {
    // already attached
    if (this.characteristic && this.device === device && device.gatt?.connected) {
      return;
    }

    this.device = device;
    try {
      localStorage.setItem(LAST_DEVICE_KEY, device.id);
    } catch {}

    if (!this.listened.has(device)) {
      this.listened.add(device);
      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        this.setStatus(TRANSPORT_STATUS.DISCONNECTED);
      });
    }

    if (!device.gatt) {
      throw new Error('device has no GATT server');
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC_UUID);
    this.decoder = new BleMidiDecoder();
    this.characteristic.addEventListener('characteristicvaluechanged', this.valueListener);
    await this.characteristic.startNotifications();
    this.setStatus(TRANSPORT_STATUS.CONNECTED);
  }

  private async directConnect(device: BluetoothDevice, timeout: number): Promise<boolean> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (this.characteristic) {
        return true;
      }
      try {
        await this.attach(device);
        return true;
      } catch {}
      await sleep(400);
    }

    return !!this.characteristic;
  }

  private async passiveConnect(device: BluetoothDevice, timeout: number): Promise<boolean> {
    const watch = watchAdvertisements(device);
    if (!watch) {
      return false;
    }

    const abortController = new AbortController();
    const { promise, resolve } = Promise.withResolvers<boolean>();

    const onAdvertisement = (): void => {
      device.removeEventListener('advertisementreceived', onAdvertisement);
      abortController.abort();

      // already connected
      if (this.characteristic) {
        return resolve(true);
      }

      this.attach(device).then(
        () => resolve(true),
        () => resolve(false),
      );
    };

    device.addEventListener('advertisementreceived', onAdvertisement);
    try {
      await watch({ signal: abortController.signal });
    } catch {
      device.removeEventListener('advertisementreceived', onAdvertisement);
      return false;
    }

    const timer = setTimeout(() => {
      device.removeEventListener('advertisementreceived', onAdvertisement);
      abortController.abort();
      resolve(false);
    }, timeout);
    const ok = await promise;
    clearTimeout(timer);

    return ok;
  }
}
