import { it, describe } from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY } from '../protocol/registry.ts';
import { decodeCC, encodeField, RX, type DecodeResult } from './codec.ts';
import type { Value } from '../protocol/valuetypes.ts';

describe('Codec', () => {
  it('has no (channel, controller) collisions in its reverse index', () => {
    let liveKeys = 0;
    for (const { enc } of REGISTRY.flatMap(({ live }) => live ?? [])) {
      liveKeys += enc === 'cc14' ? 2 : 1;
    }
    assert.equal(RX.size, liveKeys);
  });

  it('round-trips every live field through encodeField() and decodeCC()', () => {
    for (const field of REGISTRY) {
      if (!field.live) continue;
      let value: boolean | number;
      switch (field.type.kind) {
        case 'bool':
          value = true;
          break;
        case 'u14':
          value = 487;
          break;
        case 'enum':
          value = 3;
          break;
        default:
          value = 42;
      }
      const pair = {};
      let decoded = null;
      for (const message of encodeField(field.path, value)) {
        decoded = decodeCC(message, pair);
      }
      assert.deepEqual(decoded, { path: field.path, value }, field.path);
    }
  });

  describe('decodeCC()', () => {
    it('decodes hand-verified capture bytes', () => {
      const eq = (decoded: DecodeResult | null, path: string, value: Value) =>
        assert.deepEqual(decoded, { path, value });

      eq(decodeCC({ status: 0xb0, d1: 0x3c, d2: 100 }, {}), 'strips.0.sends.0', 100);
      eq(decodeCC({ status: 0xb0, d1: 0x3e, d2: 70 }, {}), 'strips.0.sends.1', 70);
      eq(decodeCC({ status: 0xb0, d1: 0x3d, d2: 90 }, {}), 'strips.16.sends.0', 90);
      eq(decodeCC({ status: 0xb2, d1: 0x3d, d2: 90 }, {}), 'strips.17.sends.0', 90);
      eq(decodeCC({ status: 0xb0, d1: 0x30, d2: 1 }, {}), 'strips.0.mute', true);
      eq(decodeCC({ status: 0xb0, d1: 0x51, d2: 120 }, {}), 'fx.0.sends.1', 120);
      eq(decodeCC({ status: 0xbc, d1: 0x50, d2: 100 }, {}), 'fx.0.sends.0', 100);
      eq(decodeCC({ status: 0xb0, d1: 0x4e, d2: 3 }, {}), 'fx.0.effect', 3);
      eq(decodeCC({ status: 0xb4, d1: 0x50, d2: 1 }, {}), 'fx.0.mute', true);
      eq(decodeCC({ status: 0xbf, d1: 0x55, d2: 1 }, {}), 'geq.on', true);
      eq(decodeCC({ status: 0xbe, d1: 0x55, d2: 60 }, {}), 'geq.bands.14', 60);
      eq(decodeCC({ status: 0xba, d1: 0x54, d2: 120 }, {}), 'master.level', 120);
      eq(decodeCC({ status: 0xb9, d1: 0x54, d2: 1 }, {}), 'master.mute', true);
      eq(decodeCC({ status: 0xb0, d1: 0x53, d2: 46 }, {}), 'monitors.0.level', 46);
    });

    it('reassembles 14-bit values (FX tone, tempo)', () => {
      const pair1 = {};
      decodeCC({ status: 0xb4, d1: 0x4e, d2: 3 }, pair1);
      assert.deepEqual(decodeCC({ status: 0xb5, d1: 0x4e, d2: 103 }, pair1), { path: 'fx.0.tone', value: 487 });

      const pair2 = {};
      decodeCC({ status: 0xb2, d1: 0x58, d2: 6 }, pair2);
      assert.deepEqual(decodeCC({ status: 0xb3, d1: 0x58, d2: 4 }, pair2), { path: 'tempo', value: 772 });
    });

    it('decodes an unknown message to null', () => assert.equal(decodeCC({ status: 0xb0, d1: 0x7f, d2: 0 }, {}), null));
  });

  describe('encodeField()', () => {
    it('encodes a 14-bit value as two ordered CCs', () => {
      assert.deepEqual(encodeField('fx.0.tone', 487), [
        { status: 0xb4, d1: 0x4e, d2: 3 },
        { status: 0xb5, d1: 0x4e, d2: 103 },
      ]);
    });
  });
});
