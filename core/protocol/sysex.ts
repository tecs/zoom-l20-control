import { SYSEX_END, SYSEX_START } from './midi.ts';

/** Manufacturer ID */
const ZOOM_ID = 0x52;
const ZOOM_HEADER = [SYSEX_START, ZOOM_ID, 0x00, 0x00];

export const COMMAND = {
  PAGED_REQUEST: 0x07,
  SCENE_RECALL: 0x08,
  STATE_DUMP: 0x2a,
  DUMP_REQUEST: 0x2b,
  /** `31 04` - meter frame, `31 01 09` - scene converge/diverge */
  EVENT: 0x31,
  /** `32 00 01 0N` - scene N active, `32 00 00 0N` - scene N saved */
  SCENE: 0x32,
} as const;

export const isZoomSysex = (bytes: ArrayLike<number>): boolean => bytes[1] === ZOOM_ID;

export const zoomSysex = (command: number, ...payload: number[]): number[] => [
  ...ZOOM_HEADER,
  command,
  ...payload,
  SYSEX_END,
];
