import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { sleep } from './timers.ts';

describe('sleep()', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => mock.timers.reset());

  it('sleeps for the given amount of milliseconds', async () => {
    let done = false;
    void sleep(100).then(() => (done = true));

    mock.timers.tick(100);
    await Promise.resolve();
    assert(done, 'sleep finished');
  });

  it('does not finish sleeping before the given amount of milliseconds has passed', async () => {
    let done = false;
    void sleep(100).then(() => (done = true));

    mock.timers.tick(50);
    await Promise.resolve();
    assert(!done, 'still sleeping');

    mock.timers.tick(50);
    await Promise.resolve();
    assert(done, 'sleep finished');
  });
});
