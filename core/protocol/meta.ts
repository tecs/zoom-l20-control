// Per-family units, dB/Hz curves, defaults and scale ticks, keyed by normalized path (strips.3.sends.2 -> strips.sends)

import { REGISTRY, MIX_LABELS } from './registry.ts';

/** A control's readout/scale value distribution curve */
export interface Distribution {
  kind: 'linear' | 'table';
  domain: { min: number; max: number };
  toDomain(rawValue: number): number;
  toRaw(domainValue: number): number;
  points?: [number, number][];
}

export interface FamilyMeta {
  role: string;
  unit?: string | null;
  default?: number | null;
  unity?: number;
  dist?: Distribution;
  ticks?: number[];
  format?: string;
  perEffect?: boolean;
  offAt?: number;
  readOnly?: boolean;
  resetToMid?: boolean;
  /** not yet calibrated */
  provisional?: boolean;
}

export interface MetaStore {
  get(path: string): unknown;
}

/** Strips every numeric segment of a path so it collapses to its family key */
export const normalizePath = (path: string): string => path.replace(/\.\d+(?=\.|$)/g, '');

/** Maps `x` clamped from the range `[x0, x1]` onto `[y0, y1]` */
const rescale = (x: number, x0: number, x1: number, y0: number, y1: number): number => {
  if (x >= x1 || (x > x0 && !Number.isFinite(x1 + y1))) {
    return y1;
  }
  if (x <= x0 || (x < x1 && !Number.isFinite(x0 + y0))) {
    return y0;
  }
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
};

export const linearDistribution = (rawMin: number, rawMax: number, min: number, max: number): Distribution => ({
  kind: 'linear',
  domain: { min, max },
  toDomain: (rawValue) => rescale(rawValue, rawMin, rawMax, min, max),
  toRaw: (domainValue) => Math.round(rescale(domainValue, min, max, rawMin, rawMax)),
});

/**
 * Piecewise-linear distribution through calibration points `[[raw, domain], ...]`, raw ascending.
 *
 * The first point may be infinite, in which case the second point must be exactly one raw value more than the first.
 */
export const tableDistribution = (points: [number, number][]): Distribution => {
  if (points.length < 2) {
    throw new Error('Table distributions must contain at least two points');
  }
  if (points.slice(1).some(([raw, domain], i) => points[i][0] >= raw || points[i][1] >= domain)) {
    throw new Error('Points must be sorted ascending');
  }

  const [rawMin, min] = points[0];
  const [rawMax, max] = points[points.length - 1];
  if (!Number.isFinite(min) && points[1][0] !== rawMin + 1) {
    throw new Error(
      'The raw value of the second point must be one more than the first one, when the first domain value is -inf',
    );
  }

  return {
    kind: 'table',
    domain: { min, max },
    points,
    toDomain: (rawValue: number): number => {
      for (let i = 1; i < points.length; i++) {
        if (rawValue <= points[i][0]) {
          return rescale(rawValue, points[i - 1][0], points[i][0], points[i - 1][1], points[i][1]);
        }
      }
      return max;
    },
    toRaw: (domainValue: number): number => {
      for (let i = 1; i < points.length; i++) {
        if (domainValue <= points[i][1]) {
          return Math.round(rescale(domainValue, points[i - 1][1], points[i][1], points[i - 1][0], points[i][0]));
        }
      }
      return rawMax;
    },
  };
};

// Calibrated raw-to-domain distribution data
const FADER_DIST = tableDistribution([
  [0, -Infinity],
  [1, -80],
  [2, -70],
  [3, -65],
  [4, -60],
  [5, -55],
  [6, -50],
  [7, -45],
  [8, -40],
  [9, -38.89],
  [17, -30],
  [27, -20],
  [45, -10],
  [63, -5],
  [82, 0],
  [100, 5],
  [119, 9.75],
  [120, 10],
]);

const SEND_DIST = tableDistribution([
  [0, -Infinity],
  [1, -60],
  [2, -56.67],
  [4, -50],
  [7, -40],
  [10, -30],
  [21, -20.57],
  [27, -15.43],
  [31, -12],
  [38, -6],
  [45, 0],
  [48, 2],
  [51, 4],
  [54, 6],
  [57, 8],
  [58, 8.67],
  [59, 9.33],
  [60, 10],
]);

const MON_DIST = tableDistribution([
  [0, -Infinity],
  [1, -80],
  [2, -70],
  [3, -65.8],
  [20, -20.56],
  [40, -13.34],
  [59, -6.49],
  [77, 0],
  [97, 7.32],
  [118, 15],
]);

const MIDF_DIST = tableDistribution([
  [1, 104],
  [2, 109],
  [7, 135],
  [15, 192],
  [26, 308],
  [39, 542],
  [48, 800],
  [59, 1356],
  [70, 2299],
  [81, 3896],
  [89, 5719],
  [94, 7268],
  [95, 7626],
  [96, 8000],
]);

const LOWCUT_DIST = tableDistribution([
  [1, 40],
  [2, 41.7],
  [6, 49],
  [9, 55.3],
  [20, 86.3],
  [28, 123.2],
  [35, 183],
  [46, 340.9],
  [55, 567],
  [56, 600],
]);

const FADER_TICKS = [-Infinity, -40, -20, -10, -5, 0, 5, 10];
const SEND_TICKS = [-Infinity, -30, -20, -10, 0, 10];
const MON_TICKS = [-Infinity, -40, -20, -10, 0, 10, 15];
const MIDF_TICKS = [100, 200, 500, 1000, 2000, 4000, 8000];
const LOWCUT_TICKS = [40, 80, 160, 320, 600];

const EQ_GAIN = { unit: 'dB', default: 30, unity: 30, dist: linearDistribution(0, 60, -15, 15) };

export const META: Record<string, FamilyMeta> = {
  'strips.sends': { role: 'Level', unit: 'dB', default: 0, unity: 82, dist: FADER_DIST, ticks: FADER_TICKS },
  'strips.pan': {
    role: 'Pan',
    unit: null,
    format: 'pan',
    default: 50,
    unity: 50,
    dist: linearDistribution(0, 100, -100, 100),
  },
  'strips.mute': { role: 'Mute', default: 0 },
  'strips.solo': { role: 'Solo', default: 0 },
  'strips.phase': { role: 'Phase', default: 0 },
  'strips.eqOff': { role: 'EQ Bypass', default: 0 },
  'strips.eqHi': { role: 'EQ High', ...EQ_GAIN },
  'strips.eqMid': { role: 'EQ Mid', ...EQ_GAIN },
  'strips.eqLo': { role: 'EQ Low', ...EQ_GAIN },
  'strips.eqMidF': { role: 'EQ Mid Freq', unit: 'Hz', default: 48, dist: MIDF_DIST, ticks: MIDF_TICKS },
  'strips.lowCut': { role: 'Low Cut', unit: 'Hz', default: 0, offAt: 0, dist: LOWCUT_DIST, ticks: LOWCUT_TICKS },
  'strips.fx1Send': { role: 'FX1 Send', unit: 'dB', default: 0, unity: 45, dist: SEND_DIST, ticks: SEND_TICKS },
  'strips.fx2Send': { role: 'FX2 Send', unit: 'dB', default: 0, unity: 45, dist: SEND_DIST, ticks: SEND_TICKS },
  'strips.rec': { role: 'Rec', default: 0 }, // 3-state (REC_ENUM): 0 off / 1 play / 2 rec
  'strips.name': { role: 'Name', unit: null, default: null },

  'master.level': { role: 'Master', unit: 'dB', default: 0, unity: 82, dist: FADER_DIST, ticks: FADER_TICKS },
  'master.mute': { role: 'Master Mute', default: 0 },
  'master.rec': { role: 'Master Rec', default: 0 }, // 3-state
  'monitors.level': { role: 'Monitor', unit: 'dB', default: 0, unity: 77, dist: MON_DIST, ticks: MON_TICKS },

  'fx.sends': { role: 'FX Level', unit: 'dB', default: 0, unity: 82, dist: FADER_DIST, ticks: FADER_TICKS },
  'fx.effect': { role: 'Effect', default: 0 },
  'fx.tone': { role: 'Tone', unit: null, perEffect: true, default: null, resetToMid: true },
  'fx.decay': { role: 'Decay', unit: null, perEffect: true, default: null, resetToMid: true },
  'fx.mute': { role: 'FX Mute', default: 0 },
  'fx.solo': { role: 'FX Solo', default: 0 },

  'geq.bands': { role: 'GEQ Band', unit: 'dB', default: 30, unity: 30, dist: linearDistribution(0, 60, -15, 15) },
  'geq.on': { role: 'GEQ On', default: 0 },

  tempo: { role: 'Tempo', unit: 'BPM', default: 800, dist: linearDistribution(0, 2100, 40, 250) },

  // client-derived
  sceneDirty: { role: 'Scene Dirty', default: null, readOnly: true },

  'recorder.name': { role: 'Recording', default: null, readOnly: true },
  'recorder.atMarker': { role: 'At Marker', default: null, readOnly: true },
  'recorder.currentMarker': { role: 'Marker', default: null, readOnly: true },
  'recorder.duration': { role: 'Duration', default: null, readOnly: true },
  'recorder.playhead': { role: 'Playhead', default: null, readOnly: true },
};

export const metaFor = (path: string): FamilyMeta | null => META[normalizePath(path)] ?? null;

export const STRIP_NAMES = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17/18',
  '19/20',
];
export const FX_NAMES = ['FX1', 'FX2'];
export const MIX_NAMES = MIX_LABELS;
export const GEQ_FREQS = [
  '25',
  '40',
  '63',
  '100',
  '160',
  '250',
  '400',
  '630',
  '1k',
  '1.6k',
  '2.5k',
  '4k',
  '6.3k',
  '10k',
  '16k',
];

// Calibration utilities
type ReadoutSample = { path: string; raw: unknown };
type CalibrationReadout = { family: string; unit?: string | null; samples: ReadoutSample[] };

/** Families whose curve/unity are stubbed and still need a hardware sweep */
export const PROVISIONAL_FAMILIES: string[] = Object.entries(META)
  .filter(([, meta]) => meta.provisional)
  .map(([key]) => key);

/**
 * Raw values for every instance of a family.
 * For per-mix send families only the master mix is returned.
 */
export function familyRawReadout(store: MetaStore, family: string): ReadoutSample[] {
  const isSend = family.endsWith('sends');
  return REGISTRY.filter(({ path }) => normalizePath(path) === family && (!isSend || path.endsWith('.0'))).map(
    ({ path }) => ({ path, raw: store.get(path) }),
  );
}

/** Returns a single readout per provisional family for calibration */
export const calibrationReadout = (store: MetaStore): CalibrationReadout[] =>
  PROVISIONAL_FAMILIES.map((family) => ({
    family,
    unit: META[family].unit,
    samples: familyRawReadout(store, family),
  }));
