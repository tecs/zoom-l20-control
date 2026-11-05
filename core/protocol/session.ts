// Fixed SysEx the app sends to the desk

import { ALL_DEVICES, identityRequest, universalSysex, type ShortMessage } from './midi.ts';
import { COMMAND, zoomSysex } from './sysex.ts';
import { buttonMessage } from './buttons.ts';

// In the button space, though not a button - its value is the mix
const METER_SELECT_INDEX = 21;

export const DUMP_REQUEST = zoomSysex(COMMAND.DUMP_REQUEST);

export const HANDSHAKE = [
  universalSysex(
    ALL_DEVICES,
    // As captured from the iPad app
    ...[
      0x0d, 0x70, 0x02, 0x74, 0x57, 0x2a, 0x66, 0x7f, 0x7f, 0x7f, 0x7f, 0x11, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x02,
      0x00, 0x00, 0x00, 0x1c, 0x00, 0x00, 0x01, 0x00, 0x00,
    ],
  ),
  identityRequest(0x00),
  DUMP_REQUEST,
  zoomSysex(COMMAND.PAGED_REQUEST, 0x00),
  zoomSysex(COMMAND.PAGED_REQUEST, 0x01),
  zoomSysex(COMMAND.PAGED_REQUEST, 0x02),
  zoomSysex(0x50), // unknown
];

/**
 * Generates a transport message for subscribing to the provided mix.
 *
 * 0: master, 1-6: A-F
 */
export const meterSelect = (mix: number): ShortMessage => buttonMessage(METER_SELECT_INDEX, mix);
