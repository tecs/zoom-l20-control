import { ccStatus, type ShortMessage } from './midi.ts';

export const SCENE = { ON: 8, SAVE: 9, RECALL: 10, RESET: 20 } as const;
export const SCENE_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const sceneSlotIndex = (n: number): number => 10 + n;

export const sceneButtonAddress = (index: number): { status: number; ctrl: number } => ({
  status: ccStatus(index),
  ctrl: 0x56 + (index >> 4),
});

export const scenePress = (index: number): ShortMessage => {
  const { status, ctrl } = sceneButtonAddress(index);
  return { status, d1: ctrl, d2: 0x03 };
};

const ON_ADDR = sceneButtonAddress(SCENE.ON);

export const isSceneOnEcho = ({ status, d1 }: ShortMessage): boolean =>
  status === ON_ADDR.status && d1 === ON_ADDR.ctrl;
