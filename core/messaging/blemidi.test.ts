import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BleMidiDecoder, encodeShortMessage, encodeSysEx, type MidiMessage } from './blemidi.ts';

const assertMessage = (message: MidiMessage | undefined, value: number[]) => {
  assert.ok(message, 'should decode');
  assert.deepEqual([...message.bytes], value);
};

describe('BLE-MIDI', () => {
  describe('BleMidiDecoder', () => {
    it('decodes a real CC packet', () => {
      const decoder = new BleMidiDecoder();
      const [message, ...additionalMessages] = decoder.decodePacket(Uint8Array.from([0x80, 0x80, 0xb0, 0x3c, 0x41]));
      assertMessage(message, [0xb0, 0x3c, 0x41]);
      assert.equal(message.type, 'midi');
      assert.equal(additionalMessages.length, 0);
    });
  });

  describe('encodeShortMessage()', () => {
    it('round-trips through the decoder', () => {
      const packet = encodeShortMessage({ status: 0xb5, d1: 0x57, d2: 0x02 });
      const [message] = new BleMidiDecoder().decodePacket(packet);
      assertMessage(message, [0xb5, 0x57, 0x02]);
    });
  });

  describe('encodeSysEx()', () => {
    it('round-trips a single-packet SysEx through the decoder', () => {
      const sysEx = [0xf0, 0x52, 0x00, 0x00, 0x2b, 0xf7];
      const decoder = new BleMidiDecoder();
      const message = encodeSysEx(sysEx)
        .flatMap((packet) => decoder.decodePacket(packet))
        .find(({ type }) => type === 'sysex');
      assertMessage(message, sysEx);
    });

    it('round-trips a multi-packet SysEx through the decoder', () => {
      const long = [0xf0, 0x52, 0x00, 0x00, 0x2a, ...Array(60).fill(0x11), 0xf7];
      const packets = encodeSysEx(long);
      assert.ok(packets.length > 1, 'should split across packets');

      const decoder = new BleMidiDecoder();
      const message = encodeSysEx(long)
        .flatMap((packet) => decoder.decodePacket(packet))
        .find(({ type }) => type === 'sysex');
      assertMessage(message, long);
    });
  });
});
