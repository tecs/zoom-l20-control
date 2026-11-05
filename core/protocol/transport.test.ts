import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TRANSPORT_BTN, transportHold, parseTransport } from './transport.ts';

describe('Transport', () => {
  describe('parseTransport()', () => {
    it('classifies transport state / overdub / mode', () => {
      assert.deepEqual(parseTransport({ status: 0xb8, d1: 0x57, d2: 0x05 }), { kind: 'state', value: 5 });
      assert.deepEqual(parseTransport({ status: 0xbe, d1: 0x57, d2: 0x01 }), { kind: 'overdub', value: true });
      assert.deepEqual(parseTransport({ status: 0xbf, d1: 0x57, d2: 0x02 }), { kind: 'mode', value: 2 });
    });

    it('classifies the HHH:MM:SS playhead bytes', () => {
      assert.deepEqual(parseTransport({ status: 0xb8, d1: 0x58, d2: 0 }), { kind: 'playhead', field: 'hHi', value: 0 });
      assert.deepEqual(parseTransport({ status: 0xb9, d1: 0x58, d2: 0 }), { kind: 'playhead', field: 'hLo', value: 0 });
      assert.deepEqual(parseTransport({ status: 0xba, d1: 0x58, d2: 5 }), { kind: 'playhead', field: 'm', value: 5 });
      assert.deepEqual(parseTransport({ status: 0xbb, d1: 0x58, d2: 59 }), { kind: 'playhead', field: 's', value: 59 });
    });

    it('ignores tempo (0x58 ch2/ch3), leaving it to the field codec', () => {
      assert.equal(parseTransport({ status: 0xb2, d1: 0x58, d2: 6 }), null);
      assert.equal(parseTransport({ status: 0xb3, d1: 0x58, d2: 4 }), null);
    });

    it('ignores scene and meter buttons on 0x57 ch<8', () => {
      assert.equal(parseTransport({ status: 0xb5, d1: 0x57, d2: 2 }), null);
      assert.equal(parseTransport({ status: 0xb4, d1: 0x57, d2: 3 }), null);
    });
  });

  describe('transportHold()', () => {
    it('holds rewind/fast-forward with 05 and releases with 04', () => {
      assert.deepEqual(transportHold(TRANSPORT_BTN.REWIND, true), { status: 0xbc, d1: 0x57, d2: 0x05 });
      assert.deepEqual(transportHold(TRANSPORT_BTN.FF, false), { status: 0xbd, d1: 0x57, d2: 0x04 });
    });
  });
});
