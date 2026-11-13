import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';
import { HANDSHAKE, meterSelect } from './session.ts';

test('HANDSHAKE requests identity, dump, scene list and meters', () => {
  assert.deepEqual(HANDSHAKE, [
    [0xf0, 0x7e, 0x00, 0x06, 0x01, 0xf7],
    [0xf0, 0x52, 0x00, 0x00, 0x2b, 0xf7],
    [0xf0, 0x52, 0x00, 0x00, 0x07, 0x00, 0xf7],
    [0xf0, 0x52, 0x00, 0x00, 0x50, 0xf7],
  ]);
});

describe('meterSelect()', () => {
  it('generates the message subscribing to a mix', () => {
    assert.deepEqual(meterSelect(0), { status: 181, d1: 87, d2: 0 });
    assert.deepEqual(meterSelect(3), { status: 181, d1: 87, d2: 3 });
  });
});
