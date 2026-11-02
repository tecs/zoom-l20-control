import { createContext, useContext } from 'solid-js';
import type { Store } from '../core/state/store.ts';
import type { MeterStore } from '../core/state/meters.ts';
import type { SceneState } from '../core/state/scenes.ts';
import type { TransportState } from '../core/state/transport.ts';
import type { Log } from '../core/state/log.ts';
import type { Settings } from './app/settings.ts';
import type { Session } from './app/session.ts';

export interface AppState {
  session: Session;
  store: Store;
  meters: MeterStore;
  settings: Settings;
  log: Log;
  sceneState: SceneState;
  transportState: TransportState;
}

export const AppCtx = createContext<AppState>();

export function useApp(): AppState {
  const app = useContext(AppCtx);
  if (!app) {
    throw new Error('useApp(): no <AppCtx.Provider> above this component');
  }
  return app;
}
