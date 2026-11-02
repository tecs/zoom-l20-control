// Central protocol mapping

import { bool, scalar, enumOf, u14, str, hms, asPath } from './valuetypes.ts';
import type { ValueType, Path, ValueOf } from './valuetypes.ts';

type StripControl = (typeof PER_STRIP)[number];
export type StripControlKey = StripControl[0];

export type AnyValueType = ValueType;
export type Tier = 'scene' | 'global' | 'ephemeral';
export type Live =
  { enc: 'cc'; status: number; ctrl: number } | { enc: 'cc14'; ctrl: number; msbStatus: number; lsbStatus: number };

export type StripPaths = {
  [K in StripControlKey]: Path<ValueOf<Extract<StripControl, readonly [K, ...unknown[]]>[2]>>;
} & {
  name: Path<string>;
  fader: Path<number>;
  send(mix: number): Path<number>;
};

export interface Descriptor {
  /** Dot-path into the state object (e.g `strips.5.sends.0`) */
  path: string;
  type: AnyValueType;
  tier: Tier;
  /** Byte offset in the 0x2A state dump (omitted for live-only fields) */
  dump: number | null;
  live: Live | null;
}

const MONO_STRIPS = 16; // ch1-16 (0-15)
const STEREO_STRIPS = 2; // 17/18 (16), 19/20 (17)
const STRIPS = MONO_STRIPS + STEREO_STRIPS;
const FX_STRIPS = 2;
const GEQ_BANDS = 15;
const GRID_OFFSET = 171;
const PARAM_STRIDE = STRIPS;

export const FX1_EFFECTS = [
  'Hall 1',
  'Hall 2',
  'Room 1',
  'Plate',
  'Church',
  'DrumAmb',
  'GateRev',
  'Vocal 1',
  'Vocal 2',
  'Vocal 3',
];

export const FX2_EFFECTS = [
  'Hall 3',
  'Room 2',
  'Spring',
  'Delay',
  'Analog',
  'P-P Delay',
  'Vocal 4',
  'Chorus 1',
  'Chorus 2',
  'Cho+Dly',
];

const MONITOR_LABELS = ['MON A', 'MON B', 'MON C', 'MON D', 'MON E', 'MON F'] as const;

export const MIX_LABELS = ['MASTER', ...MONITOR_LABELS] as const;

export const LAYOUT = {
  monoStrips: [...Array(MONO_STRIPS).keys()],
  stereoStrips: [...Array(STEREO_STRIPS).keys()].map((i) => MONO_STRIPS + i),
  stereoStripsWithOffset: [...Array(STEREO_STRIPS).keys()].map((i) => MONO_STRIPS + i * 2),
  fxStrips: [...Array(FX_STRIPS).keys()],
  fxStripsWithOffset: [...Array(FX_STRIPS).keys()].map((i) => MONO_STRIPS + STEREO_STRIPS * 2 + i * 2),
  strips: STRIPS,
  mixes: MIX_LABELS.length,
  monitors: MONITOR_LABELS.length,
  geqBands: [...Array(GEQ_BANDS).keys()],
} as const;

const REC_ENUM = enumOf(['off', 'play', 'rec']);

/** Per-strip controls: [key, dump index, value type, tier, base controller (mono/even)] */
const PER_STRIP = [
  ['rec', 1, REC_ENUM, 'scene', 0x08],
  ['mute', 2, bool(1), 'scene', 0x30],
  ['solo', 3, bool(1), 'ephemeral', 0x32],
  ['phase', 4, bool(1), 'scene', 0x0a],
  ['pan', 5, scalar({ max: 100, center: 50 }), 'scene', 0x0c],
  ['eqOff', 6, bool(1), 'scene', 0x0e],
  ['eqHi', 7, scalar({ max: 0x3c, center: 0x1e }), 'scene', 0x14],
  ['eqMidF', 8, scalar({ max: 0x60 }), 'scene', 0x18],
  ['eqMid', 9, scalar({ max: 0x3c, center: 0x1e }), 'scene', 0x1a],
  ['eqLo', 10, scalar({ max: 0x3c, center: 0x1e }), 'scene', 0x2c],
  ['lowCut', 11, scalar({ max: 0x38 }), 'scene', 0x2e],
  ['fx1Send', 12, scalar({ max: 0x3c }), 'scene', 0x34],
  ['fx2Send', 13, scalar({ max: 0x3c }), 'scene', 0x36],
] as const satisfies readonly (readonly [string, number, AnyValueType, Tier, number])[];

const gridAt = (index: number, strip: number): number => GRID_OFFSET + index * PARAM_STRIDE + strip;
const cc = (status: number, ctrl: number): Live => ({ enc: 'cc', status, ctrl });
const cc14 = (ctrl: number, msbStatus: number, lsbStatus: number): Live => ({
  enc: 'cc14',
  ctrl,
  msbStatus,
  lsbStatus,
});

const stripAddress = (strip: number): [channel: number, odd: number] => {
  if (strip < MONO_STRIPS) {
    return [strip, 0];
  }

  // Stereo strips share mono channels and use odd controllers to avoid collision
  return [(strip - MONO_STRIPS) * 2, 1];
};

const fxFaderAddress = (index: number, mix: number): [status: number, ctrl: number] => {
  const slot = 12 + 4 * mix + index;
  return [0xb0 | (slot & 0x0f), 0x50 + (slot >> 4)];
};

export function buildRegistry(): Descriptor[] {
  const registry: Descriptor[] = [];
  const add = (
    path: string,
    type: AnyValueType,
    tier: Tier,
    dump: number | null = null,
    live: Live | null = null,
  ): void => {
    registry.push({ path, type, tier, dump, live });
  };

  // Channel names
  for (let index = 0; index < STRIPS; index++) {
    add(`strips.${index}.name`, str(9), 'scene', 9 + index * 9, null);
  }

  // Per-strip params + mix send matrix
  for (let index = 0; index < STRIPS; index++) {
    const [channel, odd] = stripAddress(index);
    for (const [key, dumpIndex, type, tier, ctrl] of PER_STRIP) {
      add(`strips.${index}.${key}`, type, tier, gridAt(dumpIndex, index), cc(0xb0 | channel, ctrl + odd));
    }
    for (const mix of MIX_LABELS.keys()) {
      add(
        `strips.${index}.sends.${mix}`,
        scalar({ max: 0x78 }),
        'scene',
        gridAt(14 + mix, index),
        cc(0xb0 | channel, 0x3c + 2 * mix + odd),
      );
    }
  }

  // FX returns
  for (const index of LAYOUT.fxStrips) {
    add(
      `fx.${index}.effect`,
      enumOf(index === 0 ? FX1_EFFECTS : FX2_EFFECTS),
      'scene',
      549 + index,
      cc(0xb0 | index, 0x4e),
    );
    add(
      `fx.${index}.tone`,
      u14({ max: 1023 }),
      'scene',
      551 + 2 * index,
      cc14(0x4e, 0xb0 | (4 + 2 * index), 0xb0 | (5 + 2 * index)),
    );
    add(
      `fx.${index}.decay`,
      u14({ max: 255 }),
      'scene',
      555 + 2 * index,
      cc14(0x4e, 0xb0 | (12 + 2 * index), 0xb0 | (13 + 2 * index)),
    );
    add(`fx.${index}.mute`, bool(1), 'scene', 559 + index, cc(0xb0 | (4 + index), 0x50));
    add(`fx.${index}.solo`, bool(1), 'ephemeral', null, cc(0xb0 | (8 + index), 0x50));
    for (const mix of MIX_LABELS.keys()) {
      const [status, ctrl] = fxFaderAddress(index, mix);
      add(`fx.${index}.sends.${mix}`, scalar({ max: 0x78 }), 'scene', 563 + index + 2 * mix, cc(status, ctrl));
    }
  }

  // Master + monitor output levels
  add('master.level', scalar({ max: 0x78 }), 'global', 579, cc(0xba, 0x54));
  add('master.mute', bool(1), 'global', null, cc(0xb9, 0x54));
  add('master.rec', REC_ENUM, 'ephemeral', null, cc(0xb8, 0x54));
  for (const index of MONITOR_LABELS.keys()) {
    add(`monitors.${index}.level`, scalar({ max: 0x76 }), 'global', 580 + index, cc(0xb0 | index, 0x53));
  }

  // Graphic EQ
  add('geq.on', bool(1), 'global', 586, cc(0xbf, 0x55));
  for (const index of LAYOUT.geqBands) {
    add(`geq.bands.${index}`, scalar({ max: 0x3c, center: 0x1e }), 'global', 587 + index, cc(0xb0 | index, 0x55));
  }

  add('tempo', u14(), 'global', null, cc14(0x58, 0xb2, 0xb3)); // (BPM - 40) * 10
  add('sceneDirty', bool(1), 'ephemeral', 603, null); // any param changed on currently recalled scene?

  // Recorder state
  add('recorder.name', str(13), 'global', 638, null); // recording file name, YYMMDD_HHMMSS
  add('recorder.atMarker', enumOf(['(none)', 'at mark', 'not at mark']), 'global', 616, null); // playhead exactly on the current mark?
  add('recorder.currentMarker', scalar({ max: 0x7f }), 'global', 617, null); // current mark # (mark at/last before playhead)
  add('recorder.duration', hms(), 'global', 620, null); // total length, HH:MM:SS -> seconds
  add('recorder.playhead', hms(), 'global', 624, null); // playhead position, HH:MM:SS -> seconds

  return registry;
}

export const REGISTRY: Descriptor[] = buildRegistry();

/** Path -> field descriptor */
export const BY_PATH = new Map<string, Descriptor>(REGISTRY.map((field) => [field.path, field]));

/** Numeric range of a scalar/u14 field */
export function rangeOf(path: string): { min: number; max: number } {
  const type = BY_PATH.get(path)?.type;
  if (!type || (type.kind !== 'scalar' && type.kind !== 'u14')) {
    throw new Error(`rangeOf: '${path}' is not a numeric field`);
  }
  return { min: type.min, max: type.max };
}

/** Typed path builder */
export const P = {
  strip(index: number): StripPaths {
    const paths = {
      name: asPath<string>(`strips.${index}.name`),
      fader: asPath<number>(`strips.${index}.sends.0`),
      send: (mix: number) => asPath<number>(`strips.${index}.sends.${mix}`),
    } as Record<string, unknown>;

    for (const [key] of PER_STRIP) {
      paths[key] = asPath(`strips.${index}.${key}`);
    }

    return paths as StripPaths;
  },
  fx: (index: number) => ({
    effect: asPath<number>(`fx.${index}.effect`),
    tone: asPath<number>(`fx.${index}.tone`),
    decay: asPath<number>(`fx.${index}.decay`),
    mute: asPath<boolean>(`fx.${index}.mute`),
    solo: asPath<boolean>(`fx.${index}.solo`),
    fader: asPath<number>(`fx.${index}.sends.0`),
    send: (mix: number) => asPath<number>(`fx.${index}.sends.${mix}`),
  }),
  master: {
    level: asPath<number>('master.level'),
    mute: asPath<boolean>('master.mute'),
    rec: asPath<number>('master.rec'),
  },
  monitor: (index: number) => ({ level: asPath<number>(`monitors.${index}.level`) }),
  geq: {
    on: asPath<boolean>('geq.on'),
    band: (index: number) => asPath<number>(`geq.bands.${index}`),
  },
  tempo: asPath<number>('tempo'),
  sceneDirty: asPath<boolean>('sceneDirty'),
  recorder: {
    name: asPath<string>('recorder.name'),
    atMarker: asPath<number>('recorder.atMarker'),
    currentMarker: asPath<number>('recorder.currentMarker'),
    duration: asPath<number>('recorder.duration'),
    playhead: asPath<number>('recorder.playhead'),
  },
};
