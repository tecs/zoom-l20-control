// Pointer, key and wheel handling shared by the value controls

import type { Accessor, JSX } from 'solid-js';
import { FINE_SCALE, ValueDrag, keySteps, sidewaysScale, stepValue, type Range } from '../../lib/drag.ts';

export type ValueGestureOptions = {
  value: Accessor<number>;
  range: Accessor<Range>;
  /** Detents a drag catches on */
  snaps: Accessor<readonly number[]>;
  /** Double-tap target */
  resetValue: Accessor<number>;
  /** Pointer travel for the full range */
  travel(element: HTMLElement): number;
  onInput(value: number): void;
};

type PointerHandler = JSX.EventHandler<HTMLElement, PointerEvent>;

export type ValueGestureHandlers = {
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onPointerUp: PointerHandler;
  onPointerCancel: () => void;
  onKeyDown: JSX.EventHandler<HTMLElement, KeyboardEvent>;
  onWheel: JSX.EventHandler<HTMLElement, WheelEvent>;
};

/** Detent pointer travel */
const SNAP_PX = 12;
/** Max tap pointer travel */
const TAP_PX = 4;
const DOUBLE_TAP_MS = 300;

type Press = { x: number; y: number; drag: ValueDrag | undefined };

export function valueGesture(options: ValueGestureOptions): ValueGestureHandlers {
  let press: Press | undefined;
  let lastTapAt = -Infinity;

  const set = (value: number): void => {
    if (value !== options.value()) {
      options.onInput(value);
    }
  };

  const startDrag = (event: PointerEvent, travel: number): ValueDrag =>
    new ValueDrag(options.value(), -event.clientY, options.range(), {
      travel,
      snaps: options.snaps(),
      snapPx: SNAP_PX,
    });

  return {
    onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
      press = { x: event.clientX, y: event.clientY, drag: undefined };
    },

    onPointerMove(event) {
      if (!press) {
        return;
      }
      if (!press.drag) {
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= TAP_PX) {
          return;
        }
        press.drag = startDrag(event, options.travel(event.currentTarget));
      }
      const scale = event.shiftKey ? FINE_SCALE : sidewaysScale(event.clientX - press.x);
      set(press.drag.move(-event.clientY, scale));
    },

    onPointerUp(event) {
      const tap = press && !press.drag;
      press = undefined;
      if (!tap) {
        return;
      }
      // Reset on double tap
      if (event.timeStamp - lastTapAt < DOUBLE_TAP_MS) {
        lastTapAt = -Infinity;
        set(options.resetValue());
      } else {
        lastTapAt = event.timeStamp;
      }
    },

    onPointerCancel() {
      press = undefined;
    },

    onKeyDown(event) {
      const steps = keySteps(event.key);
      if (steps !== 0) {
        event.preventDefault();
        set(stepValue(options.value(), steps, options.range()));
      }
    },

    onWheel(event) {
      // Only if focused, otherwise scrolling the page can accidentally move a control
      if (document.activeElement !== event.currentTarget || event.deltaY === 0) {
        return;
      }
      event.preventDefault();
      set(stepValue(options.value(), -Math.sign(event.deltaY), options.range()));
    },
  };
}
