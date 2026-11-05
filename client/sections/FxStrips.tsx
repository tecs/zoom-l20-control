import { For, createEffect, type Accessor } from 'solid-js';
import { LAYOUT, rangeOf } from '../../core/protocol/registry.ts';
import { FX_DESCRIPTIONS, fxKnob, fxKnobDefault, type FxKnobSpec } from '../../core/protocol/fxeffects.ts';
import { FX_NAMES, defaultValue } from '../../core/protocol/meta.ts';
import { formatValue } from '../../core/format.ts';
import { meterFrame } from '../bridge.ts';
import { fxFaceBindings, fxPanelBindings, type FxFaceBindings, type FxPanelBindings, type RW } from '../bindings.ts';
import { useApp } from '../context.ts';
import { Meter, type Peaks } from '../components/Meter.tsx';
import { Fader } from '../components/Fader.tsx';
import { Toggle } from '../components/Toggle.tsx';
import type { ChannelMeter } from '../../core/messaging/meters.ts';

type FxStripProps = {
  index: number;
  bindings: FxFaceBindings;
  mix: Accessor<number>;
  meter: Accessor<ChannelMeter | undefined>;
  openFx: (index: number) => void;
  peaks: Peaks;
};

type FxStripsProps = {
  mix: Accessor<number>;
  openFx: (index: number) => void;
  peaks: Peaks;
};

type FxKnobProps = {
  index: number;
  knob: 'tone' | 'decay';
  rw: RW<number>;
  effect: Accessor<number>;
};

type FxPanelProps = {
  index: number;
  bindings: FxPanelBindings;
  open: Accessor<number | null>;
};

type FxDetailProps = {
  open: Accessor<number | null>;
  onClose: () => void;
};

function FxStrip(props: FxStripProps) {
  const setValue = (value: number): void => props.bindings.sends[props.mix()]?.[1](value);
  const value = (): number => {
    const mix = props.mix();
    return props.bindings.sends[mix]?.[0]() ?? defaultValue(props.bindings.send(mix));
  };
  const readout = (): string => formatValue(props.bindings.send(props.mix()), value(), true);
  // Per-mix, so a monitor send with a different range would just work
  const range = (): { min: number; max: number } => rangeOf(props.bindings.send(props.mix()));

  return (
    <div class="strip fx">
      <div class="lbl">{FX_NAMES[props.index]}</div>
      <Meter meter={props.meter} bars={4} peaks={props.peaks} />
      <Fader value={value} onInput={setValue} min={range().min} max={range().max} />
      <div class="strip-readout">{readout()}</div>
      <Toggle
        active={props.bindings.mute[0]}
        onClick={() => props.bindings.mute[1](!props.bindings.mute[0]())}
        label="M"
      />
      <Toggle
        active={props.bindings.solo[0]}
        onClick={() => props.bindings.solo[1](!props.bindings.solo[0]())}
        label="S"
        additionalClasses="solo"
      />
      <button type="button" class="edit" onClick={() => props.openFx(props.index)}>
        ⋯
      </button>
    </div>
  );
}

export function FxStrips(props: FxStripsProps) {
  const { store, meters } = useApp();
  const frame = meterFrame(meters);

  return (
    <div id="fxstrips">
      <For each={LAYOUT.fxStrips}>
        {(index) => {
          const bindings = fxFaceBindings(store, index); // intentionally hoisted, so they are passed by value

          return (
            <FxStrip
              index={index}
              bindings={bindings}
              mix={props.mix}
              meter={() => frame()?.fx[index]}
              openFx={props.openFx}
              peaks={props.peaks}
            />
          );
        }}
      </For>
    </div>
  );
}

function FxKnob(props: FxKnobProps) {
  const getValue = (): number =>
    props.rw[0]() ?? fxKnobDefault(props.index, props.effect(), props.knob) ?? spec().wire[0];
  const setValue = (value: number): void => props.rw[1](value);

  // These are driven by local props rather than desk echo, so that feedback is instant.
  const spec = (): FxKnobSpec => fxKnob(props.index, props.effect(), props.knob);
  const getMin = (): number => spec().wire[0];
  const getMax = (): number => spec().wire[1];
  const label = (): string => spec().label;

  const readout = (): string => {
    const value = getValue();
    const [displayMin, displayMax] = spec().display;
    const unit = label() === 'Time' ? ' ms' : '';
    const min = getMin();
    const shown = displayMin + ((value - min) * (displayMax - displayMin)) / (getMax() - min);
    return `${Math.round(shown)}${unit}`;
  };

  return (
    <div class="range-ctrl">
      <span class="ctrl-label">{label()}</span>
      <input
        type="range"
        class="slider"
        min={String(getMin())}
        max={String(getMax())}
        value={getValue()}
        onInput={(e) => setValue(Number(e.currentTarget.value))}
      />
      <span class="readout">{readout()}</span>
    </div>
  );
}

/** Effect selector + description +  knobs */
function FxPanel(props: FxPanelProps) {
  const effect = (): number => props.bindings.effect[0]() ?? 0;
  const setEffect = (value: number): void => props.bindings.effect[1](value);
  const description = (): string => FX_DESCRIPTIONS[props.index]?.[effect()] ?? '';

  return (
    <div class="detail-panel" hidden={props.open() !== props.index}>
      <div class="fx-effect-col">
        <div class="range-ctrl">
          <span class="ctrl-label">Effect</span>
          <select class="sel" value={String(effect())} onChange={(e) => setEffect(Number(e.currentTarget.value))}>
            <For each={props.bindings.labels}>
              {(name, index) => <option value={String(index())}>{`${index()}: ${name}`}</option>}
            </For>
          </select>
        </div>
        <div class="fx-desc">{description()}</div>
      </div>
      <FxKnob index={props.index} knob="tone" rw={props.bindings.tone} effect={effect} />
      <FxKnob index={props.index} knob="decay" rw={props.bindings.decay} effect={effect} />
    </div>
  );
}

export function FxDetail(props: FxDetailProps) {
  const { store } = useApp();
  let dialogEl!: HTMLDialogElement;

  createEffect(() => {
    const index = props.open();
    if (index === null) {
      if (dialogEl.open) {
        dialogEl.close();
      }
    } else if (!dialogEl.open) {
      dialogEl.showModal();
    }
  });

  const title = (): string => {
    const index = props.open();
    return index === null ? 'FX' : (FX_NAMES[index] ?? 'FX');
  };

  return (
    <dialog class="modal" ref={dialogEl} onClose={() => props.onClose()}>
      <div class="detail-head">
        <strong>{title()}</strong>
        <button type="button" onClick={() => props.onClose()}>
          Close
        </button>
      </div>
      <For each={LAYOUT.fxStrips}>
        {(index) => {
          const bindings = fxPanelBindings(store, index); // intentionally hoisted, so they are passed by value
          return <FxPanel index={index} bindings={bindings} open={props.open} />;
        }}
      </For>
    </dialog>
  );
}
