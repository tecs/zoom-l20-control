import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValueDrag } from './drag.ts';

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
});
