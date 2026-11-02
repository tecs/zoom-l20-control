import { For, type Accessor } from 'solid-js';
import { LAYOUT, P, rangeOf } from '../../core/protocol/registry.ts';
import { GEQ_FREQS } from '../../core/protocol/meta.ts';
import { formatValue } from '../../core/format.ts';
import { fieldRW } from '../bridge.ts';
import { useApp } from '../context.ts';
import { sleep } from '../infra/timers.ts';

const FLAT = 0x1e; // 30 = 0 dB

type BandSliderProps = {
  path: string;
  label: string;
  rw: [Accessor<number | undefined>, (value: number) => void];
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
  const raw = (): number => props.rw[0]() ?? range().min;
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

export function Geq() {
  const { store } = useApp();
  const bands = LAYOUT.geqBands.map((n) => fieldRW<number>(store, P.geq.band(n)));
  const flat = async (): Promise<void> => {
    for (const [, set] of bands) {
      set(FLAT);
      // Space out each set(), so the desk doesn't drop commands
      await sleep(15);
    }
  };

  return (
    <div id="geq">
      <div class="geq-head">
        <span class="out-title">Graphic EQ</span>
        <OnToggle />
        <button type="button" onClick={flat}>
          Flat
        </button>
      </div>
      <div class="geq-bands">
        <For each={bands}>{(rw, n) => <BandSlider path={P.geq.band(n())} label={GEQ_FREQS[n()]} rw={rw} />}</For>
      </div>
    </div>
  );
}
