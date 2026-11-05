import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BleMidiDecoder, encodeShortMessage, encodeSysEx, type MidiMessage } from './blemidi.ts';
import { ccsInsideMeterFrame, interleavedMeterFrames, orphanedMeterFrameStart } from '../fixtures/packets.ts';

const header = [0xf0, 0x52, 0x00, 0x00, 0x2a];

function assertMessage(message: MidiMessage | undefined, value: number[]): asserts message is MidiMessage {
  assert.ok(message, 'should decode');
  assert.deepEqual([...message.bytes], value);
}

describe('BLE-MIDI', () => {
  describe('BleMidiDecoder', () => {
    it('decodes a real CC packet', () => {
      const decoder = new BleMidiDecoder();
      const [message, ...additionalMessages] = decoder.decodePacket(Uint8Array.from([0x80, 0x80, 0xb0, 0x3c, 0x41]));
      assertMessage(message, [0xb0, 0x3c, 0x41]);
      assert.equal(message.type, 'midi');
      assert.equal(additionalMessages.length, 0);
    });

    it('decodes packets of other messages that arrive inside a SysEx, and keeps the SysEx', () => {
      const decoder = new BleMidiDecoder();
      const messages = ccsInsideMeterFrame.flatMap((packet) => decoder.decodePacket(packet));
      assert.deepEqual(
        messages.filter(({ type }) => type === 'midi').map(({ bytes }) => [...bytes]),
        [
          [0xbe, 0x4e, 0x00],
          [0xbf, 0x4e, 0x06],
          [0xbe, 0x4e, 0x00],
          [0xbf, 0x4e, 0x04],
        ],
      );
      assert.deepEqual(
        messages.filter(({ type }) => type === 'sysex').map(({ bytes }) => bytes.length),
        [58],
      );
    });

    it('drops both SysEx when one starts before the other ends, and resyncs after', () => {
      const decoder = new BleMidiDecoder();
      const decode = (packets: Uint8Array[]) => packets.flatMap((packet) => decoder.decodePacket(packet));

      assert.deepEqual(decode(orphanedMeterFrameStart), []);
      assert.deepEqual(
        decode(interleavedMeterFrames).map(({ type, bytes }) => [type, ...bytes]),
        [
          ['midi', 0xb6, 0x4e, 0x00],
          ['midi', 0xb7, 0x4e, 0x64],
          ['midi', 0xb6, 0x4e, 0x00],
          ['midi', 0xb7, 0x4e, 0x64],
        ],
      );
      assert.deepEqual(
        decode(ccsInsideMeterFrame)
          .filter(({ type }) => type === 'sysex')
          .map(({ bytes }) => bytes.length),
        [58],
      );
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
      const long = [0xf0, 0x52, 0x00, 0x00, 0x2a, ...new Array<number>(60).fill(0x11), 0xf7];
      const packets = encodeSysEx(long);
      assert.ok(packets.length > 1, 'should split across packets');

      const decoder = new BleMidiDecoder();
      const message = encodeSysEx(long)
        .flatMap((packet) => decoder.decodePacket(packet))
        .find(({ type }) => type === 'sysex');
      assertMessage(message, long);
    });

    it('keeps the closing F7 in the packet when its timestamp still fits', () => {
      const sysEx = [...header, ...new Array<number>(11).fill(0x11), 0xf7];
      const packets = encodeSysEx(sysEx).map((packet) => [...packet]);
      assert.deepEqual(packets, [[0x80, 0x80, ...sysEx.slice(0, -1), 0x80, 0xf7]]);
      assert.equal(packets[0]?.length, 20);
    });

    it('moves the closing F7 to a packet of its own when its timestamp does not fit', () => {
      const sysEx = [...header, ...new Array<number>(12).fill(0x11), 0xf7];
      const packets = encodeSysEx(sysEx).map((packet) => [...packet]);
      assert.deepEqual(packets, [
        [0x80, 0x80, ...sysEx.slice(0, -1)],
        [0x80, 0x80, 0xf7],
      ]);

      const decoder = new BleMidiDecoder();
      const message = encodeSysEx(sysEx)
        .flatMap((packet) => decoder.decodePacket(packet))
        .find(({ type }) => type === 'sysex');
      assertMessage(message, sysEx);
    });
  });
});
