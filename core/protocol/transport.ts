import { BUTTON_VALUE, buttonIndex, buttonMessage } from './buttons.ts';
import { channelOf, type ShortMessage } from './midi.ts';

export const TRANSPORT = { STOP: 0x00, PLAY: 0x01, PAUSE: 0x02, REC_ARMED: 0x03, RECORDING: 0x05 } as const;

export type PlayheadField = 'hHi' | 'hLo' | 'm' | 's';

export type TransportMessage =
  | { kind: 'state'; value: number }
  | { kind: 'overdub'; value: boolean }
  | { kind: 'mode'; value: number }
  | { kind: 'playhead'; field: PlayheadField; value: number }
  | { kind: 'other' };

/** Button indices */
export const TRANSPORT_BTN = {
  REC: 25,
  PLAY_PAUSE: 26,
  STOP: 27,
  REWIND: 28,
  FF: 29,
  OVERDUB: 30,
} as const;

// Transport button space
const FIRST_INDEX = 24;
const LAST_INDEX = 31;
const STATE_INDEX = 24;
const MODE_INDEX = 31;

const PLAYHEAD_CTRL = 0x58;

export const transportHold = (index: number, down: boolean): ShortMessage =>
  buttonMessage(index, down ? BUTTON_VALUE.HOLD_DOWN : BUTTON_VALUE.HOLD_UP);

export function parseTransport(message: ShortMessage): TransportMessage | null {
  const { status, d1, d2 } = message;
  const channel = channelOf(status);

  const index = buttonIndex(message);
  if (index !== null && index >= FIRST_INDEX && index <= LAST_INDEX) {
    if (index === STATE_INDEX) {
      return { kind: 'state', value: d2 };
    }

    if (index === TRANSPORT_BTN.OVERDUB) {
      return { kind: 'overdub', value: d2 !== 0 };
    }

    if (index === MODE_INDEX) {
      return { kind: 'mode', value: d2 };
    }

    return { kind: 'other' };
  }

  // playhead
  if (d1 === PLAYHEAD_CTRL && channel !== 2 && channel !== 3) {
    if (channel === 8) return { kind: 'playhead', field: 'hHi', value: d2 };
    if (channel === 9) return { kind: 'playhead', field: 'hLo', value: d2 };
    if (channel === 10) return { kind: 'playhead', field: 'm', value: d2 };
    if (channel === 11) return { kind: 'playhead', field: 's', value: d2 };
    return { kind: 'other' };
  }

  return null;
}
