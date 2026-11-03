import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SceneState, type SceneStatus } from './scenes.ts';

describe('SceneState', () => {
  it('constructs a scene state', () => {
    const scenes = new SceneState();
    assert.deepEqual(scenes.on, false);
    assert.deepEqual(scenes.active, null);
  });

  it('holds up-to-date state', () => {
    const scenes = new SceneState();

    scenes.setOn(true);
    scenes.setActive(5);

    assert.deepEqual(scenes.on, true);
    assert.deepEqual(scenes.active, 5);
  });

  it('emits only if values have changed', () => {
    const scenes = new SceneState();
    const subscriber = mock.fn<(status: SceneStatus) => void>();
    scenes.subscribe(subscriber);

    scenes.setOn(true);
    scenes.setOn(true);
    scenes.setActive(5);
    scenes.setActive(5);

    assert.deepEqual(subscriber.mock.callCount(), 2);
    assert.deepEqual(
      subscriber.mock.calls.flatMap((call) => call.arguments),
      [
        { on: true, active: null },
        { on: true, active: 5 },
      ],
    );
  });
});
