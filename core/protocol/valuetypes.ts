// Pure boundary between raw wire bytes and semantic values

export type Kind = 'bool' | 'scalar' | 'enum' | 'u14' | 'str' | 'hms';
export type Value = number | boolean | string;

declare const PATH_T: unique symbol;

/** A field's dot-path with an inferrable phantom Value type */
export type Path<T extends Value = Value> = string & { readonly [PATH_T]: T };

export const asPath = <T extends Value = Value>(path: string): Path<T> => path as Path<T>;

/** Exhaustiveness guard for discriminated-union switches */
export const assertNever = (x: never): never => {
  throw new Error(`unexpected variant: ${String(x)}`);
};

interface BaseValueType<T extends Value, K extends Kind> {
  kind: K;
  len: number;
  decode(bytes: number[]): T;
  encode(value: T): number[];
}

export interface BoolValueType extends BaseValueType<boolean, 'bool'> {
  onValue: number;
}

export interface ScalarValueType extends BaseValueType<number, 'scalar'> {
  min: number;
  max: number;
  center?: number | undefined;
}

export interface EnumValueType extends BaseValueType<number, 'enum'> {
  labels: string[];
  label(index: number): string;
}

export interface U14ValueType extends BaseValueType<number, 'u14'> {
  min: number;
  max: number;
}

export type StringValueType = BaseValueType<string, 'str'>;
export type HmsValueType = BaseValueType<number, 'hms'>;
export type ValueType = BoolValueType | ScalarValueType | EnumValueType | U14ValueType | StringValueType | HmsValueType;

/** Extract the value type from any ValueType member */
export type ValueOf<V> = V extends BaseValueType<infer T, Kind> ? T : never;

const U7_MAX = 0x7f;
const U14_MAX = 0x3fff;

type Range = { min?: number; max?: number };

export const bool = (onValue = 1): BoolValueType => ({
  len: 1,
  kind: 'bool',
  onValue,
  decode: ([byte = 0]) => byte !== 0,
  encode: (value) => [value ? onValue : 0],
});

export const scalar = ({ min = 0, max = U7_MAX, center }: Range & { center?: number } = {}): ScalarValueType => ({
  len: 1,
  kind: 'scalar',
  min,
  max,
  center,
  decode: ([byte = 0]) => byte,
  encode: (value) => [(value | 0) & U7_MAX],
});

export const enumOf = (labels: string[]): EnumValueType => ({
  len: 1,
  kind: 'enum',
  labels,
  label: (index) => labels[index] ?? String(index),
  decode: ([byte = 0]) => (byte < labels.length ? byte : 0),
  encode: (value) => [(value | 0) & U7_MAX],
});

export const u14 = ({ min = 0, max = U14_MAX }: Range = {}): U14ValueType => ({
  len: 2,
  kind: 'u14',
  min,
  max,
  decode: ([msb = 0, lsb = 0]) => (msb << 7) | lsb,
  encode: (value) => {
    const x = (value | 0) & U14_MAX;
    return [(x >> 7) & U7_MAX, x & U7_MAX]; // msb, lsb
  },
});

export const str = (length: number): StringValueType => ({
  len: length,
  kind: 'str',
  // These strings are null-padded, so trim/pad where necessary
  decode: (bytes) => String.fromCharCode(...bytes).replace(/\0+$/, ''),
  encode: (value) => {
    const bytes = new Array<number>(length).fill(0);
    const scanLength = Math.min(length, value.length);
    for (let char = 0; char < scanLength; char++) {
      bytes[char] = value.charCodeAt(char) & U7_MAX;
    }
    return bytes;
  },
});

/** HHH:MM:SS time */
export const hms = (): HmsValueType => ({
  len: 4,
  kind: 'hms',
  decode: ([hMsb = 0, hLsb = 0, m = 0, s = 0]) => (((hMsb << 7) | hLsb) * 60 + m) * 60 + s,
  encode: (value) => {
    const time = value | 0,
      s = time % 60,
      m = Math.floor(time / 60) % 60,
      h = Math.floor(time / 3600);
    return [(h >> 7) & U7_MAX, h & U7_MAX, m, s]; // hMsb, hLsb, m, s
  },
});
