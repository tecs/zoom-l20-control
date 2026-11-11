import type { Accessor, JSX } from 'solid-js';
import { rangeOf } from '../../core/protocol/registry.ts';
import { defaultValue } from '../../core/protocol/meta.ts';
import { ValueDrag, keySteps, stepValue } from '../../lib/drag.ts';

type FaderProps = {
  path: Accessor<string>;
  value: Accessor<number>;
  onInput(value: number): void;
  label: string;
  valueText: Accessor<string>;
};

type PointerHandler = JSX.EventHandler<HTMLDivElement, PointerEvent>;

/** Max tap pointer travel */
const TAP_PX = 4;
const DOUBLE_TAP_MS = 300;

type Press = { x: number; y: number; drag: ValueDrag | undefined };

export function Fader(props: FaderProps) {
  let press: Press | undefined;
  let lastTapAt = -Infinity;

  const range = () => rangeOf(props.path());
  const percent = (): number => {
    const { min, max } = range();
    return ((props.value() - min) * 100) / (max - min);
  };

  const set = (value: number): void => {
    if (value !== props.value()) {
      props.onInput(value);
    }
  };

  const startDrag = (event: PointerEvent, height: number): ValueDrag =>
    new ValueDrag(props.value(), -event.clientY, range(), { travel: height });

  const onPointerDown: PointerHandler = (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    press = { x: event.clientX, y: event.clientY, drag: undefined };
  };

  const onPointerMove: PointerHandler = (event) => {
    if (!press) {
      return;
    }
    if (!press.drag) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= TAP_PX) {
        return;
      }
      press.drag = startDrag(event, event.currentTarget.clientHeight);
    }
    set(press.drag.move(-event.clientY));
  };

  const onPointerUp: PointerHandler = (event) => {
    const tap = press && !press.drag;
    press = undefined;
    if (!tap) {
      return;
    }
    // Reset to default on double tap
    if (event.timeStamp - lastTapAt < DOUBLE_TAP_MS) {
      lastTapAt = -Infinity;
      set(defaultValue(props.path()));
    } else {
      lastTapAt = event.timeStamp;
    }
  };

  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const steps = keySteps(event.key);
    if (steps !== 0) {
      event.preventDefault();
      set(stepValue(props.value(), steps, range()));
    }
  };

  const onWheel: JSX.EventHandler<HTMLDivElement, WheelEvent> = (event) => {
    // Only if focused, otherwise scrolling the page can accidentally move a fader
    if (document.activeElement !== event.currentTarget || event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    set(stepValue(props.value(), -Math.sign(event.deltaY), range()));
  };

  return (
    <div
      class="fader"
      role="slider"
      tabindex="0"
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemin={range().min}
      aria-valuemax={range().max}
      aria-valuenow={props.value()}
      aria-valuetext={props.valueText()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (press = undefined)}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      <div class="fader-track" />
      <div class="fader-thumb" style={{ bottom: `${percent()}%` }} />
    </div>
  );
}
