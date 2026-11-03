import { createSignal, For } from 'solid-js';
import { SCENE, SCENE_SLOTS, sceneSlotIndex } from '../../core/protocol/scenes.ts';
import { P } from '../../core/protocol/registry.ts';
import { META } from '../../core/protocol/meta.ts';
import { formatValue } from '../../core/format.ts';
import { fieldRW, observed } from '../bridge.ts';
import { useApp } from '../context.ts';

const { min: MIN_BPM, max: MAX_BPM } = META.tempo.dist.domain;

export function Scenes(props: { press: (idx: number) => void | Promise<void> }) {
  const { store, sceneState } = useApp();
  const [isSaveMode, setSaveMode] = createSignal(false);
  let lastTap = 0;

  const scene = observed(
    () => ({ on: sceneState.on, active: sceneState.active }),
    (notify) => sceneState.subscribe(notify),
  );

  const [tempoRaw, setTempoRaw] = fieldRW<number>(store, P.tempo);

  const doTap = (): void => {
    const now = performance.now();
    const bpm = 60000 / (now - lastTap);

    // 20% leeway, toRaw clamps the excess
    if (bpm >= MIN_BPM * 0.8 && bpm <= MAX_BPM * 1.2) {
      setTempoRaw(META.tempo.dist.toRaw(bpm));
    }

    lastTap = now;
  };

  // Compound actions with multiple dependent presses, each of which must complete before the next fires
  const slot = async (n: number): Promise<void> => {
    await props.press(isSaveMode() ? SCENE.SAVE : SCENE.RECALL);
    await props.press(sceneSlotIndex(n));

    // Back to safe Recall
    setSaveMode(false);
  };

  const reset = async (): Promise<void> => {
    await props.press(SCENE.RECALL);
    await props.press(SCENE.RESET);
  };

  return (
    <div id="scenes">
      <button type="button" class="toggle" classList={{ on: scene().on }} onClick={() => void props.press(SCENE.ON)}>
        SCENE
      </button>
      <button
        type="button"
        class="scene-mode"
        classList={{ savemode: isSaveMode() }}
        onClick={() => setSaveMode(!isSaveMode())}
      >
        {isSaveMode() ? 'Save' : 'Recall'}
      </button>
      <For each={SCENE_SLOTS}>
        {(n) => (
          <button
            type="button"
            class="scene-slot"
            classList={{ active: scene().active === n }}
            onClick={() => void slot(n)}
          >
            {n}
          </button>
        )}
      </For>
      <button type="button" onClick={() => void reset()}>
        Reset
      </button>
      <div id="tempoBox">
        <span>Tempo</span>
        <input
          type="number"
          min={MIN_BPM}
          max={MAX_BPM}
          step="0.1"
          value={formatValue(P.tempo, tempoRaw() ?? META.tempo.default, true)}
          onChange={(e) => setTempoRaw(META.tempo.dist.toRaw(Number(e.currentTarget.value)))}
        />
        <span>BPM</span>
        <button type="button" onClick={doTap}>
          Tap
        </button>
      </div>
    </div>
  );
}
