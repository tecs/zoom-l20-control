import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { Log, logKindForPath, type LogEntry, type LogKind } from './log.ts';

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

describe('logKindForPath()', () => {
  const cases: [path: string, kind: LogKind][] = [
    ['strips.0.mute', 'mute'],
    ['fx.0.mute', 'mute'],
    ['master.mute', 'mute'],
    ['strips.0.solo', 'solo'],
    ['fx.1.solo', 'solo'],
    ['strips.0.pan', 'pan'],
    ['strips.0.fx1Send', 'fx'],
    ['strips.17.fx2Send', 'fx'],
    ['strips.0.sends.0', 'fader'],
    ['strips.0.sends.6', 'fader'],
    ['fx.0.sends.0', 'fader'],
    ['master.level', 'fader'],
    ['monitors.5.level', 'fader'],
    ['strips.0.eqOff', 'eq'],
    ['strips.0.eqHi', 'eq'],
    ['strips.0.eqMidF', 'eq'],
    ['strips.0.lowCut', 'eq'],
    ['geq.on', 'eq'],
    ['geq.bands.14', 'eq'],
    ['fx.0.effect', 'fx'],
    ['fx.0.tone', 'fx'],
    ['fx.1.decay', 'fx'],
    ['strips.0.name', 'misc'],
    ['strips.0.rec', 'misc'],
    ['strips.0.phase', 'misc'],
    ['master.rec', 'misc'],
    ['tempo', 'misc'],
    ['sceneDirty', 'misc'],
    ['recorder.playhead', 'misc'],
  ];

  for (const [path, kind] of cases) {
    test(`${path} -> ${kind}`, () => {
      assert.equal(logKindForPath(path), kind);
    });
  }
});
