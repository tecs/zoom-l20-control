// Pointer, key and wheel handling shared by the value controls

import type { Accessor, JSX } from 'solid-js';
import { FINE_SCALE, TapTracker, ValueDrag, keySteps, sidewaysScale, stepValue, type Range } from '../../lib/drag.ts';

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
const SNAP_PX = 16;
/** Detent hold time at fast drag speeds */
const SNAP_MS = 100;
const MAX_SNAP_PX = 64;
/** Max tap pointer travel */
const TAP_PX = 4;
const DOUBLE_TAP_MS = 300;

export function valueGesture(options: ValueGestureOptions): ValueGestureHandlers {
  const taps = new TapTracker({ tapPx: TAP_PX, doubleTapMs: DOUBLE_TAP_MS });
  let drag: ValueDrag | undefined;

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
      snapMs: SNAP_MS,
      maxSnapPx: MAX_SNAP_PX,
    });

  return {
    onPointerDown(event) {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus();
      taps.down(event.clientX, event.clientY);
      drag = undefined;
    },

    onPointerMove(event) {
      const offset = taps.move(event.clientX, event.clientY);
      if (!offset) {
        return;
      }
      drag ??= startDrag(event, options.travel(event.currentTarget));
      const scale = event.shiftKey ? FINE_SCALE : sidewaysScale(offset.x);
      set(drag.move(-event.clientY, scale, event.timeStamp));
    },

    onPointerUp(event) {
      drag = undefined;
      if (taps.up(event.timeStamp) === 'double') {
        set(options.resetValue());
      }
    },

    onPointerCancel() {
      taps.cancel();
      drag = undefined;
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
