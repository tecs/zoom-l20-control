import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { FX_RANGES, FX_KNOB_LABELS, FX_DESCRIPTIONS, FX_DISPLAY, fxKnobDefault } from './fxeffects.ts';
import { FX1_EFFECTS, FX2_EFFECTS } from './registry.ts';

describe('FX effects', () => {
  describe('fxKnobDefault()', () => {
    it('returns the midpoint of the effect wire range', () => {
      assert.equal(fxKnobDefault(0, 0, 'tone'), 50);
      assert.equal(fxKnobDefault(0, 0, 'decay'), 50);
      assert.equal(fxKnobDefault(1, 0, 'tone'), 50);
      assert.equal(fxKnobDefault(1, 0, 'decay'), 17);
    });
  });

  test('ranges and knob labels cover every effect', () => {
    assert.equal(FX_RANGES.length, 2);
    assert.equal(FX_KNOB_LABELS.length, 2);
    assert.equal(FX_RANGES[0].length, FX1_EFFECTS.length);
    assert.equal(FX_RANGES[1].length, FX2_EFFECTS.length);
    assert.equal(FX_KNOB_LABELS[0].length, FX1_EFFECTS.length);
    assert.equal(FX_KNOB_LABELS[1].length, FX2_EFFECTS.length);
  });

  test('descriptions and display ranges cover every effect', () => {
    for (const [tbl, name] of [
      [FX_DESCRIPTIONS, 'FX_DESCRIPTIONS'],
      [FX_DISPLAY, 'FX_DISPLAY'],
    ] as [unknown[][], string][]) {
      assert.equal(tbl.length, 2, name);
      assert.equal(tbl[0].length, FX1_EFFECTS.length, name);
      assert.equal(tbl[1].length, FX2_EFFECTS.length, name);
    }
  });
});
