import type { Accessor } from 'solid-js';

type FaderProps = {
  value: Accessor<number>;
  onInput(value: number): void;
  min: number;
  max: number;
};

export const Fader = (props: FaderProps) => (
  <input
    type="range"
    min={props.min}
    max={props.max}
    value={props.value()}
    onInput={(e) => props.onInput(Number(e.currentTarget.value))}
  />
);
