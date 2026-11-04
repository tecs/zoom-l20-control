import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { describeError } from './errors.ts';

describe('describeError()', () => {
  const circular: { self?: unknown } = {};
  circular.self = circular;

  const cases: [label: string, error: unknown, text: string][] = [
    ['a plain Error', new Error('boom'), 'boom'],
    [
      'a named Error',
      Object.assign(new Error('Connection failed.'), { name: 'NetworkError' }),
      'NetworkError: Connection failed.',
    ],
    ['a string', 'User cancelled', 'User cancelled'],
    ['an object', { code: 8, reason: 'cancelled' }, '{"code":8,"reason":"cancelled"}'],
    ['an object with nothing to serialize', new (class Opaque {})(), '[object Object]'],
    ['a circular object', circular, '[object Object]'],
    ['undefined', undefined, 'undefined'],
    ['null', null, 'null'],
  ];

  for (const [label, error, text] of cases) {
    test(label, () => {
      assert.equal(describeError(error), text);
    });
  }
});
