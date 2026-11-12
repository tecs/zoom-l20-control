import type { Accessor } from 'solid-js';
import { rangeOf } from '../../core/protocol/registry.ts';
import { defaultValue, metaFor } from '../../core/protocol/meta.ts';
import { valueGesture } from './valueGesture.ts';

type FaderProps = {
  path: Accessor<string>;
  value: Accessor<number>;
  onInput(value: number): void;
  label: string;
  valueText: Accessor<string>;
};

export function Fader(props: FaderProps) {
  const range = () => rangeOf(props.path());
  const percent = (): number => {
    const { min, max } = range();
    return ((props.value() - min) * 100) / (max - min);
  };

  const gesture = valueGesture({
    value: () => props.value(),
    range,
    snaps: () => {
      const unity = metaFor(props.path())?.unity;
      return unity === undefined ? [] : [unity];
    },
    resetValue: () => defaultValue(props.path()),
    travel: (element) => element.clientHeight,
    onInput: (value) => props.onInput(value),
  });

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
      onPointerDown={gesture.onPointerDown}
      onPointerMove={gesture.onPointerMove}
      onPointerUp={gesture.onPointerUp}
      onPointerCancel={gesture.onPointerCancel}
      onKeyDown={gesture.onKeyDown}
      onWheel={gesture.onWheel}
    >
      <div class="fader-track" />
      <div class="fader-thumb" style={{ bottom: `${percent()}%` }} />
    </div>
  );
}
