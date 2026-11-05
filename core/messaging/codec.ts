// Turns incoming MIDI into state updates and outgoing field changes into commands

import { REGISTRY, BY_PATH, type Descriptor } from '../protocol/registry.ts';
import { assertNever, type Value } from '../protocol/valuetypes.ts';
import { channelOf, type ShortMessage } from '../protocol/midi.ts';

export interface DecodeResult {
  path: string;
  value: Value;
}

type RxEntry = {
  field: Descriptor;
  part?: 'msb' | 'lsb';
};

/** 14-bit reassembly buffer */
export type Pair = Record<string, { msb: number; lsb: number }>;

const keyOf = (status: number, ctrl: number): number => (channelOf(status) << 8) | ctrl;

/** Reverse index for live decode */
export const RX = new Map<number, RxEntry>();
for (const field of REGISTRY) {
  const { live } = field;
  if (!live) {
    continue;
  }

  switch (live.enc) {
    case 'cc':
      RX.set(keyOf(live.status, live.ctrl), { field });
      break;
    case 'cc14':
      RX.set(keyOf(live.msbStatus, live.ctrl), { field, part: 'msb' });
      RX.set(keyOf(live.lsbStatus, live.ctrl), { field, part: 'lsb' });
      break;
    default:
      assertNever(live);
  }
}

export function decodeCC({ status, d1, d2 }: ShortMessage, pair: Pair): DecodeResult | null {
  const hit = RX.get(keyOf(status, d1));
  if (!hit) {
    return null;
  }

  const { field, part } = hit;
  if (!part) {
    return { path: field.path, value: field.type.decode([d2]) };
  }
  const st = (pair[field.path] ??= { msb: 0, lsb: 0 });
  st[part] = d2;
  return { path: field.path, value: field.type.decode([st.msb, st.lsb]) };
}

export function encodeField(path: string, value: Value): ShortMessage[] {
  const field = BY_PATH.get(path);
  if (!field?.live) {
    return [];
  }

  const { live } = field;
  const bytes = (field.type.encode as (v: Value) => number[])(value);

  switch (live.enc) {
    case 'cc': {
      const [byte = 0] = bytes;
      return [{ status: live.status, d1: live.ctrl, d2: byte }];
    }
    case 'cc14': {
      const [msb = 0, lsb = 0] = bytes;
      return [
        { status: live.msbStatus, d1: live.ctrl, d2: msb },
        { status: live.lsbStatus, d1: live.ctrl, d2: lsb },
      ];
    }
    default:
      return assertNever(live);
  }
}
