import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatValue, parseValue } from './format.ts';
import { rangeOf } from './protocol/registry.ts';

describe('formatValue()', () => {
  it('formats tempo to the desk resolution of 0.1 BPM', () => {
    assert.equal(formatValue('tempo', 628, true), '102.8'); // raw = (BPM - 40) * 10
    assert.equal(formatValue('tempo', 628), '102.8 BPM');
    assert.equal(formatValue('tempo', 800, true), '120');
    assert.equal(formatValue('tempo', 0, true), '40');
    assert.equal(formatValue('tempo', 2100, true), '250');
  });
});

describe('parseValue()', () => {
  const FADER = 'strips.0.sends.0';

  it('reads dB with or without the unit, onto the nearest step', () => {
    assert.equal(parseValue(FADER, '0'), 82);
    assert.equal(parseValue(FADER, '-10 dB'), 45);
    assert.equal(parseValue(FADER, '+10dB'), 120);
    assert.equal(parseValue(FADER, '-12'), 41);
  });

  it('reads -inf and -∞ as fully down', () => {
    assert.equal(parseValue(FADER, '-inf'), 0);
    assert.equal(parseValue(FADER, '-∞'), 0);
  });

  it('keeps a finite value below the scale off -inf', () => {
    assert.equal(parseValue(FADER, '-85'), 1);
  });

  it('clamps to the scale', () => {
    assert.equal(parseValue(FADER, '20'), 120);
    assert.equal(parseValue('strips.0.lowCut', '30'), 1);
  });

  it('reads pan as L/C/R or a signed number of steps', () => {
    const pan = 'strips.0.pan';
    assert.equal(parseValue(pan, 'L20'), 30);
    assert.equal(parseValue(pan, 'r 5'), 55);
    assert.equal(parseValue(pan, 'C'), 50);
    assert.equal(parseValue(pan, '-20'), 30);
    assert.equal(parseValue(pan, '80'), 100);
  });

  it('reads Hz with an optional k', () => {
    assert.equal(parseValue('strips.0.eqMidF', '800'), 48);
    assert.equal(parseValue('strips.0.eqMidF', '0.8 kHz'), 48);
    assert.equal(parseValue('strips.0.eqMidF', '8k'), 96);
  });

  it('reads off where the field has one', () => {
    assert.equal(parseValue('strips.0.lowCut', 'off'), 0);
    assert.equal(parseValue(FADER, 'off'), null);
  });

  it('reads BPM', () => {
    assert.equal(parseValue('tempo', '102.8 bpm'), 628);
  });

  it('rejects text that is not a value of the field', () => {
    assert.equal(parseValue(FADER, ''), null);
    assert.equal(parseValue(FADER, 'loud'), null);
    assert.equal(parseValue(FADER, '5k'), null);
    assert.equal(parseValue('strips.0.pan', 'L'), null);
  });
});

test('parseValue() reads back every readout except EQ mid frequency', () => {
  for (const path of [
    'strips.0.sends.0',
    'strips.0.pan',
    'strips.0.eqHi',
    'strips.0.lowCut',
    'strips.0.fx1Send',
    'monitors.0.level',
    'geq.bands.0',
  ]) {
    const { min, max } = rangeOf(path);
    for (let raw = min; raw <= max; raw++) {
      assert.equal(parseValue(path, formatValue(path, raw, true)), raw, `${path} ${raw}`);
    }
  }
});
