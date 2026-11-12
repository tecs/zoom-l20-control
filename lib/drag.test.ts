import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FINE_SCALE, ValueDrag, keySteps, sidewaysScale, stepValue } from './drag.ts';

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

  describe('with a detent', () => {
    const snaps = { travel, snaps: [50], snapPx: 4 };

    it('reaches the values next to it without catching', () => {
      const drag = new ValueDrag(40, 500, range, snaps);
      assert.equal(drag.move(518), 49);
    });

    it('holds the value for the detent travel once reached, then goes on', () => {
      const drag = new ValueDrag(40, 500, range, snaps);
      assert.equal(drag.move(520), 50);
      assert.equal(drag.move(524), 50);
      assert.equal(drag.move(526), 51);
    });

    it('catches when one move crosses it, and spends the rest of that move', () => {
      const drag = new ValueDrag(40, 500, range, snaps);
      assert.equal(drag.move(530), 53);
    });

    it('holds at each detent one move crosses, nearest first', () => {
      const drag = new ValueDrag(40, 500, range, { ...snaps, snaps: [50, 45] });
      assert.equal(drag.move(530), 51);
    });

    it('lets go backwards after the same travel', () => {
      const drag = new ValueDrag(40, 500, range, snaps);
      assert.equal(drag.move(520), 50);
      assert.equal(drag.move(516), 50);
      assert.equal(drag.move(514), 49);
    });

    it('catches again when the drag comes back to it', () => {
      const drag = new ValueDrag(40, 500, range, snaps);
      assert.equal(drag.move(530), 53);
      assert.equal(drag.move(522), 50);
    });

    it('holds a drag that starts on it', () => {
      const drag = new ValueDrag(50, 500, range, snaps);
      assert.equal(drag.move(504), 50);
      assert.equal(drag.move(506), 51);
    });

    it('does not catch in fine mode', () => {
      const drag = new ValueDrag(49, 500, range, snaps);
      assert.equal(drag.move(520, 0.1), 50);
      assert.equal(drag.move(540, 0.1), 51);
    });

    it('lets go at once when fine mode starts', () => {
      const drag = new ValueDrag(50, 500, range, snaps);
      assert.equal(drag.move(498, 0.1), 50);
      assert.equal(drag.move(480, 0.1), 49);
    });
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

describe('sidewaysScale()', () => {
  it('keeps full speed close to the axis, on either side', () => {
    assert.equal(sidewaysScale(50), 1);
    assert.equal(sidewaysScale(-50), 1);
  });

  it('slows down further away', () => {
    assert.equal(sidewaysScale(100), 0.25);
    assert.ok(sidewaysScale(70) > sidewaysScale(100));
  });

  it('never goes below the fine scale', () => {
    assert.equal(sidewaysScale(1000), FINE_SCALE);
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
