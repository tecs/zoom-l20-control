import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buttonAddress, buttonIndex, buttonPress } from './buttons.ts';
import { SCENE, sceneSlotIndex } from './scenes.ts';
import { TRANSPORT_BTN } from './transport.ts';

describe('Buttons', () => {
  describe('buttonAddress()', () => {
    it('maps the scene buttons to channel and controller', () => {
      assert.deepEqual(buttonAddress(SCENE.ON), { status: 0xb8, ctrl: 0x56 });
      assert.deepEqual(buttonAddress(SCENE.SAVE), { status: 0xb9, ctrl: 0x56 });
      assert.deepEqual(buttonAddress(SCENE.RECALL), { status: 0xba, ctrl: 0x56 });
      assert.deepEqual(buttonAddress(sceneSlotIndex(1)), { status: 0xbb, ctrl: 0x56 });
      assert.deepEqual(buttonAddress(sceneSlotIndex(9)), { status: 0xb3, ctrl: 0x57 });
      assert.deepEqual(buttonAddress(SCENE.RESET), { status: 0xb4, ctrl: 0x57 });
    });

    it('maps the transport buttons to channel and controller', () => {
      assert.deepEqual(buttonAddress(TRANSPORT_BTN.REC), { status: 0xb9, ctrl: 0x57 });
      assert.deepEqual(buttonAddress(TRANSPORT_BTN.PLAY_PAUSE), { status: 0xba, ctrl: 0x57 });
      assert.deepEqual(buttonAddress(TRANSPORT_BTN.STOP), { status: 0xbb, ctrl: 0x57 });
      assert.deepEqual(buttonAddress(TRANSPORT_BTN.REWIND), { status: 0xbc, ctrl: 0x57 });
      assert.deepEqual(buttonAddress(TRANSPORT_BTN.FF), { status: 0xbd, ctrl: 0x57 });
      assert.deepEqual(buttonAddress(TRANSPORT_BTN.OVERDUB), { status: 0xbe, ctrl: 0x57 });
    });
  });

  describe('buttonPress()', () => {
    it('emits the button address with value 03', () => {
      assert.deepEqual(buttonPress(SCENE.RECALL), { status: 0xba, d1: 0x56, d2: 0x03 });
      assert.deepEqual(buttonPress(TRANSPORT_BTN.PLAY_PAUSE), { status: 0xba, d1: 0x57, d2: 0x03 });
    });
  });

  describe('buttonIndex()', () => {
    it('reverses the address', () => {
      assert.equal(buttonIndex({ status: 0xb8, d1: 0x56, d2: 0x01 }), 8);
      assert.equal(buttonIndex({ status: 0xbe, d1: 0x57, d2: 0x01 }), 30);
    });

    it('is null outside the two button controllers', () => {
      assert.equal(buttonIndex({ status: 0xb8, d1: 0x55, d2: 0x01 }), null);
      assert.equal(buttonIndex({ status: 0xb8, d1: 0x58, d2: 0x01 }), null);
    });
  });
});
