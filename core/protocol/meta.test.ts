import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY } from './registry.ts';
import {
  META,
  metaFor,
  normalizePath,
  linearDistribution,
  tableDistribution,
  familyRawReadout,
  PROVISIONAL_FAMILIES,
  FAMILIES,
} from './meta.ts';

describe('Meta', () => {
  describe('normalizePath()', () => {
    it('strips instance indices to a family key', () => {
      assert.equal(normalizePath('strips.3.sends.2'), 'strips.sends');
      assert.equal(normalizePath('strips.0.pan'), 'strips.pan');
      assert.equal(normalizePath('monitors.5.level'), 'monitors.level');
      assert.equal(normalizePath('fx.1.tone'), 'fx.tone');
      assert.equal(normalizePath('master.level'), 'master.level');
      assert.equal(normalizePath('tempo'), 'tempo');
    });
  });

  describe('linearDistribution()', () => {
    it('round-trips between raw and domain values', () => {
      const distribution = linearDistribution(0, 60, -15, 15);
      assert.equal(distribution.toDomain(30), 0);
      assert.equal(distribution.toDomain(0), -15);
      assert.equal(distribution.toDomain(60), 15);
      assert.equal(distribution.toRaw(0), 30);
      assert.equal(distribution.toRaw(15), 60);
    });
  });

  test('the tempo distribution matches the wire formula', () => {
    const distribution = META.tempo.dist;
    assert.equal(distribution.toDomain(0), 40);
    assert.equal(distribution.toDomain(2100), 250);
    assert.equal(distribution.toRaw(120), 800);
  });

  describe('tableDistribution()', () => {
    it('encodes exact values', () => {
      const distribution = tableDistribution([
        [0, -Infinity],
        [1, -40],
        [84, 0],
        [120, 10],
      ]);
      assert.equal(distribution.toDomain(0), -Infinity);
      assert.equal(distribution.toDomain(84), 0);
      assert.equal(distribution.toDomain(120), 10);
      assert.equal(distribution.toRaw(-Infinity), 0);
      assert.equal(distribution.toRaw(0), 84);
      assert.equal(distribution.toRaw(10), 120);
    });

    it('is monotonic across its range', () => {
      const distribution = tableDistribution([
        [0, 1],
        [20, 2],
        [100, 10],
      ]);
      let prev = 0;
      for (let rawValue = 0; rawValue <= 100; rawValue++) {
        const domainValue = distribution.toDomain(rawValue);
        assert.ok(domainValue >= prev, `raw ${rawValue}: ${domainValue} < ${prev}`);
        prev = domainValue;
      }
    });

    it('encodes the lowest audible step to itself, not silence', () => {
      const distribution = tableDistribution([
        [0, -Infinity],
        [1, -80],
        [2, -70],
      ]);
      assert.equal(distribution.toRaw(-80), 1);
      assert.equal(distribution.toRaw(-90), 0); // below the measured curve
    });

    it('rejects invalid calibration points', () => {
      assert.throws(
        () =>
          tableDistribution([
            [0, -Infinity],
            [3, -65.8],
            [20, -20],
          ]),
        /must be one more/,
      );
      assert.throws(
        () =>
          tableDistribution([
            [1, 0],
            [0, 10],
            [2, 20],
          ]),
        /must be sorted/,
      );
      assert.throws(
        () =>
          tableDistribution([
            [0, 10],
            [1, 0],
            [2, 20],
          ]),
        /must be sorted/,
      );
      assert.throws(() => tableDistribution([[0, 0]]), /must contain at least two points/);
    });
  });

  describe('metaFor()', () => {
    it('resolves any instance path to its family spec', () => {
      assert.equal(metaFor('strips.5.sends.2')!.role, 'Level');
      assert.equal(metaFor('monitors.3.level')!.unit, 'dB');
      assert.equal(metaFor('fx.1.tone')!.perEffect, true);
      assert.equal(metaFor('tempo')!.unit, 'BPM');
      assert.equal(metaFor('strips.0.name')!.role, 'Name');
      assert.equal(metaFor('bogus.path'), null);
    });
  });

  test('every registry family has a META entry', () => {
    const families = [...new Set(REGISTRY.map(({ path }) => normalizePath(path)))];
    const missing = families.filter((family) => !metaFor(family));
    assert.deepEqual(missing, [], `families without metadata: ${missing.join(', ')}`);
  });

  test('every family with a unit carries a distribution', () => {
    for (const [family, metadata] of Object.entries(FAMILIES)) {
      if (metadata.unit && !metadata.perEffect) {
        assert.ok(metadata.dist, `${family} has unit ${metadata.unit} but no dist`);
      }
    }
  });

  describe('familyRawReadout()', () => {
    it('picks the master-mix instance for send families', () => {
      const storeStub = { get: (path: string) => path.length };
      const faders = familyRawReadout(storeStub, 'strips.sends');
      assert.equal(faders.length, 16 + 2);
      assert.ok(faders.every(({ path }) => path.endsWith('.sends.0')));
      assert.equal(familyRawReadout(storeStub, 'monitors.level').length, 6);
    });
  });

  test('calibrated families reflect the hardware sweep', () => {
    assert.equal(META['strips.sends'].dist.toDomain(0), -Infinity); // floor
    assert.equal(META['strips.sends'].dist.toDomain(82), 0); // channel-fader unity
    assert.equal(META['strips.sends'].dist.toDomain(120), 10); // top
    assert.equal(META['strips.sends'].unity, 82);
    assert.equal(META['master.level'].dist, META['strips.sends'].dist); // master shares the fader taper
    assert.equal(META['fx.sends'].dist, META['strips.sends'].dist); // FX-return fader too
    assert.equal(META['monitors.level'].dist.toDomain(77), 0); // monitor unity
    assert.equal(META['monitors.level'].dist.toDomain(118), 15); // monitors reach +15
    assert.equal(META['strips.fx1Send'].dist.toDomain(45), 0); // send unity
    assert.equal(META['strips.fx1Send'].dist, META['strips.fx2Send'].dist); // both FX sends share one taper
  });

  test('every table distribution is monotonic across the raw range', () => {
    const distributions = Object.entries(FAMILIES).filter(([, { dist }]) => dist?.kind === 'table');
    assert.ok(distributions.length >= 5, `only ${distributions.length} table families`);
    for (const [family, { dist }] of distributions) {
      let prev = -Infinity;
      for (let rawValue = 0; rawValue <= 127; rawValue++) {
        const domainValue = dist!.toDomain(rawValue);
        assert.ok(domainValue >= prev, `${family} non-monotonic at raw ${rawValue}: ${domainValue} < ${prev}`);
        prev = domainValue;
      }
    }
  });

  test('all measurable curves are calibrated (none left provisional)', () => {
    assert.deepEqual(PROVISIONAL_FAMILIES, []);
  });

  test('reset defaults match the baseline dump', () => {
    assert.equal(META['geq.on'].default, 0); // off
    assert.equal(META['fx.effect'].default, 0); // Hall1 / Hall3
    assert.equal(META.tempo.default, 800); // 120 BPM
    assert.equal(META.sceneDirty.readOnly, true);
    assert.equal(META['fx.tone'].resetToMid, true); // per-effect midpoint (fxeffects.fxKnobDefault)
  });
});
