import { For, type Accessor } from 'solid-js';
import { LAYOUT, MIX_LABELS } from '../../core/protocol/registry.ts';

type MixSelectProps = {
  mix: Accessor<number>;
  setMix(mix: number): void;
};

export function MixSelect(props: MixSelectProps) {
  const mixes = [...Array(LAYOUT.mixes).keys()];
  return (
    <div id="mixselect">
      <For each={mixes}>
        {(mix) => (
          <button type="button" classList={{ sel: props.mix() === mix }} onClick={() => props.setMix(mix)}>
            {MIX_LABELS[mix]}
          </button>
        )}
      </For>
    </div>
  );
}
