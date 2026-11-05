import { LAYOUT } from '../protocol/registry.ts';
import { COMMAND, isZoomSysex } from '../protocol/sysex.ts';

export interface ChannelMeter {
  pre: number[];
  post: number[];
}

export interface MeterFrame {
  mix: number;
  channels: ChannelMeter[];
  fx: ChannelMeter[];
  master: { left: number; right: number };
}

const METERS = 0x04; // Event subtype
const MIX = 6;
const PRE_BASE = 7;
const POST_BASE = 31;
const MASTER_BASE = POST_BASE + 24;
const FS_MONO = 44;
const FS_STEREO = 12;

const normalize = (raw: number, fs: number): number => Math.min(1, raw / fs);

const byteAt = (data: Uint8Array, index: number): number => data[index] ?? 0;

const makeMeterRegion = (data: Uint8Array, base: number, offset: number, stereo: boolean): number[] =>
  stereo
    ? [normalize(byteAt(data, base + offset), FS_STEREO), normalize(byteAt(data, base + offset + 1), FS_STEREO)]
    : [normalize(byteAt(data, base + offset), FS_MONO)];

const makeMeter = (data: Uint8Array, offset: number, stereo: boolean): ChannelMeter => ({
  pre: makeMeterRegion(data, PRE_BASE, offset, stereo),
  post: makeMeterRegion(data, POST_BASE, offset, stereo),
});

export function decodeMeterFrame(data: Uint8Array): MeterFrame | null {
  const [, , , , command, subtype] = data;
  if (!isZoomSysex(data) || command !== COMMAND.EVENT || subtype !== METERS) {
    // not a meter frame
    return null;
  }

  const channels: ChannelMeter[] = [];
  const fx: ChannelMeter[] = [];
  const [left = 0, right = 0] = makeMeterRegion(data, MASTER_BASE, 0, true);

  for (const strip of LAYOUT.monoStrips) {
    channels.push(makeMeter(data, strip, false));
  }

  for (const strip of LAYOUT.stereoStripsWithOffset) {
    channels.push(makeMeter(data, strip, true));
  }

  for (const strip of LAYOUT.fxStripsWithOffset) {
    fx.push(makeMeter(data, strip, true));
  }
  return { mix: byteAt(data, MIX), channels, fx, master: { left, right } };
}
