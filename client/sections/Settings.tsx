import { createEffect, For, Show } from 'solid-js';
import type { Accessor, JSX } from 'solid-js';
import type { SettingSchemaEntry, Settings as SettingsStore } from '../app/settings.ts';
import { observed } from '../bridge.ts';
import { useApp } from '../context.ts';
import { Toggle } from '../components/Toggle.tsx';

type SettingsProps = {
  open: Accessor<boolean>;
  onClose(): void;
};

type NumberInputProps = {
  name: string;
  value: Accessor<number>;
  onCommit(value: number): void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

/** Bounded numeric input that commits on change */
const NumberInput = (props: NumberInputProps) => (
  <span class="setting-num">
    <input
      type="number"
      name={props.name}
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value()}
      onChange={(e) => {
        const value = Number(e.currentTarget.value);
        if (Number.isNaN(value)) {
          e.currentTarget.value = String(props.value()); // reject garbage, restore the live value
          return;
        }
        const clamped = Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, value));
        e.currentTarget.value = String(clamped);
        props.onCommit(clamped);
      }}
    />
    <Show when={props.unit}>
      <span class="setting-unit">{props.unit}</span>
    </Show>
  </span>
);

// Not a component, so the schema entry arrives as an ordinary argument
function settingRow(settings: SettingsStore, schema: SettingSchemaEntry): JSX.Element {
  const value = observed(
    () => settings.get(schema.key),
    (notify) =>
      settings.subscribe((key) => {
        if (key === schema.key) {
          notify();
        }
      }),
  );

  return (
    <div class="setting-row">
      <span class="setting-label">{schema.label}</span>
      {schema.type === 'bool' ? (
        <Toggle
          active={() => !!value()}
          onClick={() => settings.set(schema.key, !settings.get(schema.key))}
          label={value() ? 'On' : 'Off'}
        />
      ) : (
        <NumberInput
          name={schema.key}
          value={() => Number(value())}
          onCommit={(newValue) => settings.set(schema.key, newValue)}
          min={schema.min}
          max={schema.max}
          step={schema.step}
          unit={schema.unit}
        />
      )}
    </div>
  );
}

export function Settings(props: SettingsProps) {
  const { settings } = useApp();
  let dialog!: HTMLDialogElement;

  createEffect(() => {
    const open = props.open();
    if (open === dialog.open) {
      return;
    }

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  });

  return (
    <dialog id="settings" class="modal" ref={dialog} onClose={() => props.onClose()}>
      <div class="detail-head">
        <strong>Settings</strong>
        <button type="button" onClick={() => props.onClose()}>
          Close
        </button>
      </div>
      <div id="settingsPanel">
        <For each={settings.schema}>{(schema) => settingRow(settings, schema)}</For>
      </div>
    </dialog>
  );
}
