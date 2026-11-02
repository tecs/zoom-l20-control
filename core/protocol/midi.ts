/** A 3-byte MIDI channel message every desk control is sent as */
export interface ShortMessage {
  /** type + channel */
  status: number;
  /** data byte 1 */
  d1: number;
  /** data byte 2 */
  d2: number;
}
