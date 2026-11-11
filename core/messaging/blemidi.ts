// Pure BLE-MIDI framing (MIDI-over-Bluetooth-LE 1.0)

import { dataLength, isStatus, STATUS_BIT, SYSEX_END, SYSEX_START, type ShortMessage } from '../protocol/midi.ts';

// Standard GATT identifiers
export const BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
export const BLE_MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

export type MidiMessage = { type: 'midi' | 'sysex'; bytes: Uint8Array };

const TIMESTAMP_LOW_BITS = 7;
const TIMESTAMP_HIGH_MASK = 0x3f;
const TIMESTAMP_LOW_MASK = 0x7f;

const headerByte = (ts: number): number => STATUS_BIT | ((ts >> TIMESTAMP_LOW_BITS) & TIMESTAMP_HIGH_MASK);
const timestampByte = (ts: number): number => STATUS_BIT | (ts & TIMESTAMP_LOW_MASK);

/** A SysEx spanning packets, tracked by the header byte of its latest packet */
type OpenSysex = { header: number; bytes: number[] };

const MAX_OPEN_SYSEX = 2;

const headerTicks = (from: number, to: number): number => (to - from) & TIMESTAMP_HIGH_MASK;

export class BleMidiDecoder {
  private header = 0;
  private bytes: number[] = [];
  private openSysex: OpenSysex[] = [];

  decodePacket(packet: Uint8Array): MidiMessage[] {
    const [header = 0, ...bytes] = packet;
    this.header = header;
    this.bytes = bytes;
    const messages: MidiMessage[] = [];

    // A continuation of an open SysEx
    const [first, second] = this.bytes;
    const sysex = this.continuedSysex();
    if (sysex && first !== undefined && (!isStatus(first) || second === SYSEX_END)) {
      const message = this.consumeSysex(sysex);
      if (message) {
        messages.push(message);
      }
    }

    while (this.bytes.length > 0) {
      const message = this.consumeMessage();
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  /** The open SysEx this packet continues */
  private continuedSysex(): OpenSysex | undefined {
    let closest: OpenSysex | undefined;
    for (const sysex of this.openSysex) {
      if (!closest || headerTicks(sysex.header, this.header) <= headerTicks(closest.header, this.header)) {
        closest = sysex;
      }
    }
    return closest;
  }

  private consumeMessage(): MidiMessage | null {
    // Every message starts with a timestamp byte
    const timestamp = this.bytes.shift();
    if (timestamp === undefined || !isStatus(timestamp)) {
      return null;
    }

    // Discard stray data bytes
    while (this.bytes[0] !== undefined && !isStatus(this.bytes[0])) {
      this.bytes.shift();
    }

    if (this.bytes.length === 0) {
      return null;
    }

    // End of a SysEx that didn't start
    if (this.bytes[0] === SYSEX_END) {
      this.bytes.shift();
      return null;
    }

    if (this.bytes[0] === SYSEX_START) {
      const sysex: OpenSysex = { header: this.header, bytes: [] };
      this.openSysex.push(sysex);
      if (this.openSysex.length > MAX_OPEN_SYSEX) {
        this.openSysex.shift();
      }
      return this.consumeSysex(sysex);
    }
    return this.consumeShortMessage();
  }

  private consumeSysex(sysex: OpenSysex): MidiMessage | null {
    sysex.header = this.header;
    while (this.bytes.length > 0) {
      const byte = this.bytes.shift() as number;

      if (byte === SYSEX_END) {
        this.openSysex = this.openSysex.filter((open) => open !== sysex);
        return { type: 'sysex', bytes: Uint8Array.from(sysex.bytes.concat(byte)) };
      }

      if (!isStatus(byte) || (byte === SYSEX_START && sysex.bytes.length === 0)) {
        sysex.bytes.push(byte);
      }
    }

    return null;
  }

  private consumeShortMessage(): MidiMessage {
    const status = this.bytes.shift() as number;
    const bytes = [status, ...this.bytes.splice(0, dataLength(status))];
    return { type: 'midi', bytes: Uint8Array.from(bytes) };
  }
}

/** Encode a 3-byte channel message as a BLE-MIDI packet. Timestamp is advisory (the mixer ignores it). */
export const encodeShortMessage = ({ status, d1, d2 }: ShortMessage, ts = 0) =>
  Uint8Array.from([headerByte(ts), timestampByte(ts), status, d1, d2]);

/** Encode a SysEx byte array into one or more BLE-MIDI packets */
export function encodeSysEx(sysex: number[], maxPacket = 20, ts = 0): Uint8Array[] {
  const header = headerByte(ts);
  const tsByte = timestampByte(ts);
  const packets: Uint8Array[] = [];

  const bytes = sysex.slice();
  while (bytes.length > 0) {
    const packet = [header];
    if (bytes.length === sysex.length) {
      packet.push(tsByte);
    }

    while (bytes.length && packet.length < maxPacket) {
      const byte = bytes.shift() as number;
      if (byte === SYSEX_END) {
        // Need room for tsByte + F7
        if (packet.length <= maxPacket - 2) {
          packet.push(tsByte, byte);
        } else {
          // Span another packet
          bytes.unshift(byte);
        }
        break;
      }
      packet.push(byte);
    }

    packets.push(Uint8Array.from(packet));
  }
  return packets;
}
