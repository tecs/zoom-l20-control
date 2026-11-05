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

export class BleMidiDecoder {
  private bytes: number[] = [];
  private sysexBuffer: number[] = [];
  private discarding = false;

  decodePacket(packet: Uint8Array): MidiMessage[] {
    // Drop the header byte
    this.bytes = Array.from(packet.subarray(1));
    const messages: MidiMessage[] = [];

    // SysEx can span multiple packets - continue parsing if buffer has data
    const [first, second] = this.bytes;
    if (this.sysexOpen() && first !== undefined && (!isStatus(first) || second === SYSEX_END)) {
      const message = this.consumeSysex();
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

  private sysexOpen(): boolean {
    return this.sysexBuffer.length > 0 || this.discarding;
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
      // A SysEx starting while another is open
      if (this.sysexOpen()) {
        this.sysexBuffer = [];
        this.discarding = true;
      }
      return this.consumeSysex();
    }
    return this.consumeShortMessage();
  }

  private consumeSysex(): MidiMessage | null {
    while (this.bytes.length > 0) {
      const byte = this.bytes.shift() as number;

      if (byte === SYSEX_END) {
        const bytes = Uint8Array.from(this.sysexBuffer.concat(byte));
        this.sysexBuffer = [];
        if (this.discarding) {
          this.discarding = false;
          return null;
        }
        return { type: 'sysex', bytes };
      }

      if (this.discarding) {
        continue;
      }

      if (!isStatus(byte) || (byte === SYSEX_START && this.sysexBuffer.length === 0)) {
        this.sysexBuffer.push(byte);
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
