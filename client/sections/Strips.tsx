import { For, type Accessor } from 'solid-js';
import { LAYOUT, P } from '../../core/protocol/registry.ts';
import { meterFrame, modified } from '../bridge.ts';
import { stripBindings } from '../bindings.ts';
import { useApp } from '../context.ts';
import { ChannelStrip } from './ChannelStrip.tsx';
import { DETAIL_KEYS } from './ChannelDetail.tsx';
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
          const paths = P.strip(index);
          const edited = modified(
            store,
            DETAIL_KEYS.map((key) => paths[key]),
          );
          return (
            <ChannelStrip
              index={index}
              bindings={bindings}
              edited={edited}
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
