// State store: dump load, remote-vs-local source semantics, subscribe/emit. Run: node --test

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store, type Change } from './store.ts';
import { BASELINE } from '../fixtures/dumps.ts';

describe('Store', () => {
  describe('loadDump()', () => {
    it('populates the semantic state', { skip: !BASELINE }, () => {
      const store = new Store();
      const notes: Change[] = [];

      store.subscribe((change) => notes.push(change));
      store.loadDump(BASELINE!);

      assert.equal((store.state['strips'] as unknown[]).length, 18);
      assert.equal(store.get('fx.1.effect'), 0);
      assert.equal(store.get('fx.1.tone'), 50);
      assert.equal(store.get('fx.1.decay'), 17);
      assert.equal(store.get('geq.on'), false);
      assert.equal(store.get('recorder.name'), '210524_122905');
      assert.equal(store.get('recorder.duration'), 46);
      assert.equal(store.get('recorder.playhead'), 0);
      assert.equal(store.get('recorder.currentMarker'), 0);
      assert.equal(store.get('recorder.atMarker'), 1);
      assert.ok(notes.some(({ source }) => source === 'dump'));
    });
  });

  describe('applyMessage()', () => {
    it('applies a remote update without sending', () => {
      const store = new Store();
      const notes: Change[] = [];

      let sent = null;
      store.onSend = (messages) => void (sent = messages);
      store.subscribe((change) => notes.push(change));
      store.applyMessage({ status: 0xb0, d1: 0x3c, d2: 100 });

      assert.equal(store.get('strips.0.sends.0'), 100);
      assert.ok(notes.some(({ path, source }) => path === 'strips.0.sends.0' && source === 'remote'));
      assert.equal(sent, null);
    });
  });

  describe('dispatch()', () => {
    it('updates locally and emits the commands', () => {
      const store = new Store();
      let sent = null;

      store.onSend = (messages) => void (sent = messages);
      store.dispatch('strips.0.mute', true);

      assert.equal(store.get('strips.0.mute'), true);
      assert.deepEqual(sent, [{ status: 0xb0, d1: 0x30, d2: 1 }]);

      store.dispatch('fx.0.tone', 487);
      assert.deepEqual(sent, [
        { status: 0xb4, d1: 0x4e, d2: 3 },
        { status: 0xb5, d1: 0x4e, d2: 103 },
      ]);
    });
  });
});
