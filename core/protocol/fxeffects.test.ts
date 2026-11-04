import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { FX_RANGES, FX_KNOB_LABELS, FX_DESCRIPTIONS, FX_DISPLAY, fxKnobDefault, fxKnob } from './fxeffects.ts';
import { FX1_EFFECTS, FX2_EFFECTS } from './registry.ts';

describe('FX effects', () => {
  describe('fxKnob()', () => {
    it('combines the label, wire range and display range of one knob', () => {
      assert.deepEqual(fxKnob(0, 7, 'tone'), { label: 'Time', wire: [9, 499], display: [10, 500] });
      assert.deepEqual(fxKnob(1, 3, 'decay'), { label: 'Feedback', wire: [0, 100], display: [0, 100] });
    });

    it('falls back to a plain Tone/Decay knob outside the tables', () => {
      assert.deepEqual(fxKnob(0, 99, 'tone'), { label: 'Tone', wire: [0, 100], display: [0, 100] });
      assert.deepEqual(fxKnob(5, 0, 'decay'), { label: 'Decay', wire: [0, 100], display: [0, 100] });
    });
  });

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
    assert.equal(FX_RANGES[0]?.length, FX1_EFFECTS.length);
    assert.equal(FX_RANGES[1]?.length, FX2_EFFECTS.length);
    assert.equal(FX_KNOB_LABELS[0]?.length, FX1_EFFECTS.length);
    assert.equal(FX_KNOB_LABELS[1]?.length, FX2_EFFECTS.length);
  });

  test('descriptions and display ranges cover every effect', () => {
    for (const [tbl, name] of [
      [FX_DESCRIPTIONS, 'FX_DESCRIPTIONS'],
      [FX_DISPLAY, 'FX_DISPLAY'],
    ] as [unknown[][], string][]) {
      assert.equal(tbl.length, 2, name);
      assert.equal(tbl[0]?.length, FX1_EFFECTS.length, name);
      assert.equal(tbl[1]?.length, FX2_EFFECTS.length, name);
    }
  });
});
