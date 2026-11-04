// Link between the transport and the core state

import { Publisher } from '../../lib/publisher.ts';
import { HANDSHAKE, DUMP_REQUEST, meterSelect } from '../../core/protocol/session.ts';
import { scenePress, isSceneOnEcho } from '../../core/protocol/scenes.ts';
import { parseTransport } from '../../core/protocol/transport.ts';
import { calibrationReadout } from '../../core/protocol/meta.ts';
import { decodeMeterFrame } from '../../core/messaging/meters.ts';
import { decodeCC, type Pair, type DecodeResult } from '../../core/messaging/codec.ts';
import type { Store } from '../../core/state/store.ts';
import type { MeterStore } from '../../core/state/meters.ts';
import type { SceneState } from '../../core/state/scenes.ts';
import type { TransportState } from '../../core/state/transport.ts';
import { logKindForPath, type Log } from '../../core/state/log.ts';
import { hex } from '../../core/format.ts';
import type { ShortMessage } from '../../core/protocol/midi.ts';
import type { MidiMessage } from '../../core/messaging/blemidi.ts';
import { TRANSPORT_STATUS, type Transport, type TransportStatus } from '../infra/transport.ts';
import type { Lock } from '../infra/wakelock.ts';

export interface SessionDependencies {
  transport: Transport;
  wakeLock: Lock;
  log: Log;
  store: Store;
  meters: MeterStore;
  sceneState: SceneState;
  transportState: TransportState;
}

export class Session extends Publisher<[status: TransportStatus]> {
  private transport: Transport;
  private log: Log;
  private wakeLock: Lock;
  private store: Store;
  private meters: MeterStore;
  private sceneState: SceneState;
  private transportState: TransportState;

  private currentStatus: TransportStatus = TRANSPORT_STATUS.DISCONNECTED;
  private selectedMix = 0;
  /** 14-bit reassembly for TX logging */
  private txPair: Pair = {};

  constructor({ transport, wakeLock, log, store, meters, sceneState, transportState }: SessionDependencies) {
    super();
    this.transport = transport;
    this.wakeLock = wakeLock;
    this.log = log;
    this.store = store;
    this.meters = meters;
    this.sceneState = sceneState;
    this.transportState = transportState;

    this.store.onSend = (messages) => this.onSend(messages);
    this.transport.onMessage((message) => this.onMessage(message));
    this.transport.onStatus((status) => void this.onStatus(status));
    this.transport.onError((message) => this.log.error(message, 'status'));
  }

  get status(): TransportStatus {
    return this.currentStatus;
  }

  get mix(): number {
    return this.selectedMix;
  }

  selectMix(mix: number): void {
    this.selectedMix = mix;
    void this.transport.sendMessage(meterSelect(mix));
  }

  /** Reconnects to the last mixer, without the chooser */
  autoConnect(): void {
    void this.transport.autoConnect();
  }

  toggleConnection(): void {
    if (this.currentStatus === TRANSPORT_STATUS.CONNECTED) {
      this.transport.disconnect();
      return;
    }

    this.transport.connect().catch(({ message }) => this.log.error(`connect failed: ${message}`, 'status'));
  }

  reread(): void {
    if (this.currentStatus !== TRANSPORT_STATUS.CONNECTED) {
      this.log.warn('re-read: not connected', 'status');
      return;
    }
    void this.transport.sendSysEx(DUMP_REQUEST);
    this.log.info('re-read state requested', 'status');
  }

  pressScene(index: number): Promise<void> {
    return this.transport.sendMessage(scenePress(index));
  }

  send(message: ShortMessage): void {
    void this.transport.sendMessage(message);
  }

  private onSend(messages: ShortMessage[]): void {
    for (const message of messages) {
      void this.transport.sendMessage(message);
    }

    // Decode our own outbound bytes back to a readable path/value
    let last: DecodeResult | null = null;
    for (const message of messages) {
      // 14-bit fields span two msgs
      last = decodeCC(message, this.txPair) ?? last;
    }
    const bytes = messages.map(({ status, d1, d2 }) => hex([status, d1, d2])).join('  ');
    this.log.debug(
      `TX  ${bytes}${last ? `  -> ${last.path} = ${last.value}` : ''}`,
      last ? logKindForPath(last.path) : 'misc',
    );
  }

  private onMessage({ bytes, type }: MidiMessage): void {
    switch (type) {
      case 'midi':
        return this.handleMidi(bytes);
      case 'sysex':
        return this.handleSysex(bytes);
    }
  }

  private async onStatus(status: TransportStatus): Promise<void> {
    this.currentStatus = status;
    this.emit(status);
    this.log.info(`* ${status}`, 'status');

    if (status === TRANSPORT_STATUS.CONNECTED) {
      for (const sysEx of HANDSHAKE) {
        await this.transport.sendSysEx(sysEx);
      }
      this.selectMix(this.selectedMix);
      return this.wakeLock.acquire();
    }

    if (status === TRANSPORT_STATUS.DISCONNECTED) {
      return this.wakeLock.release();
    }
  }

  private handleMidi(bytes: Uint8Array): void {
    const [status = 0, d1 = 0, d2 = 0] = bytes;
    const message: ShortMessage = { status, d1, d2 };
    if (isSceneOnEcho(message)) {
      return this.sceneState.setOn(message.d2 !== 0);
    }

    const transportMessage = parseTransport(message);
    if (transportMessage) {
      return this.transportState.apply(transportMessage);
    }

    const result = this.store.applyMessage(message);
    this.log.debug(
      `RX  ${hex(bytes)}${result ? `  -> ${result.path} = ${result.value}` : '  (unmapped)'}`,
      result ? logKindForPath(result.path) : 'misc',
    );
  }

  private handleSysex(bytes: Uint8Array): void {
    if (bytes[1] !== 0x52) {
      return this.unhandledSysex(bytes);
    }

    const [, , , , command] = bytes;

    if (command === 0x2a) {
      return this.loadDump(bytes);
    }
    if (command === 0x31) {
      return this.updateMeters(bytes);
    }
    if (command === 0x08 && bytes[5] === 0x00) {
      return void this.transport.sendSysEx(DUMP_REQUEST);
    }
    if (command === 0x32) {
      return this.sceneState.setActive(bytes[7] ?? null);
    }

    this.unhandledSysex(bytes);
  }

  private loadDump(dump: Uint8Array) {
    this.store.loadDump(dump);
    this.log.debug(`dump(${dump.length}) ${hex(dump)}`, 'sysex');

    const readout = calibrationReadout(this.store);
    for (const { family, unit, samples } of readout) {
      this.log.debug(`calib ${family}${unit ? ` [${unit}]` : ''}: ${samples.map(({ raw }) => raw).join(' ')}`, 'sysex');
    }
  }

  private updateMeters(bytes: Uint8Array) {
    const frame = decodeMeterFrame(bytes);
    if (frame?.mix === this.selectedMix) {
      this.meters.update(frame);
    }
  }

  private unhandledSysex(bytes: Uint8Array) {
    this.log.debug(`RX  sysex ${hex(bytes, 12)}${bytes.length > 12 ? ' ...' : ''}`, 'sysex');
  }
}
