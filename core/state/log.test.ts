import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Log, type LogEntry } from './log.ts';

describe('Log', () => {
  it('never evicts errors on a flood of debug entries', () => {
    const log = new Log({ debug: 3, error: 2 });
    log.error('e1');
    for (let i = 0; i < 10; i++) log.debug(`d${i}`);
    log.error('e2');
    assert.deepEqual(
      log.entries('error').map(({ text }) => text),
      ['e1', 'e2'],
    );
    const dbg = log
      .entries('debug')
      .filter(({ level }) => level === 'debug')
      .map(({ text }) => text);
    assert.deepEqual(dbg, ['d7', 'd8', 'd9']);
  });

  describe('entries()', () => {
    it('filters by severity, merged in seq order', () => {
      const log = new Log();
      log.info('i');
      log.debug('d');
      log.warn('w');
      log.error('e');
      assert.deepEqual(
        log.entries('debug').map(({ text }) => text),
        ['i', 'd', 'w', 'e'],
      );
      assert.deepEqual(
        log.entries('info').map(({ text }) => text),
        ['i', 'w', 'e'],
      );
      assert.deepEqual(
        log.entries('error').map(({ text }) => text),
        ['e'],
      );
    });
  });

  describe('subscribe()', () => {
    it('notifies on every write', () => {
      const log = new Log();
      const seen: (LogEntry | null)[] = [];
      log.subscribe((entry) => seen.push(entry));
      log.info('a', 'status');
      log.debug('b', 'fader');
      assert.equal(seen.length, 2);
      assert.equal(seen[0]!.level, 'info');
      assert.equal(seen[0]!.kind, 'status');
    });
  });

  describe('clear()', () => {
    it('empties the buffers and emits null', () => {
      const log = new Log();
      const seen: (LogEntry | null)[] = [];
      log.info('a', 'status');
      log.subscribe((entry) => seen.push(entry));
      log.clear();
      assert.equal(log.entries().length, 0);
      assert.deepEqual(seen, [null]);
    });
  });
});
