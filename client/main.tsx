import { render } from 'solid-js/web';
import { Store } from '../core/state/store.ts';
import { MeterStore } from '../core/state/meters.ts';
import { SceneState } from '../core/state/scenes.ts';
import { TransportState } from '../core/state/transport.ts';
import { Log } from '../core/state/log.ts';
import { BluetoothTransport } from './infra/transport.ts';
import { WakeLock } from './infra/wakelock.ts';
import { Settings, SETTINGS_SCHEMA } from './app/settings.ts';
import { Session } from './app/session.ts';
import { AppCtx, type AppState } from './context.ts';
import { App } from './App.tsx';

import './app.css';

const settings = new Settings(SETTINGS_SCHEMA, localStorage);
const log = new Log();
const store = new Store();
const meters = new MeterStore();
const sceneState = new SceneState();
const transportState = new TransportState();
const session = new Session({
  transport: new BluetoothTransport(),
  wakeLock: new WakeLock(),
  log,
  store,
  meters,
  sceneState,
  transportState,
});

const app: AppState = { session, store, meters, settings, log, sceneState, transportState };

render(
  () => (
    <AppCtx.Provider value={app}>
      <App />
    </AppCtx.Provider>
  ),
  document.getElementById('app')!,
);

// Reconnect to the last mixer on load
session.autoConnect();
