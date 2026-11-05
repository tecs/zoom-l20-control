import { ccStatus, channelOf, type ShortMessage } from './midi.ts';

const FIRST_CTRL = 0x56;
const LAST_CTRL = 0x57;

export const BUTTON_VALUE = { PRESS: 0x03, HOLD_UP: 0x04, HOLD_DOWN: 0x05 } as const;

export const buttonAddress = (index: number): { status: number; ctrl: number } => ({
  status: ccStatus(index),
  ctrl: FIRST_CTRL + (index >> 4),
});

export const buttonMessage = (index: number, value: number): ShortMessage => {
  const { status, ctrl } = buttonAddress(index);
  return { status, d1: ctrl, d2: value };
};

export const buttonPress = (index: number): ShortMessage => buttonMessage(index, BUTTON_VALUE.PRESS);

export const buttonIndex = ({ status, d1 }: ShortMessage): number | null =>
  d1 >= FIRST_CTRL && d1 <= LAST_CTRL ? ((d1 - FIRST_CTRL) << 4) | channelOf(status) : null;
