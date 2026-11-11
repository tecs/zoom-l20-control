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

  it('moves slower by the given scale', () => {
    const drag = new ValueDrag(40, 500, range, { travel });
    assert.equal(drag.move(520, 0.1), 41);
  });

  it('applies a scale change from that move on, without a jump', () => {
    const drag = new ValueDrag(40, 500, range, { travel });
    assert.equal(drag.move(520), 50);
    assert.equal(drag.move(540, 0.1), 51);
    assert.equal(drag.move(560), 61);
  });

  it('adds up moves too small to change the value on their own', () => {
    const drag = new ValueDrag(40, 500, range, { travel });
    for (let position = 501; position <= 520; position++) {
      drag.move(position, 0.1);
    }
    assert.equal(drag.value, 41);
  });

  it('clamps a start value outside the range', () => {
    const drag = new ValueDrag(120, 500, range, { travel });
    assert.equal(drag.move(490), 95);
  });
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
