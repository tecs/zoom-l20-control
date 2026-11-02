import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE, sceneSlotIndex, sceneButtonAddress, scenePress, isSceneOnEcho } from './scenes.ts';

describe('Scene buttons', () => {
  describe('sceneButtonAddress()', () => {
    it('maps the flat button index to channel and controller', () => {
      assert.deepEqual(sceneButtonAddress(SCENE.ON), { status: 0xb8, ctrl: 0x56 });
      assert.deepEqual(sceneButtonAddress(SCENE.SAVE), { status: 0xb9, ctrl: 0x56 });
      assert.deepEqual(sceneButtonAddress(SCENE.RECALL), { status: 0xba, ctrl: 0x56 });
      assert.deepEqual(sceneButtonAddress(sceneSlotIndex(1)), { status: 0xbb, ctrl: 0x56 });
      assert.deepEqual(sceneButtonAddress(sceneSlotIndex(9)), { status: 0xb3, ctrl: 0x57 });
      assert.deepEqual(sceneButtonAddress(SCENE.RESET), { status: 0xb4, ctrl: 0x57 });
    });
  });

  describe('scenePress()', () => {
    it('emits the button address with value 03', () => {
      assert.deepEqual(scenePress(SCENE.RECALL), { status: 0xba, d1: 0x56, d2: 0x03 });
    });
  });

  describe('isSceneOnEcho()', () => {
    it('detects the SCENE ON echo and nothing else', () => {
      assert.equal(isSceneOnEcho({ status: 0xb8, d1: 0x56, d2: 0x01 }), true);
      assert.equal(isSceneOnEcho({ status: 0xb9, d1: 0x56, d2: 0x01 }), false);
      assert.equal(isSceneOnEcho({ status: 0xb8, d1: 0x55, d2: 0x01 }), false);
    });
  });
});
