import type { ChannelMeter } from '../../core/messaging/meters.ts';
import { P } from '../../core/protocol/registry.ts';
import { formatValue } from '../../core/format.ts';
import { defaultValue } from '../../core/protocol/meta.ts';
import { fieldRW, meterFrame } from '../bridge.ts';
import { useApp } from '../context.ts';
import { Meter, type Peaks } from '../components/Meter.tsx';
import { Fader } from '../components/Fader.tsx';
import { Toggle } from '../components/Toggle.tsx';
import { makeRecButton } from '../components/Control.tsx';

type MasterStripProps = {
  peaks: Peaks;
};

export function MasterStrip(props: MasterStripProps) {
  const { store, meters } = useApp();
  const frame = meterFrame(meters);
  const [level, setLevel] = fieldRW<number>(store, P.master.level);
  const [muted, setMuted] = fieldRW<boolean>(store, P.master.mute);
  const recButton = makeRecButton(store, P.master.rec);

  const meter = (): ChannelMeter | undefined => {
    const current = frame();
    if (!current) {
      return;
    }
    return { pre: [current.master.left, current.master.right], post: [] };
  };
  const value = (): number => level() ?? defaultValue(P.master.level);

  return (
    <div class="strip master">
      <div class="lbl">MASTER</div>
      <Meter meter={meter} bars={2} peaks={props.peaks} />
      <Fader
        path={() => P.master.level}
        value={value}
        onInput={setLevel}
        label="Master"
        valueText={() => formatValue(P.master.level, value())}
      />
      <div class="strip-readout">{formatValue(P.master.level, value(), true)}</div>
      <Toggle active={muted} onClick={() => setMuted(!muted())} label="M" />
      {recButton}
    </div>
  );
}
