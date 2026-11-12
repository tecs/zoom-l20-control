import type { Accessor } from 'solid-js';
import type { Range } from '../../lib/drag.ts';
import { valueGesture } from './valueGesture.ts';

type KnobProps = {
  value: Accessor<number>;
  range: Accessor<Range>;
  /** Double-tap target */
  resetValue: Accessor<number>;
  snaps?: Accessor<readonly number[]>;
  origin?: number | undefined;
  onInput(value: number): void;
  label: string;
  valueText: Accessor<string>;
};

/** Vertical pointer travel for the full range, the height of a fader */
const TRAVEL_PX = 120;
/** Sweep from min to max, centred on 12 o'clock */
const SWEEP_DEG = 270;
const SIZE = 36;
const RADIUS = 14;
const CENTER = SIZE / 2;

/** Arc point at an angle clockwise from 12 o'clock */
const pointAt = (deg: number): string => {
  const rad = (deg * Math.PI) / 180;
  return `${CENTER + RADIUS * Math.sin(rad)} ${CENTER - RADIUS * Math.cos(rad)}`;
};

const ARC = `M ${pointAt(-SWEEP_DEG / 2)} A ${RADIUS} ${RADIUS} 0 1 1 ${pointAt(SWEEP_DEG / 2)}`;

export function Knob(props: KnobProps) {
  const fractionOf = (value: number): number => {
    const { min, max } = props.range();
    return (value - min) / (max - min);
  };
  const fraction = (): number => fractionOf(props.value());

  const valueArc = (): { start: number; length: number } => {
    const origin = fractionOf(props.origin ?? props.range().min);
    const value = fraction();
    return { start: Math.min(origin, value) * 100, length: Math.abs(value - origin) * 100 };
  };

  const gesture = valueGesture({
    value: () => props.value(),
    range: () => props.range(),
    snaps: () => props.snaps?.() ?? [],
    resetValue: () => props.resetValue(),
    travel: () => TRAVEL_PX,
    onInput: (value) => props.onInput(value),
  });

  return (
    <div
      class="knob"
      role="slider"
      tabindex="0"
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemin={props.range().min}
      aria-valuemax={props.range().max}
      aria-valuenow={props.value()}
      aria-valuetext={props.valueText()}
      onPointerDown={gesture.onPointerDown}
      onPointerMove={gesture.onPointerMove}
      onPointerUp={gesture.onPointerUp}
      onPointerCancel={gesture.onPointerCancel}
      onKeyDown={gesture.onKeyDown}
      onWheel={gesture.onWheel}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
        <path class="knob-track" d={ARC} pathLength="100" />
        <path
          class="knob-value"
          d={ARC}
          pathLength="100"
          stroke-dasharray={`${valueArc().length} 100`}
          stroke-dashoffset={-valueArc().start}
        />
        <line
          class="knob-pointer"
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - RADIUS + 3}
          transform={`rotate(${(fraction() - 0.5) * SWEEP_DEG} ${CENTER} ${CENTER})`}
        />
      </svg>
    </div>
  );
}
