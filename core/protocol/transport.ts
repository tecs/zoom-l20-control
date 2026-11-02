import type { ShortMessage } from './midi.ts';

export const TRANSPORT = { STOP: 0x00, PLAY: 0x01, PAUSE: 0x02, REC_ARMED: 0x03, RECORDING: 0x05 } as const;

export type PlayheadField = 'hHi' | 'hLo' | 'm' | 's';

export type TransportMessage =
  | { kind: 'state'; value: number }
  | { kind: 'overdub'; value: boolean }
  | { kind: 'mode'; value: number }
  | { kind: 'playhead'; field: PlayheadField; value: number }
  | { kind: 'other' };

export const TRANSPORT_BTN = {
  REC: 0xb9,
  PLAY_PAUSE: 0xba,
  STOP: 0xbb,
  REWIND: 0xbc,
  FF: 0xbd,
  OVERDUB: 0xbe,
} as const;

export const transportPress = (status: number): ShortMessage => ({
  status,
  d1: 0x57,
  d2: 0x03,
});

export const transportHold = (status: number, down: boolean): ShortMessage => ({
  status,
  d1: 0x57,
  d2: down ? 0x05 : 0x04,
});

export function parseTransport({ status, d1, d2 }: ShortMessage): TransportMessage | null {
  const channel = status & 0x0f;

  // state family
  if (d1 === 0x57 && channel >= 8) {
    if (channel === 8) return { kind: 'state', value: d2 };
    if (channel === 14) return { kind: 'overdub', value: d2 !== 0 };
    if (channel === 15) return { kind: 'mode', value: d2 };
    return { kind: 'other' };
  }

  // playhead
  if (d1 === 0x58 && channel !== 2 && channel !== 3) {
    if (channel === 8) return { kind: 'playhead', field: 'hHi', value: d2 };
    if (channel === 9) return { kind: 'playhead', field: 'hLo', value: d2 };
    if (channel === 10) return { kind: 'playhead', field: 'm', value: d2 };
    if (channel === 11) return { kind: 'playhead', field: 's', value: d2 };
    return { kind: 'other' };
  }

  return null;
}
