import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSceneOnEcho } from './scenes.ts';

describe('Scene buttons', () => {
  describe('isSceneOnEcho()', () => {
    it('detects the SCENE ON echo and nothing else', () => {
      assert.equal(isSceneOnEcho({ status: 0xb8, d1: 0x56, d2: 0x01 }), true);
      assert.equal(isSceneOnEcho({ status: 0xb9, d1: 0x56, d2: 0x01 }), false);
      assert.equal(isSceneOnEcho({ status: 0xb8, d1: 0x55, d2: 0x01 }), false);
    });
  });
});
