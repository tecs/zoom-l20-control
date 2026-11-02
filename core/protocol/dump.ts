import { REGISTRY } from './registry.ts';
import type { Value } from './valuetypes.ts';

export type State = Record<string, unknown>;

export const setPath = (obj: State, path: string, value: unknown): void =>
  path.split('.').forEach((segment, i, segments) => {
    if (i === segments.length - 1) {
      return (obj[segment] = value);
    }
    obj = (obj[segment] ??= /^\d+$/.test(segments[i + 1]) ? [] : {}) as State;
  });

export const getPath = (obj: State, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((out, segment) => (out === null || out === undefined ? undefined : (out as State)[segment]), obj);

export function deserializeDump(bytes: Uint8Array): State {
  const state: State = {};
  for (const { dump, path, type } of REGISTRY) {
    if (dump === null) {
      continue;
    }
    const raw = Array.from(bytes.slice(dump, dump + type.len));
    setPath(state, path, type.decode(raw));
  }
  return state;
}

export function serializeDump(state: State, base: Uint8Array | number[]): Uint8Array {
  const out = Uint8Array.from(base);

  for (const { dump, path, type } of REGISTRY) {
    if (dump === null) {
      continue;
    }

    const value = getPath(state, path);
    if (value === undefined) {
      continue;
    }

    const encoded = (type.encode as (value: Value) => number[])(value as Value);
    for (let i = 0; i < encoded.length; i++) {
      out[dump + i] = encoded[i];
    }
  }

  return out;
}
