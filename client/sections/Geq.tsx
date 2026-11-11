import { For, createEffect, type Accessor } from 'solid-js';
import { EQ_GAIN_FLAT, LAYOUT, P, rangeOf } from '../../core/protocol/registry.ts';
import { GEQ_FREQS, defaultValue } from '../../core/protocol/meta.ts';
import { formatValue } from '../../core/format.ts';
import { fieldRW } from '../bridge.ts';
import { useApp } from '../context.ts';

type BandSliderProps = {
  path: string;
  label: string;
  rw: [Accessor<number | undefined>, (value: number) => void];
};

type GeqProps = {
  open: Accessor<boolean>;
  onClose: () => void;
};

function OnToggle() {
  const { store } = useApp();
  const [on, setOn] = fieldRW<boolean>(store, P.geq.on);
  return (
    <button type="button" class="toggle" classList={{ on: !!on() }} onClick={() => setOn(!on())}>
      On
    </button>
  );
}

function BandSlider(props: BandSliderProps) {
  const range = (): { min: number; max: number } => rangeOf(props.path);
  const raw = (): number => props.rw[0]() ?? defaultValue(props.path);
  return (
    <div class="range-ctrl">
      <span class="ctrl-label">{props.label}</span>
      <input
        type="range"
        class="slider compact"
        min={range().min}
        max={range().max}
        value={raw()}
        onInput={(e) => props.rw[1](Number(e.currentTarget.value))}
      />
      <span class="readout">{formatValue(props.path, raw(), true)}</span>
    </div>
  );
}

export function Geq(props: GeqProps) {
  const { store } = useApp();
  let dialogEl!: HTMLDialogElement;
  const bands = LAYOUT.geqBands.map((n) => fieldRW<number>(store, P.geq.band(n)));
  const flat = (): void => {
    for (const [, set] of bands) {
      set(EQ_GAIN_FLAT);
    }
  };

  createEffect(() => {
    if (!props.open()) {
      if (dialogEl.open) {
        dialogEl.close();
      }
    } else if (!dialogEl.open) {
      dialogEl.showModal();
    }
  });

  return (
    <dialog class="modal" id="geq" ref={dialogEl} onClose={() => props.onClose()}>
      <div class="detail-head">
        <div class="geq-head">
          <strong>Graphic EQ</strong>
          <OnToggle />
          <button type="button" onClick={flat}>
            Flat
          </button>
        </div>
        <button type="button" onClick={() => props.onClose()}>
          Close
        </button>
      </div>
      <div class="geq-bands">
        <For each={bands}>{(rw, n) => <BandSlider path={P.geq.band(n())} label={GEQ_FREQS[n()] ?? ''} rw={rw} />}</For>
      </div>
    </dialog>
  );
}
