// Factories for generic store-bound controls. Not meant to be used as components with reactive props

import { For, type JSX } from 'solid-js';
import type { Store } from '../../core/state/store.ts';
import { BY_PATH } from '../../core/protocol/registry.ts';
import { asPath, assertNever } from '../../core/protocol/valuetypes.ts';
import { formatValue } from '../../core/format.ts';
import { fieldRW } from '../bridge.ts';
import { Toggle } from './Toggle.tsx';
import { toClassList } from '../infra/jsx.ts';

export interface ControlOptions {
  label?: string;
  /** Readout without the unit suffix */
  bare?: boolean;
  additionalClasses?: string | undefined;
}

export function makeControl(store: Store, path: string, options: ControlOptions = {}): JSX.Element {
  const type = BY_PATH.get(path)?.type;
  if (!type) {
    throw new Error(`No registry field for '${path}'`);
  }
  const label = options.label ?? path;

  switch (type.kind) {
    case 'bool': {
      const [on, setOn] = fieldRW<boolean>(store, asPath<boolean>(path));
      return (
        <Toggle
          active={() => !!on()}
          onClick={() => setOn(!on())}
          label={label}
          additionalClasses={options.additionalClasses}
        />
      );
    }
    case 'enum': {
      const [value, setValue] = fieldRW<number>(store, asPath<number>(path));
      const labels = type.labels;
      return (
        <div class="range-ctrl">
          <span class="ctrl-label">{label}</span>
          <select class="sel" value={String(value() ?? 0)} onChange={(e) => setValue(Number(e.currentTarget.value))}>
            <For each={labels}>{(name, index) => <option value={String(index())}>{`${index()}: ${name}`}</option>}</For>
          </select>
        </div>
      );
    }
    case 'scalar':
    case 'u14': {
      const [value, setValue] = fieldRW<number>(store, asPath<number>(path));
      const { min, max } = type;
      return (
        <div class="range-ctrl">
          <span class="ctrl-label">{label}</span>
          <input
            type="range"
            class="slider compact"
            min={String(min)}
            max={String(max)}
            value={value() ?? min}
            onInput={(e) => setValue(Number(e.currentTarget.value))}
          />
          <span class="readout">{value() === undefined ? '' : formatValue(path, value()!, options.bare)}</span>
        </div>
      );
    }
    case 'str':
    case 'hms':
      throw new Error(`'${type.kind}' field '${path}' has no widget`);
    default:
      return assertNever(type);
  }
}

type RecState = {
  text: string;
  class: string;
  next: number;
};

const REC_STATES: RecState[] = [
  { text: 'Rec', class: '', next: 2 },
  { text: 'PLAY', class: 'play', next: 0 },
  { text: 'REC', class: 'rec', next: 1 },
];

export function makeRecButton(store: Store, path: string): JSX.Element {
  const [value, setValue] = fieldRW<number>(store, asPath<number>(path));
  const state = (): RecState => REC_STATES[value() ?? 0] ?? REC_STATES[0];

  return (
    <button
      type="button"
      class="rec-cycle"
      classList={toClassList(state().class)}
      onClick={() => setValue(state().next)}
    >
      {state().text}
    </button>
  );
}
