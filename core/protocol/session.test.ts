import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { meterSelect } from './session.ts';

describe('meterSelect()', () => {
  it('generates the message subscribing to a mix', () => {
    assert.deepEqual(meterSelect(0), { status: 181, d1: 87, d2: 0 });
    assert.deepEqual(meterSelect(3), { status: 181, d1: 87, d2: 3 });
  });
});
