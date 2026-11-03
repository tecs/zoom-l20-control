import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enumOf } from './valuetypes.ts';

describe('enumOf()', () => {
  const type = enumOf(['off', 'play', 'rec']);

  it('decodes an index in the list as is', () => {
    assert.equal(type.decode([2]), 2);
  });

  it('decodes an index outside the list to the first entry', () => {
    assert.equal(type.decode([3]), 0);
    assert.equal(type.decode([0x7f]), 0);
  });
});
