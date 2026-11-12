import { For } from 'solid-js';
import { P, MIX_LABELS, LAYOUT } from '../../core/protocol/registry.ts';
import { defaultValue } from '../../core/protocol/meta.ts';
import { formatValue } from '../../core/format.ts';
import { fieldRW } from '../bridge.ts';
import { useApp } from '../context.ts';
import { Fader } from '../components/Fader.tsx';

export function Outputs() {
  const { store } = useApp();

  const monitorLabels = MIX_LABELS.slice(-LAYOUT.monitors)
    .map((label) => label.replace('MON ', ''))
    .entries();

  return (
    <div id="outputs">
      <div class="out-group">
        <div class="out-title">Monitors</div>
        <div class="out-body">
          <For each={[...monitorLabels]}>
            {([index, label]) => {
              const path = P.monitor(index).level;
              const [level, setLevel] = fieldRW<number>(store, path);
              const value = (): number => level() ?? defaultValue(path);
              return (
                <div class="range-ctrl">
                  <span class="ctrl-label">{label}</span>
                  <Fader
                    path={() => path}
                    value={value}
                    onInput={setLevel}
                    label={`Monitor ${label}`}
                    valueText={() => formatValue(path, value())}
                  />
                  <span class="readout">{formatValue(path, value(), true)}</span>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
