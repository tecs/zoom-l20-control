import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY } from './registry.ts';

describe('REGISTRY', () => {
  it('has the full field set', () => {
    assert.ok(REGISTRY.length > 400, `only ${REGISTRY.length}`);
  });
});
