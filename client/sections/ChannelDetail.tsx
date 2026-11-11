import { For, createEffect, type Accessor } from 'solid-js';
import { LAYOUT, P, type StripControlKey } from '../../core/protocol/registry.ts';
import { STRIP_NAMES } from '../../core/protocol/meta.ts';
import { field } from '../bridge.ts';
import { useApp } from '../context.ts';
import { makeControl, makeRecButton } from '../components/Control.tsx';

const CONTROLS: { key: StripControlKey; label: string; class?: string }[] = [
  { key: 'pan', label: 'Pan' },
  { key: 'eqOff', label: 'EQ OFF', class: 'eq-off' },
  { key: 'eqHi', label: 'Hi' },
  { key: 'eqMidF', label: 'MidF' },
  { key: 'eqMid', label: 'Mid' },
  { key: 'eqLo', label: 'Lo' },
  { key: 'lowCut', label: 'LoCut' },
  { key: 'fx1Send', label: 'FX1' },
  { key: 'fx2Send', label: 'FX2' },
  { key: 'phase', label: 'Phase' },
  { key: 'rec', label: 'Rec' },
];

export const DETAIL_KEYS = CONTROLS.map((control) => control.key);

export function ChannelDetail(props: { open: Accessor<number | null>; onClose: () => void }) {
  const { store } = useApp();
  let dialogEl!: HTMLDialogElement;
  const indices = [...LAYOUT.monoStrips, ...LAYOUT.stereoStrips]; // 0..15, 16, 17
  const names = indices.map((strip) => field<string>(store, P.strip(strip).name));

  const title = (): string => {
    const strip = props.open();
    if (strip === null) {
      return 'Channel';
    }
    const name = names[strip]?.();
    const fallback = STRIP_NAMES[strip] ?? String(strip + 1);
    return name || (LAYOUT.monoStrips.includes(strip) ? `Channel ${fallback}` : fallback);
  };

  createEffect(() => {
    const strip = props.open();
    if (strip === null) {
      if (dialogEl.open) {
        dialogEl.close();
      }
    } else if (!dialogEl.open) {
      dialogEl.showModal();
    }
  });

  return (
    <dialog class="modal" ref={dialogEl} onClose={() => props.onClose()}>
      <div class="detail-head">
        <strong>{title()}</strong>
        <button type="button" onClick={() => props.onClose()}>
          Close
        </button>
      </div>
      <For each={indices}>
        {(strip) => (
          <div class="detail-panel" hidden={props.open() !== strip}>
            <For each={CONTROLS}>
              {(control) => {
                const path = P.strip(strip)[control.key];

                // Factories and not JSX, so that re-running it doesn't rebuild the field bindings
                return control.key === 'rec'
                  ? makeRecButton(store, path)
                  : makeControl(store, path, { label: control.label, additionalClasses: control.class });
              }}
            </For>
          </div>
        )}
      </For>
    </dialog>
  );
}
