import { mock } from 'node:test';

/** Waits until every promise callback queued so far has run */
export const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** Moves the clock forward in small steps allowing queued promise callbacks to run inbetween */
export const advance = async (ms: number, step = 100): Promise<void> => {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await flush();
    mock.timers.tick(step);
  }
  await flush();
};
