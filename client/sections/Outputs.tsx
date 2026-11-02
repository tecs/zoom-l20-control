import { For } from 'solid-js';
import { P, MIX_LABELS, LAYOUT } from '../../core/protocol/registry.ts';
import { useApp } from '../context.ts';
import { makeControl } from '../components/Control.tsx';

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
            {([index, label]) => makeControl(store, P.monitor(index).level, { label })}
          </For>
        </div>
      </div>
    </div>
  );
}
