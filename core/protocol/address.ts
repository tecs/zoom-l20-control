import { ccStatus } from './midi.ts';

export const flatAddress = (firstCtrl: number, index: number): { status: number; ctrl: number } => ({
  status: ccStatus(index),
  ctrl: firstCtrl + (index >> 4),
});
