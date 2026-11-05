// MIDI 1.0 bytes, as this desk uses them

export const DATA_MAX = 0x7f;
export const STATUS_BIT = 0x80;

/** A status byte's high half */
export const MESSAGE_TYPE = {
  CONTROL_CHANGE: 0xb0,
  PROGRAM_CHANGE: 0xc0,
  CHANNEL_PRESSURE: 0xd0,
  /** SysEx, clock, ... */
  SYSTEM: 0xf0,
} as const;

export const SYSEX_START = 0xf0;
export const SYSEX_END = 0xf7;

const TYPE_MASK = 0xf0;
const CHANNEL_MASK = 0x0f;

export const isStatus = (byte: number): boolean => (byte & STATUS_BIT) !== 0;
export const typeOf = (status: number): number => status & TYPE_MASK;
export const channelOf = (status: number): number => status & CHANNEL_MASK;

// MTC quarter frame, song position, song select
const SYSTEM_DATA_LENGTH: Partial<Record<number, number>> = { 0xf1: 1, 0xf2: 2, 0xf3: 1 };

export const dataLength = (status: number): number => {
  switch (typeOf(status)) {
    case MESSAGE_TYPE.PROGRAM_CHANGE:
    case MESSAGE_TYPE.CHANNEL_PRESSURE:
      return 1;
    case MESSAGE_TYPE.SYSTEM:
      return SYSTEM_DATA_LENGTH[status] ?? 0;
    default:
      return 2;
  }
};

/** Control Change status byte on `channel` */
export const ccStatus = (channel: number): number => MESSAGE_TYPE.CONTROL_CHANGE | (channel & CHANNEL_MASK);

/** A 3-byte MIDI channel message every desk control is sent as */
export interface ShortMessage {
  /** type + channel */
  status: number;
  /** data byte 1 */
  d1: number;
  /** data byte 2 */
  d2: number;
}
