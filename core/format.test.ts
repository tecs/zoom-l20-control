import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatValue } from './format.ts';

describe('formatValue()', () => {
  it('formats tempo to the desk resolution of 0.1 BPM', () => {
    assert.equal(formatValue('tempo', 628, true), '102.8'); // raw = (BPM - 40) * 10
    assert.equal(formatValue('tempo', 628), '102.8 BPM');
    assert.equal(formatValue('tempo', 800, true), '120');
    assert.equal(formatValue('tempo', 0, true), '40');
    assert.equal(formatValue('tempo', 2100, true), '250');
  });
});
