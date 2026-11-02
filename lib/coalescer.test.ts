import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Coalescer } from './coalescer.ts';

describe('Coalescer', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => mock.timers.reset());

  const make = () => {
    const report = mock.fn((_value: string, _repeats: number) => {});
    return {
      coalescer: new Coalescer(1000, report),
      calls: () => report.mock.calls.map((call) => call.arguments),
    };
  };

  it('reports a first occurrence at once', () => {
    const { coalescer, calls } = make();
    coalescer.push('a');
    assert.deepEqual(calls(), [['a', 0]]);
  });

  it('reports swallowed repeats when the window closes', () => {
    const { coalescer, calls } = make();
    for (let i = 0; i < 5; i++) {
      coalescer.push('a');
    }
    assert.deepEqual(calls(), [['a', 0]]);
    mock.timers.tick(1000);
    assert.deepEqual(calls(), [
      ['a', 0],
      ['a', 4],
    ]);
  });

  it('reports swallowed repeats before a different value', () => {
    const { coalescer, calls } = make();
    coalescer.push('a');
    coalescer.push('a');
    coalescer.push('b');
    assert.deepEqual(calls(), [
      ['a', 0],
      ['a', 1],
      ['b', 0],
    ]);
  });

  it('reports one summary per window for a run that keeps going', () => {
    const { coalescer, calls } = make();
    coalescer.push('a');
    coalescer.push('a');
    mock.timers.tick(1000);
    coalescer.push('a');
    coalescer.push('a');
    mock.timers.tick(1000);
    assert.deepEqual(calls(), [
      ['a', 0],
      ['a', 1],
      ['a', 2],
    ]);
  });

  it('reports the value afresh once a quiet window has passed', () => {
    const { coalescer, calls } = make();
    coalescer.push('a');
    mock.timers.tick(1000);
    coalescer.push('a');
    assert.deepEqual(calls(), [
      ['a', 0],
      ['a', 0],
    ]);
  });

  describe('flush()', () => {
    it('reports pending repeats and closes the window', () => {
      const { coalescer, calls } = make();
      coalescer.push('a');
      coalescer.push('a');
      coalescer.flush();
      coalescer.push('a');
      assert.deepEqual(calls(), [
        ['a', 0],
        ['a', 1],
        ['a', 0],
      ]);
    });
  });
});
