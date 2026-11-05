// Raw captured BLE-MIDI notification packets

const packets = (...hex: string[]): Uint8Array[] =>
  hex.map((packet) => Uint8Array.from(packet.match(/../g) ?? [], (byte) => parseInt(byte, 16)));

/** A meter frame with two FX2 decay packets (`BE`/`BF 4E`) landing in the middle of it */
export const ccsInsideMeterFrame = packets(
  'b1f4f05200003104000000000000000000000000',
  'b100000000000000000000000000000000000000',
  '82edbe4e00edbf4e06',
  '82f3be4e00f3bf4e04',
  'b100000000000000000000000000000000000000',
  'b100fbf7',
);

/** A 2nd meter frame starting before the 1st ends */
export const orphanedMeterFrameStart = packets(
  'afb4f05200003104000000000000000000000000',
  'af00000000000000000000000000000000000000',
  'af00000000000000000000000000000000000000',
  '80b4f05200003104000000000000000000000000',
  'af00baf7',
);

/** Two meter frames interleaved packet by packet, with FX1 tone packets between them */
export const interleavedMeterFrames = packets(
  'bbb4f05200003104000000000000000000000000',
  'bb00000000000000000000000000000000000000',
  'bb00000000000000000000000000000000000000',
  '8cb4f05200003104000000000000000000000000',
  '8c00000000000000000000000000000000000000',
  'bb00bcf7',
  'bbbdb64e00bdb74e64',
  'bbd2b64e00d2b74e64',
  '8c00000000000000000000000000000000000000',
  '8c00bcf7',
);
