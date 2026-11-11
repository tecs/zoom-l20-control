import type { Accessor, JSX } from 'solid-js';
import { rangeOf } from '../../core/protocol/registry.ts';
import { ValueDrag } from '../../lib/drag.ts';

type FaderProps = {
  path: Accessor<string>;
  value: Accessor<number>;
  onInput(value: number): void;
  label: string;
  valueText: Accessor<string>;
};

type PointerHandler = JSX.EventHandler<HTMLDivElement, PointerEvent>;
type Press = { x: number; y: number; drag: ValueDrag | undefined };

export function Fader(props: FaderProps) {
  let press: Press | undefined;

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
    press.drag ??= startDrag(event, event.currentTarget.clientHeight);
    set(press.drag.move(-event.clientY));
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
      onPointerUp={() => (press = undefined)}
      onPointerCancel={() => (press = undefined)}
    >
      <div class="fader-track" />
      <div class="fader-thumb" style={{ bottom: `${percent()}%` }} />
    </div>
  );
}
