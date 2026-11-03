// Per-strip store bindings factories

import type { Accessor } from 'solid-js';
import type { Store } from '../core/state/store.ts';
import type { Path, Value } from '../core/protocol/valuetypes.ts';
import { LAYOUT, P, BY_PATH } from '../core/protocol/registry.ts';
import { field, fieldRW } from './bridge.ts';

export type RW<T extends Value> = ReturnType<typeof fieldRW<T>>;

export interface StripBindings {
  /** index 0: master, 1-6: MON A-F */
  sends: RW<number>[];
  mute: RW<boolean>;
  solo: RW<boolean>;
  name: Accessor<string | undefined>;
  send(mix: number): Path<number>;
}

export interface FxPanelBindings {
  effect: RW<number>;
  labels: readonly string[];
  tone: RW<number>;
  decay: RW<number>;
}

export interface FxFaceBindings {
  sends: RW<number>[];
  mute: RW<boolean>;
  solo: RW<boolean>;
  send(mix: number): Path<number>;
}

export function stripBindings(store: Store, index: number): StripBindings {
  const stripPaths = P.strip(index);
  return {
    sends: Array.from({ length: LAYOUT.mixes }, (_, mix) => fieldRW<number>(store, stripPaths.send(mix))),
    mute: fieldRW<boolean>(store, stripPaths.mute),
    solo: fieldRW<boolean>(store, stripPaths.solo),
    name: field<string>(store, stripPaths.name),
    send: (mix) => stripPaths.send(mix),
  };
}

export function fxFaceBindings(store: Store, index: number): FxFaceBindings {
  const fxPaths = P.fx(index);
  return {
    sends: Array.from({ length: LAYOUT.mixes }, (_, mix) => fieldRW<number>(store, fxPaths.send(mix))),
    mute: fieldRW<boolean>(store, fxPaths.mute),
    solo: fieldRW<boolean>(store, fxPaths.solo),
    send: (mix) => fxPaths.send(mix),
  };
}

export function fxPanelBindings(store: Store, index: number): FxPanelBindings {
  const fxPaths = P.fx(index);
  const type = BY_PATH.get(fxPaths.effect)?.type;
  return {
    effect: fieldRW<number>(store, fxPaths.effect),
    labels: type?.kind === 'enum' ? type.labels : [],
    tone: fieldRW<number>(store, fxPaths.tone),
    decay: fieldRW<number>(store, fxPaths.decay),
  };
}
