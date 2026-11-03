import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRoot } from 'solid-js';
import { Store } from '../core/state/store.ts';
import { MeterStore } from '../core/state/meters.ts';
import { field, fieldRW, meterFrame } from './bridge.ts';
import { P } from '../core/protocol/registry.ts';
import type { MeterFrame } from '../core/messaging/meters.ts';

const inRootIt = (name: string, test: () => void): void => {
  it(name, () => {
    createRoot((dispose) => {
      try {
        test();
      } finally {
        dispose();
      }
    });
  });
};

describe('Store <> Solid signal bridge', () => {
  describe('field()', () => {
    inRootIt('reconciles on a remote change', () => {
      const store = new Store();
      const value = field<number>(store, P.strip(0).send(0));
      store.applyMessage({ status: 0xb0, d1: 0x3c, d2: 100 }); // remote -> strips.0.sends.0 = 100
      assert.equal(value(), 100);
    });
  });

  describe('fieldRW()', () => {
    inRootIt('updates optimistically and dispatches the intent', () => {
      const store = new Store();
      let sent: unknown = null;
      store.onSend = (message) => void (sent = message);
      const [muted, setMuted] = fieldRW<boolean>(store, P.strip(0).mute);

      setMuted(true);
      assert.equal(muted(), true);
      assert.ok(sent);
    });

    // The binding's own echo can't be seen directly, so this checks the visible side of it
    inRootIt('ignores the local echo of its dispatch, so other bindings of the path keep their value', () => {
      const store = new Store();
      const [muted, setMuted] = fieldRW<boolean>(store, P.strip(0).mute);
      const otherBinding = field<boolean>(store, P.strip(0).mute);

      setMuted(true);
      assert.equal(muted(), true);
      assert.equal(store.get(P.strip(0).mute), true);
      assert.equal(otherBinding(), undefined);
    });
  });

  describe('meterFrame()', () => {
    inRootIt('tracks the latest frame', () => {
      const meters = new MeterStore();
      const frame = meterFrame(meters);
      assert.equal(frame(), null);

      const nextFrame: MeterFrame = {
        mix: 0,
        channels: [{ pre: [0.5], post: [0.4] }],
        fx: [],
        master: { left: 0, right: 0 },
      };
      meters.update(nextFrame);
      assert.equal(frame(), nextFrame);
    });
  });
});
