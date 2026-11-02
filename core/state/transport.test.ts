import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransportState } from './transport.ts';

describe('TransportState', () => {
  describe('playhead', () => {
    it('composes 14-bit hours, minutes and seconds', () => {
      const transport = new TransportState();
      transport.apply({ kind: 'playhead', field: 'hHi', value: 1 });
      transport.apply({ kind: 'playhead', field: 'hLo', value: 3 });
      transport.apply({ kind: 'playhead', field: 'm', value: 5 });
      transport.apply({ kind: 'playhead', field: 's', value: 59 });
      assert.deepEqual(transport.playhead, { h: 131, m: 5, s: 59 });
    });
  });

  describe('apply()', () => {
    it('tracks state and overdub, ignoring mode and other', () => {
      const transport = new TransportState();
      transport.apply({ kind: 'state', value: 5 });
      transport.apply({ kind: 'overdub', value: true });
      transport.apply({ kind: 'mode', value: 2 });
      transport.apply({ kind: 'other' });
      assert.equal(transport.state, 5);
      assert.equal(transport.overdub, true);
    });

    it('notifies subscribers only when a value changes', () => {
      const transport = new TransportState();
      let hits = 0;
      transport.subscribe(() => void ++hits);
      transport.apply({ kind: 'state', value: 1 });
      transport.apply({ kind: 'state', value: 1 });
      transport.apply({ kind: 'state', value: 0 });
      assert.equal(hits, 2);
    });
  });

  describe('subscribe()', () => {
    it('returns an unsubscribe that stops further notifications', () => {
      const transport = new TransportState();
      let hits = 0;
      const unsubscribe = transport.subscribe(() => void ++hits);
      transport.apply({ kind: 'state', value: 1 });
      unsubscribe();
      transport.apply({ kind: 'state', value: 0 });
      assert.equal(hits, 1);
    });
  });
});
