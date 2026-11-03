import { For, type Accessor } from 'solid-js';
import { LAYOUT } from '../../core/protocol/registry.ts';
import { meterFrame } from '../bridge.ts';
import { stripBindings } from '../bindings.ts';
import { useApp } from '../context.ts';
import { ChannelStrip } from './ChannelStrip.tsx';
import type { Peaks } from '../components/Meter.tsx';

type StripsProps = {
  mix: Accessor<number>;
  openDetail: (index: number) => void;
  peaks: Peaks;
};

export function Strips(props: StripsProps) {
  const { store, meters } = useApp();
  const frame = meterFrame(meters);
  const indices = [...LAYOUT.monoStrips, ...LAYOUT.stereoStrips];
  return (
    <div id="strips">
      <For each={indices}>
        {(index) => {
          const bindings = stripBindings(store, index); // intentionally hoisted, so they are passed by value
          return (
            <ChannelStrip
              index={index}
              bindings={bindings}
              mix={props.mix}
              meter={() => frame()?.channels[index]}
              stereo={LAYOUT.stereoStrips.includes(index)}
              openDetail={props.openDetail}
              peaks={props.peaks}
            />
          );
        }}
      </For>
    </div>
  );
}
