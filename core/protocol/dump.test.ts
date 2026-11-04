import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deserializeDump, serializeDump } from './dump.ts';
import { DUMPS } from '../fixtures/dumps.ts';

describe('Dump', () => {
  describe('serializeDump()', () => {
    for (const { name, bytes } of DUMPS) {
      it(`round-trips ${name} byte-identical`, () => {
        assert.deepEqual([...serializeDump(deserializeDump(bytes), bytes)], [...bytes]);
      });
    }
  });

  describe('deserializeDump()', () => {
    const [first] = DUMPS;
    it('returns well-shaped state', { skip: !first }, () => {
      assert.ok(first);
      const state = deserializeDump(first.bytes) as {
        strips: { sends: unknown[] }[];
        fx: { tone: number }[];
        geq: { bands: unknown[] };
      };
      assert.equal(state.strips.length, 18);
      assert.equal(typeof state.fx[1]?.tone, 'number');
      assert.equal(state.geq.bands.length, 15);
      assert.equal(state.strips[0]?.sends.length, 7);
    });
  });
});
