// Fixed messages the client sends to the desk

import { identityRequest, type ShortMessage } from './midi.ts';
import { COMMAND, zoomSysex } from './sysex.ts';
import { buttonMessage } from './buttons.ts';

// In the button space, though not a button - its value is the mix
const METER_SELECT_INDEX = 21;
const DESK_DEVICE = 0x00;

export const DUMP_REQUEST = zoomSysex(COMMAND.DUMP_REQUEST);

const SCENE_LIST = 0x00;

export const HANDSHAKE = [
  identityRequest(DESK_DEVICE),
  DUMP_REQUEST,
  zoomSysex(COMMAND.SCENE_REQUEST, SCENE_LIST),
  zoomSysex(COMMAND.METER_ENABLE),
];

/**
 * Generates a transport message for subscribing to the provided mix.
 *
 * 0: master, 1-6: A-F
 */
export const meterSelect = (mix: number): ShortMessage => buttonMessage(METER_SELECT_INDEX, mix);
