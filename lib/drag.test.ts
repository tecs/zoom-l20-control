import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValueDrag, keySteps, stepValue } from './drag.ts';

const range = { min: 0, max: 100 };
const travel = 200;

describe('ValueDrag', () => {
  it('keeps the value on a tap', () => {
    const drag = new ValueDrag(40, 500, range, { travel });
    assert.equal(drag.move(500), 40);
  });

  it('moves the value by the pointer travel, not to the pointer', () => {
    const drag = new ValueDrag(40, 500, range, { travel });
    assert.equal(drag.move(520), 50);
    assert.equal(drag.move(480), 30);
  });

  it('stops at the ends and turns back at once when dragged back', () => {
    const drag = new ValueDrag(90, 500, range, { travel });
    assert.equal(drag.move(600), 100);
    assert.equal(drag.move(590), 95);
  });

describe('keySteps()', () => {
  it('raises on up and right, lowers on down and left', () => {
    assert.deepEqual(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].map(keySteps), [1, 1, -1, -1]);
  });

  it('ignores other keys', () => {
    assert.equal(keySteps('Home'), 0);
  });
});

describe('stepValue()', () => {
  it('moves by whole steps', () => {
    assert.equal(stepValue(40, 1, range), 41);
    assert.equal(stepValue(40, -3, range), 37);
  });

  it('stops at the ends', () => {
    assert.equal(stepValue(100, 1, range), 100);
    assert.equal(stepValue(0, -1, range), 0);
  });
});
