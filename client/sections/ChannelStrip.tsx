import type { Accessor } from 'solid-js';
import type { ChannelMeter } from '../../core/messaging/meters.ts';
import { rangeOf } from '../../core/protocol/registry.ts';
import { STRIP_NAMES, defaultValue } from '../../core/protocol/meta.ts';
import { formatValue } from '../../core/format.ts';
import type { StripBindings } from '../bindings.ts';
import { Meter, type Peaks } from '../components/Meter.tsx';
import { Fader } from '../components/Fader.tsx';
import { Toggle } from '../components/Toggle.tsx';

type ChannelStripProps = {
  index: number;
  bindings: StripBindings;
  mix: Accessor<number>;
  meter: Accessor<ChannelMeter | undefined>;
  stereo: boolean;
  openDetail(index: number): void;
  peaks: Peaks;
};

export function ChannelStrip(props: ChannelStripProps) {
  const value = (): number => {
    const mix = props.mix();
    return props.bindings.sends[mix]?.[0]() ?? defaultValue(props.bindings.send(mix));
  };

  const setValue = (val: number): void => props.bindings.sends[props.mix()]?.[1](val);
  const readout = (): string => formatValue(props.bindings.send(props.mix()), value(), true);
  const range = (): { min: number; max: number } => rangeOf(props.bindings.send(props.mix()));

  return (
    <div classList={{ strip: true, stereo: props.stereo }}>
      <div class="lbl">{props.bindings.name() || STRIP_NAMES[props.index]}</div>
      <Meter meter={props.meter} bars={props.stereo ? 4 : 2} peaks={props.peaks} />
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
      <button type="button" class="edit" onClick={() => props.openDetail(props.index)}>
        ⋯
      </button>
    </div>
  );
}
