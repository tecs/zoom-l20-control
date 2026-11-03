import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeMeterFrame } from './meters.ts';
import { meterFrame } from '../fixtures/messages.ts';

describe('decodeMeterFrame()', () => {
  it('decodes mono + stereo + FX points at the right offsets and full-scales', () => {
    const pre = [22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 12, 0, 0, 3, 0];
    const post = [44];
    const result = decodeMeterFrame(meterFrame(2, pre, post))!;
    assert.equal(result.mix, 2);
    assert.equal(result.channels.length, 18);
    assert.equal(result.fx.length, 2);
    assert.deepEqual(result.channels[0], { pre: [0.5], post: [1] });
    assert.deepEqual(result.channels[16].pre, [0.5, 1]);
    assert.deepEqual(result.fx[0].pre, [0.25, 0]);
  });

  it('decodes the master output meter from the trailing L/R pair', () => {
    const result = decodeMeterFrame(meterFrame(0, [], [], [6, 12]))!;
    assert.deepEqual(result.master, { left: 0.5, right: 1 });
  });

  it('clamps over-full-scale to 1', () => {
    const result = decodeMeterFrame(meterFrame(0, [200], []))!;
    assert.equal(result.channels[0].pre[0], 1);
  });

  it('rejects non-meter frames', () => {
    const result = decodeMeterFrame(Uint8Array.from([0xf0, 0x52, 0x00, 0x00, 0x31, 0x01, 0x09, 0xf7]));
    assert.equal(result, null);
  });
});
