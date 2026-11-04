import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BY_PATH, LAYOUT, P, REGISTRY } from './registry.ts';

describe('REGISTRY', () => {
  it('has the full field set', () => {
    assert.ok(REGISTRY.length > 400, `only ${REGISTRY.length}`);
  });
});

describe('P', () => {
  it('builds only paths the registry has a field for', () => {
    const mixes = [...Array(LAYOUT.mixes).keys()];
    const channels = [
      ...[...Array(LAYOUT.strips).keys()].map((index) => P.strip(index)),
      ...LAYOUT.fxStrips.map((index) => P.fx(index)),
    ];
    const paths = [
      ...channels.flatMap((channel) => [
        ...Object.values(channel).filter((path) => typeof path === 'string'),
        ...mixes.map((mix) => channel.send(mix)),
      ]),
      ...Object.values(P.master),
      ...[...Array(LAYOUT.monitors).keys()].map((index) => P.monitor(index).level),
      P.geq.on,
      ...LAYOUT.geqBands.map((index) => P.geq.band(index)),
      P.tempo,
      P.sceneDirty,
      ...Object.values(P.recorder),
    ];

    assert.deepEqual(
      paths.filter((path) => !BY_PATH.has(path)),
      [],
    );
  });
});
