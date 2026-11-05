import { buttonIndex } from './buttons.ts';
import type { ShortMessage } from './midi.ts';

export const SCENE = { ON: 8, SAVE: 9, RECALL: 10, RESET: 20 } as const;
export const SCENE_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const sceneSlotIndex = (n: number): number => 10 + n;

export const isSceneOnEcho = (message: ShortMessage): boolean => buttonIndex(message) === SCENE.ON;
