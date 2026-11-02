import { Index, createEffect, type Accessor } from 'solid-js';
import type { ChannelMeter } from '../../core/messaging/meters.ts';

export interface Peaks {
  show: () => boolean;
  holdMs: () => number;
}

type MeterProps = {
  meter: Accessor<ChannelMeter | undefined>;
  bars: number;
  peaks?: Peaks;
};

type BarState = {
  percent: number;
  peakPercent: number;
  peakAt: number;
  faded: boolean;
  peakOn: boolean;
};

const PEAK_FADE_MS = 400;
/** Minimum signal threshold % above which peaks are rendered to avoid activating on noise floor */
const PEAK_FLOOR = 2;

export function Meter(props: MeterProps) {
  const fills: (HTMLDivElement | undefined)[] = [];
  const marks: (HTMLDivElement | undefined)[] = [];

  const barStates: BarState[] = [];
  const stateAt = (index: number): BarState => {
    barStates[index] ??= {
      percent: 0,
      peakPercent: -1,
      peakAt: 0,
      faded: false,
      peakOn: false,
    };
    return barStates[index];
  };

  const paint = (fillEl: HTMLDivElement | undefined, barState: BarState, value = 0): void => {
    if (!fillEl) {
      return;
    }

    const percent = Math.min(100, Math.round(value * 100));
    fillEl.style.transitionDuration = percent > barState.percent ? '0ms' : ''; // 0ms - instant attack, empty - decay
    barState.percent = percent;
    fillEl.style.height = `${percent}%`;

    if (value >= 0.95) {
      fillEl.style.background = 'var(--bad)';
    } else if (value >= 0.75) {
      fillEl.style.background = 'var(--warn)';
    } else {
      fillEl.style.background = 'var(--good)';
    }
  };

  const mark = (markEl: HTMLDivElement | undefined, barState: BarState, value = 0, now: number): void => {
    if (!markEl) {
      return;
    }

    // Disable
    const peaks = props.peaks;
    if (!peaks || !peaks.show()) {
      if (barState.peakOn) {
        markEl.style.display = 'none';
        barState.peakOn = false;
      }
      return;
    }

    // Enable
    if (!barState.peakOn) {
      markEl.style.display = 'block';
      barState.peakOn = true;
      barState.peakPercent = -1;
      barState.faded = false;
      markEl.style.transitionDuration = '0ms';
      markEl.style.opacity = '0';
    }

    // New peak
    const percent = Math.min(100, Math.round(value * 100));
    if (percent >= Math.max(barState.peakPercent, PEAK_FLOOR)) {
      barState.peakPercent = percent;
      barState.peakAt = now;
      barState.faded = false;
      markEl.style.bottom = percent + '%';
      markEl.style.transitionDuration = '0ms';
      markEl.style.opacity = '1';
      return;
    }

    // Fully faded
    const age = now - barState.peakAt;
    if (age >= peaks.holdMs() + PEAK_FADE_MS) {
      barState.peakPercent = -1;
      return;
    }

    // Fade
    if (!barState.faded && age >= peaks.holdMs()) {
      barState.faded = true;
      markEl.style.transitionDuration = PEAK_FADE_MS + 'ms';
      markEl.style.opacity = '0';
    }
  };

  createEffect(() => {
    const meter = props.meter();
    const values = meter ? [...meter.pre, ...meter.post] : [];
    const now = performance.now();

    for (let i = 0; i < props.bars; i++) {
      paint(fills[i], stateAt(i), values[i]);
      mark(marks[i], stateAt(i), values[i], now);
    }
  });

  return (
    <div class="meter">
      <Index each={Array(props.bars)}>
        {(_, index) => (
          <div class="meter-bar">
            <div class="meter-fill" ref={(el) => (fills[index] = el)} />
            <div class="meter-peak" ref={(el) => (marks[index] = el)} />
          </div>
        )}
      </Index>
    </div>
  );
}
