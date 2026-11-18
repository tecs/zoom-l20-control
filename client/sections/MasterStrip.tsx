import type { ChannelMeter } from '../../core/messaging/meters.ts';
import { P } from '../../core/protocol/registry.ts';
import { formatValue, parseValue } from '../../core/format.ts';
import { Readout } from '../components/Readout.tsx';
import { defaultValue } from '../../core/protocol/meta.ts';
import { fieldRW, meterFrame, modified } from '../bridge.ts';
import { useApp } from '../context.ts';
import { Meter, type Peaks } from '../components/Meter.tsx';
import { Fader } from '../components/Fader.tsx';
import { Toggle } from '../components/Toggle.tsx';
import { makeRecButton } from '../components/Control.tsx';

type MasterStripProps = {
  peaks: Peaks;
  openGeq: () => void;
};

export function MasterStrip(props: MasterStripProps) {
  const { store, meters } = useApp();
  const frame = meterFrame(meters);
  const [level, setLevel] = fieldRW<number>(store, P.master.level);
  const [muted, setMuted] = fieldRW<boolean>(store, P.master.mute);
  const recButton = makeRecButton(store, P.master.rec);
  const geqOn = modified(store, [P.geq.on]);

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
      <Readout
        class="strip-readout"
        text={() => formatValue(P.master.level, value(), true)}
        parse={(text) => parseValue(P.master.level, text)}
        onInput={setLevel}
        label="Master"
        name={P.master.level}
      />
      <Toggle active={muted} onClick={() => setMuted(!muted())} label="M" />
      {recButton}
      <button
        type="button"
        class="geq"
        classList={{ on: geqOn() }}
        title={geqOn() ? 'Graphic EQ (on)' : 'Graphic EQ (off)'}
        onClick={() => props.openGeq()}
      >
        GEQ
      </button>
    </div>
  );
}
