import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from './session.ts';
import { Store } from '../../core/state/store.ts';
import { MeterStore } from '../../core/state/meters.ts';
import { SceneState } from '../../core/state/scenes.ts';
import { TransportState } from '../../core/state/transport.ts';
import { Log } from '../../core/state/log.ts';
import { P } from '../../core/protocol/registry.ts';
import { HANDSHAKE, DUMP_REQUEST, meterSelect } from '../../core/protocol/session.ts';
import { BASELINE } from '../../core/fixtures/dumps.ts';
import type { MidiMessage } from '../../core/messaging/blemidi.ts';
import type { ShortMessage } from '../../core/protocol/midi.ts';
import {
  TRANSPORT_STATUS,
  type ErrorHandler,
  type MessageHandler,
  type StatusHandler,
  type TransportStatus,
} from '../infra/transport.ts';

function setup() {
  let messageHandler: MessageHandler = null;
  let statusHandler: StatusHandler = null;
  let errorHandler: ErrorHandler = null;

  const sent: ShortMessage[] = [];
  const sysex: number[][] = [];

  const transport = {
    sent,
    sysex,
    connect: mock.fn(async (): Promise<void> => {}),
    autoConnect: mock.fn(async (): Promise<boolean> => true),
    disconnect: mock.fn((): void => {}),
    sendMessage: async (message: ShortMessage): Promise<void> => void sent.push(message),
    sendSysEx: async (bytes: number[]): Promise<void> => void sysex.push(bytes),
    onMessage: (handler: MessageHandler) => void (messageHandler = handler),
    onStatus: (handler: StatusHandler) => void (statusHandler = handler),
    onError: (handler: ErrorHandler) => void (errorHandler = handler),
    receive: (message: MidiMessage) => messageHandler?.(message),
    fail: (message: string) => errorHandler?.(message),
    setStatus: (status: TransportStatus) => statusHandler?.(status),
  };

  const wakeLock = {
    acquire: mock.fn(async (): Promise<void> => {}),
    release: mock.fn(async (): Promise<void> => {}),
  };

  const log = new Log();
  const store = new Store();
  const meters = new MeterStore();
  const sceneState = new SceneState();
  const transportState = new TransportState();
  const session = new Session({ transport, wakeLock, log, store, meters, sceneState, transportState });

  return { session, transport, wakeLock, log, store, meters, sceneState, transportState };
}

const midi = (status: number, d1: number, d2: number): MidiMessage => ({
  type: 'midi',
  bytes: Uint8Array.of(status, d1, d2),
});
const sysex = (...bytes: number[]): MidiMessage => ({ type: 'sysex', bytes: Uint8Array.from(bytes) });
const meterFrame = (mix: number): MidiMessage =>
  sysex(0xf0, 0x52, 0x00, 0x00, 0x31, 0x04, mix, ...Array(50).fill(0), 0xf7);

// The connect handshake awaits each send - let those promises settle
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('Session', () => {
  describe('outbound', () => {
    it('sends what the store dispatches', () => {
      const { transport, store } = setup();
      store.dispatch(P.strip(0).send(0), 100);
      assert.deepEqual(transport.sent, [{ status: 0xb0, d1: 0x3c, d2: 100 }]);
    });
  });

  describe('selectMix()', () => {
    it('points the meter stream at the mix', () => {
      const { session, transport } = setup();
      session.selectMix(3);
      assert.equal(session.mix, 3);
      assert.deepEqual(transport.sent, [meterSelect(3)]);
    });
  });

  describe('inbound', () => {
    it('applies a CC from the desk to the store', () => {
      const { transport, store } = setup();
      transport.receive(midi(0xb0, 0x3c, 90));
      assert.equal(store.get('strips.0.sends.0'), 90);
    });

    it('routes the SCENE ON echo to the scene state', () => {
      const { transport, sceneState } = setup();
      transport.receive(midi(0xb8, 0x56, 0x01));
      assert.equal(sceneState.on, true);
    });

    it('routes transport reports to the transport state', () => {
      const { transport, transportState } = setup();
      transport.receive(midi(0xb8, 0x57, 0x01)); // play
      assert.equal(transportState.state, 1);
    });

    it('loads a state dump into the store', { skip: !BASELINE }, () => {
      const { transport, store } = setup();
      transport.receive({ type: 'sysex', bytes: BASELINE! });
      assert.equal(store.get('fx.1.tone'), 50);
    });

    it('keeps only meter frames for the selected mix', () => {
      const { session, transport, meters } = setup();
      session.selectMix(2);
      transport.receive(meterFrame(0));
      assert.equal(meters.get(), null);
      transport.receive(meterFrame(2));
      assert.equal(meters.get()?.mix, 2);
    });

    it('re-reads the state after a scene recall', () => {
      const { transport } = setup();
      transport.receive(sysex(0xf0, 0x52, 0x00, 0x00, 0x08, 0x00, 0x01, 0xf7));
      assert.deepEqual(transport.sysex, [DUMP_REQUEST]);
    });

    it('marks the active scene', () => {
      const { transport, sceneState } = setup();
      transport.receive(sysex(0xf0, 0x52, 0x00, 0x00, 0x32, 0x00, 0x01, 0x03, 0xf7));
      assert.equal(sceneState.active, 3);
    });

    it('ignores SysEx it has no handler for, apart from a debug line', () => {
      const { transport, log } = setup();
      transport.receive(sysex(0xf0, 0x52, 0x00, 0x00, 0x7f, 0xf7));
      transport.receive(sysex(0xf0, 0x7e, 0x00, 0x06, 0x02, 0xf7)); // not Zoom
      assert.deepEqual(log.entries('info'), []);
      assert.equal(log.entries('debug').length, 2);
    });
  });

  describe('connection', () => {
    it('runs the handshake on connect, then re-selects the mix', async () => {
      const { session, transport, wakeLock } = setup();
      session.selectMix(3);
      transport.sent.length = 0;
      const seen: TransportStatus[] = [];
      session.subscribe((status) => seen.push(status));

      transport.setStatus(TRANSPORT_STATUS.CONNECTED);
      await flush();

      assert.equal(session.status, TRANSPORT_STATUS.CONNECTED);
      assert.deepEqual(seen, [TRANSPORT_STATUS.CONNECTED]);
      assert.equal(wakeLock.acquire.mock.callCount(), 1);
      assert.deepEqual(transport.sysex, HANDSHAKE);
      assert.deepEqual(transport.sent, [meterSelect(3)]);
    });

    it('releases the wake lock on disconnect', () => {
      const { session, transport, wakeLock } = setup();
      transport.setStatus(TRANSPORT_STATUS.DISCONNECTED);
      assert.equal(session.status, TRANSPORT_STATUS.DISCONNECTED);
      assert.equal(wakeLock.release.mock.callCount(), 1);
    });

    it('logs transport write errors at error level', () => {
      const { transport, log } = setup();
      transport.fail('write failed - NetworkError');
      assert.deepEqual(
        log.entries('error').map(({ text, kind }) => [text, kind]),
        [['write failed - NetworkError', 'status']],
      );
    });
  });

  describe('toggleConnection()', () => {
    it('connects when disconnected and disconnects when connected', async () => {
      const { session, transport } = setup();
      session.toggleConnection();
      assert.equal(transport.connect.mock.callCount(), 1);

      transport.setStatus(TRANSPORT_STATUS.CONNECTED);
      await flush();
      session.toggleConnection();
      assert.equal(transport.disconnect.mock.callCount(), 1);
    });

    it('logs a connect failure at error level', async () => {
      const { session, transport, log } = setup();
      transport.connect.mock.mockImplementationOnce(async () => {
        throw new Error('Bluetooth adapter not available.');
      });
      session.toggleConnection();
      await flush();
      assert.deepEqual(
        log.entries('error').map(({ text }) => text),
        ['connect failed: Bluetooth adapter not available.'],
      );
    });
  });

  describe('reread()', () => {
    it('warns when not connected, otherwise requests the dump', async () => {
      const { session, transport, log } = setup();
      session.reread();
      assert.equal(log.entries('warn').at(-1)?.text, 're-read: not connected');
      assert.deepEqual(transport.sysex, []);

      transport.setStatus(TRANSPORT_STATUS.CONNECTED);
      await flush();
      transport.sysex.length = 0;
      session.reread();
      assert.deepEqual(transport.sysex, [DUMP_REQUEST]);
    });
  });

  describe('debug log', () => {
    it('logs RX and TX decoded, with the log kind of the field', () => {
      const { transport, store, log } = setup();
      transport.receive(midi(0xb0, 0x3c, 90));
      store.dispatch(P.strip(0).mute, true);
      assert.deepEqual(
        log.entries().map(({ text, kind }) => [text, kind]),
        [
          ['RX  b0 3c 5a  -> strips.0.sends.0 = 90', 'fader'],
          ['TX  b0 30 01  -> strips.0.mute = true', 'mute'],
        ],
      );
    });

    it('logs unknown SysEx, cut after 12 bytes', () => {
      const { transport, log } = setup();
      transport.receive(sysex(0xf0, 0x52, 0x00, 0x00, 0x7f, ...Array(10).fill(0x11), 0xf7));
      assert.equal(log.entries().at(-1)?.text, 'RX  sysex f0 52 00 00 7f 11 11 11 11 11 11 11 ...');
    });
  });
});
