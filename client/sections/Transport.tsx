import { TRANSPORT, TRANSPORT_BTN, transportPress, transportHold } from '../../core/protocol/transport.ts';
import { observed } from '../bridge.ts';
import { useApp } from '../context.ts';
import type { ShortMessage } from '../../core/protocol/midi.ts';

const zeroPad = (value: number, digits: number): string => String(value).padStart(digits, '0');

type TransportProps = {
  send: (message: ShortMessage) => void;
};

type HoldButtonProps = TransportProps & {
  label: string;
  status: number;
};

function HoldButton(props: HoldButtonProps) {
  let down = false;
  const set = (state: boolean): void => {
    if (down !== state) {
      down = state;
      props.send(transportHold(props.status, state));
    }
  };

  return (
    <button
      type="button"
      title={props.label}
      onPointerDown={() => set(true)}
      onPointerUp={() => set(false)}
      onPointerLeave={() => set(false)}
      onPointerCancel={() => set(false)}
    >
      {props.label}
    </button>
  );
}

export function Transport(props: TransportProps) {
  const { transportState } = useApp();
  const stateData = observed(
    () => ({
      state: transportState.state,
      overdub: transportState.overdub,
      playhead: transportState.playhead,
    }),
    (notify) => transportState.subscribe(notify),
  );

  const press = (status: number) => props.send(transportPress(status));

  const time = (): string => {
    const { h, m, s } = stateData().playhead;
    return `${zeroPad(h, 3)}:${zeroPad(m, 2)}:${zeroPad(s, 2)}`;
  };

  const playOn = (): boolean => {
    const { state } = stateData();
    return state === TRANSPORT.PLAY || state === TRANSPORT.PAUSE || state === TRANSPORT.RECORDING;
  };

  const recOn = (): boolean => {
    const { state } = stateData();
    return state === TRANSPORT.REC_ARMED || state === TRANSPORT.RECORDING;
  };

  return (
    <div id="transport">
      <span class="transport-time">{time()}</span>
      <HoldButton label="⏮" status={TRANSPORT_BTN.REWIND} send={props.send} />
      <button type="button" title="⏹" onClick={() => press(TRANSPORT_BTN.STOP)}>
        ⏹
      </button>
      <button
        type="button"
        class="toggle"
        classList={{ on: playOn() }}
        title="⏯"
        onClick={() => press(TRANSPORT_BTN.PLAY_PAUSE)}
      >
        ⏯
      </button>
      <button type="button" class="rec" classList={{ on: recOn() }} title="⏺" onClick={() => press(TRANSPORT_BTN.REC)}>
        ⏺
      </button>
      <HoldButton label="⏭" status={TRANSPORT_BTN.FF} send={props.send} />
      <button
        type="button"
        class="toggle"
        classList={{ on: stateData().overdub }}
        title="OVERDUB"
        onClick={() => press(TRANSPORT_BTN.OVERDUB)}
      >
        OVERDUB
      </button>
    </div>
  );
}
