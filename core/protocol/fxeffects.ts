// Per-effect FX knob metadata, indexed [fxIndex][effectIndex]

/** [knob1Min, knob1Max, knob2Min, knob2Max] */
export const FX_RANGES: readonly (readonly [number, number, number, number])[][] = [
  [
    // FX1: Hall1 Hall2 Room1 Plate Church DrumAmb GateRev Vocal1 Vocal2 Vocal3
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 50],
    [9, 499, 0, 100],
    [9, 499, 0, 100],
    [9, 499, 0, 100],
  ],
  [
    // FX2: Hall3 Room2 Spring Delay Analog P-P-Delay Vocal4 Chorus1 Chorus2 Cho+Dly
    [0, 100, 0, 34],
    [0, 100, 1, 29],
    [0, 100, 1, 29],
    [9, 999, 0, 100],
    [9, 999, 0, 100],
    [9, 999, 0, 100],
    [9, 329, 1, 29],
    [0, 100, 1, 49],
    [0, 100, 0, 24],
    [49, 799, 1, 49],
  ],
];

/** Displayed knob ranges: [knob1Min, knob1Max, knob2Min, knob2Max] */
export const FX_DISPLAY: readonly (readonly [number, number, number, number])[][] = [
  [
    // FX1
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 0, 100],
    [0, 100, 34, 100],
    [10, 500, 0, 100],
    [10, 500, 0, 100],
    [10, 500, 0, 100],
  ],
  [
    // FX2
    [0, 100, 0, 34],
    [0, 100, 1, 29],
    [0, 100, 1, 29],
    [10, 1000, 0, 100],
    [10, 1000, 0, 100],
    [10, 1000, 0, 100],
    [10, 330, 1, 29],
    [0, 100, 1, 49],
    [0, 100, 0, 24],
    [50, 800, 1, 49],
  ],
];

export const FX_KNOB_LABELS: readonly (readonly [string, string])[][] = [
  [
    // FX1
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Time', 'Decay'],
    ['Time', 'Decay'],
    ['Time', 'Decay'],
  ],
  [
    // FX2
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Tone', 'Decay'],
    ['Time', 'Feedback'],
    ['Time', 'Feedback'],
    ['Time', 'Feedback'],
    ['Time', 'Decay'],
    ['Tone', 'Rate'],
    ['Tone', 'Rate'],
    ['Time', 'Rate'],
  ],
];

export const FX_DESCRIPTIONS: readonly (readonly string[])[] = [
  [
    // FX1
    'Hall reverb with a bright tone',
    'Hall reverb with a long time for early reflections',
    'Dense room reverb',
    'Plate reverb simulation',
    'Reverb that simulates the sound of a church',
    'Reverb that adds a natural ambiance (air sound) to drums',
    'Special reverb suited to percussive performances',
    'Very useful effect that combines delay with hall reverb',
    'Effect that combines delay with mono output reverb',
    'Effect that combines delay suitable for ballads with plate reverb',
  ],
  [
    // FX2
    'Hall reverb that simulates an arena-sized venue',
    'Room reverb with coarse reflections',
    'Spring reverb simulation',
    'Digital delay with a clear tone',
    'Warm analog delay simulation',
    'Effect that outputs delay sound alternately left and right',
    'Effect that combines delay suitable for rock with room reverb',
    'Stereo chorus with a clear wide quality',
    'Mono chorus with low variation useful for many applications',
    'Effect that combines chorus and delay',
  ],
];

export const fxKnobDefault = (fxIndex: number, effectIndex: number, knob: 'tone' | 'decay'): number | null => {
  const range = FX_RANGES[fxIndex]?.[effectIndex];
  if (!range) {
    return null;
  }
  const [toneMin, toneMax, decayMin, decayMax] = range;
  return knob === 'tone' ? Math.round((toneMin + toneMax) / 2) : Math.round((decayMin + decayMax) / 2);
};

export interface FxKnobSpec {
  label: string;
  wire: readonly [min: number, max: number];
  display: readonly [min: number, max: number];
}

const DEFAULT_KNOBS: Record<'tone' | 'decay', FxKnobSpec> = {
  tone: { label: 'Tone', wire: [0, 100], display: [0, 100] },
  decay: { label: 'Decay', wire: [0, 100], display: [0, 100] },
};

export const fxKnob = (fxIndex: number, effectIndex: number, knob: 'tone' | 'decay'): FxKnobSpec => {
  const wire = FX_RANGES[fxIndex]?.[effectIndex];
  const display = FX_DISPLAY[fxIndex]?.[effectIndex];
  const labels = FX_KNOB_LABELS[fxIndex]?.[effectIndex];
  if (!wire || !display || !labels) {
    return DEFAULT_KNOBS[knob];
  }

  const [toneMin, toneMax, decayMin, decayMax] = wire;
  const [toneShownMin, toneShownMax, decayShownMin, decayShownMax] = display;
  const [toneLabel, decayLabel] = labels;
  return knob === 'tone'
    ? { label: toneLabel, wire: [toneMin, toneMax], display: [toneShownMin, toneShownMax] }
    : { label: decayLabel, wire: [decayMin, decayMax], display: [decayShownMin, decayShownMax] };
};
