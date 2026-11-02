// Store <> Solid signal bridge

import { createSignal, onCleanup, type Accessor } from 'solid-js';
import type { Store } from '../core/state/store.ts';
import type { Value, Path } from '../core/protocol/valuetypes.ts';
import type { MeterFrame } from '../core/messaging/meters.ts';
import type { MeterStore } from '../core/state/meters.ts';

/** Reconcile the signal from the store on any non-local change to this path (or a bulk dump) */
const reconcile = (store: Store, path: string, apply: () => void) =>
  store.subscribe((change) => {
    if (change.source !== 'local' && (change.source === 'dump' || change.path === path)) {
      apply();
    }
  });

/** Read-only signal mirroring store.get(path). Undefined until the first dump. */
export function field<T extends Value = Value>(store: Store, path: Path<T>): Accessor<T | undefined> {
  const [get, set] = createSignal<T | undefined>(store.get(path) as T | undefined);
  onCleanup(reconcile(store, path, () => set(() => store.get(path) as T | undefined)));
  return get;
}

/** Read/write field. Updates optimistically and dispatches the intent. Undefined until the first dump. */
export function fieldRW<T extends Value = Value>(
  store: Store,
  path: Path<T>,
): [Accessor<T | undefined>, (value: T) => void] {
  const [get, sig] = createSignal<T | undefined>(store.get(path) as T | undefined);
  onCleanup(reconcile(store, path, () => sig(() => store.get(path) as T | undefined)));
  const set = (value: T): void => {
    sig(() => value);
    store.dispatch(path, value);
  };
  return [get, set];
}

/** Mirrors an external store into a signal that re-reads on each notify */
export function observed<T>(read: () => T, subscribe: (notify: () => void) => () => void): Accessor<T> {
  const [get, set] = createSignal<T>(read());
  onCleanup(subscribe(() => set(() => read())));
  return get;
}

/** The latest meter frame as a signal (~16 fps) */
export function meterFrame(meters: MeterStore): Accessor<MeterFrame | null> {
  const [get, set] = createSignal<MeterFrame | null>(meters.get());
  onCleanup(meters.subscribe((frame) => set(frame)));
  return get;
}
