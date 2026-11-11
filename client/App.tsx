import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { observed } from './bridge.ts';
import { useApp } from './context.ts';
import { Strips } from './sections/Strips.tsx';
import { FxStrips, FxDetail } from './sections/FxStrips.tsx';
import { MasterStrip } from './sections/MasterStrip.tsx';
import { MixSelect } from './sections/MixSelect.tsx';
import { Outputs } from './sections/Outputs.tsx';
import { Geq } from './sections/Geq.tsx';
import { ChannelDetail } from './sections/ChannelDetail.tsx';
import { Scenes } from './sections/Scenes.tsx';
import { Transport } from './sections/Transport.tsx';
import { Settings as SettingsSection } from './sections/Settings.tsx';
import { LogPane } from './sections/LogPane.tsx';
import { ErrorModal } from './sections/ErrorModal.tsx';
import { SetupModal } from './sections/SetupModal.tsx';
import { TRANSPORT_STATUS } from './infra/transport.ts';
import { assertNever } from '../core/protocol/valuetypes.ts';

export function App() {
  const { settings, log, session } = useApp();

  const [mix, setMix] = createSignal(session.mix);
  const [detailOpen, setDetailOpen] = createSignal<number | null>(null);
  const [fxOpen, setFxOpen] = createSignal<number | null>(null);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [errorOpen, setErrorOpen] = createSignal(false);
  const [setupDismissed, setSetupDismissed] = createSignal(false);

  const status = observed(
    () => session.status,
    (notify) => session.subscribe(notify),
  );
  const setupProblem = observed(
    () => session.setupProblem,
    (notify) => session.subscribe(notify),
  );
  const debugOn = observed(
    () => !!settings.get('debug'),
    (notify) =>
      settings.subscribe((key) => {
        if (key === 'debug') {
          notify();
        }
      }),
  );

  const peaks = {
    show: (): boolean => !!settings.get('peakShow'),
    holdMs: (): number => Number(settings.get('peakHold')),
  };

  createEffect(() => session.selectMix(mix()));

  onCleanup(
    log.subscribe((entry) => {
      if (entry?.level === 'error') {
        setErrors((prev) => [entry.text, ...prev].slice(0, 20));
        setErrorOpen(true);
      }
    }),
  );

  const connectionLabel = (): string => {
    const currentStatus = status();
    switch (currentStatus) {
      case TRANSPORT_STATUS.CONNECTED:
        return 'Disconnect';
      case TRANSPORT_STATUS.CONNECTING:
        return 'Connecting...';
      case TRANSPORT_STATUS.DISCONNECTED:
        return 'Connect';
      default:
        assertNever(currentStatus);
        return currentStatus;
    }
  };

  return (
    <>
      <div class="topbar">
        <button type="button" id="connect" onClick={() => session.toggleConnection()}>
          <span
            class="conn-dot"
            classList={{
              connecting: status() === TRANSPORT_STATUS.CONNECTING,
              connected: status() === TRANSPORT_STATUS.CONNECTED,
            }}
          />
          {connectionLabel()}
        </button>
        <button type="button" id="settingsBtn" title="Settings" onClick={() => setSettingsOpen(true)}>
          ⚙
        </button>
        <Show when={errors().length > 0}>
          <button type="button" id="errorsBtn" title="Show errors" onClick={() => setErrorOpen(true)}>
            ⚠ {errors().length}
          </button>
        </Show>
      </div>

      <Scenes press={(index) => session.pressScene(index)} />
      <Transport send={(message) => session.send(message)} />
      <MixSelect mix={mix} setMix={setMix} />
      <Outputs />
      <div class="channels">
        <Strips mix={mix} openDetail={setDetailOpen} peaks={peaks} />
        <FxStrips mix={mix} openFx={setFxOpen} peaks={peaks} />
        <MasterStrip peaks={peaks} />
      </div>
      <Geq />
      <Show when={debugOn()}>
        <LogPane onReread={() => session.reread()} />
      </Show>

      <ChannelDetail open={detailOpen} onClose={() => setDetailOpen(null)} />
      <FxDetail open={fxOpen} onClose={() => setFxOpen(null)} />
      <SettingsSection open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SetupModal
        problem={setupProblem}
        open={() => setupProblem() !== null && !setupDismissed()}
        onClose={() => setSetupDismissed(true)}
      />
      <ErrorModal
        errors={errors}
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        onClear={() => {
          setErrors([]);
          setErrorOpen(false);
        }}
      />
    </>
  );
}
