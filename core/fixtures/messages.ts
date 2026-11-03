// Messages as the BLE-MIDI decoder hands them to the app, for tests

import type { MidiMessage } from '../messaging/blemidi.ts';

export const midi = (status: number, d1: number, d2: number): MidiMessage => ({
  type: 'midi',
  bytes: Uint8Array.of(status, d1, d2),
});

export const sysex = (...bytes: number[]): MidiMessage => ({ type: 'sysex', bytes: Uint8Array.from(bytes) });

const METER_POINTS = 24;
const padMeterPoints = (values: number[]): number[] =>
  Array.from({ length: METER_POINTS }, (_, index) => values[index] ?? 0);

/** A `31 04` meter frame */
export const meterFrame = (
  mix: number,
  pre: number[] = [],
  post: number[] = [],
  master: [left: number, right: number] = [0, 0],
): Uint8Array =>
  Uint8Array.from([
    0xf0,
    0x52,
    0x00,
    0x00,
    0x31,
    0x04,
    mix,
    ...padMeterPoints(pre),
    ...padMeterPoints(post),
    ...master,
    0xf7,
  ]);
