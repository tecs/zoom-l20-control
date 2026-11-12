// Relative drag over an integer range

export interface Range {
  min: number;
  max: number;
}

export interface DragOptions {
  travel: number;
  snaps?: readonly number[];
  snapPx?: number;
}

type Detent = { point: number; offset: number };

export const clamp = (value: number, { min, max }: Range): number => Math.min(max, Math.max(min, value));

export const stepValue = (value: number, steps: number, range: Range): number =>
  clamp(Math.round(value) + steps, range);

export const keySteps = (key: string): number => {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return 1;
    case 'ArrowDown':
    case 'ArrowLeft':
      return -1;
    default:
      return 0;
  }
};

export const FINE_SCALE = 0.1;

const SIDEWAYS_FREE_PX = 50;

export const sidewaysScale = (px: number): number => {
  const distance = Math.abs(px);
  return distance <= SIDEWAYS_FREE_PX ? 1 : Math.max(FINE_SCALE, Math.pow(SIDEWAYS_FREE_PX / distance, 2));
};

export class ValueDrag {
  private readonly range: Range;
  private readonly perPx: number;
  private readonly snaps: readonly number[];
  private readonly snapPx: number;
  private exact: number;
  private position: number;
  private detent: Detent | undefined;

  constructor(value: number, position: number, range: Range, { travel, snaps = [], snapPx = 0 }: DragOptions) {
    this.range = range;
    this.perPx = (range.max - range.min) / travel;
    this.snaps = snaps;
    this.snapPx = snapPx;
    this.exact = clamp(value, range);
    this.position = position;
    this.detent = snaps.includes(this.exact) ? { point: this.exact, offset: 0 } : undefined;
  }

  move(position: number, scale = 1): number {
    let px = position - this.position;
    this.position = position;

    const fine = scale < 1;
    if (fine && this.detent) {
      this.exact = this.detent.point;
      this.detent = undefined;
    }

    while (px !== 0) {
      px = this.detent ? this.holdDetent(this.detent, px) : this.slide(px, scale, fine ? [] : this.snaps);
    }
    return this.value;
  }

  get value(): number {
    return this.detent?.point ?? Math.round(this.exact);
  }

  private holdDetent(detent: Detent, px: number): number {
    const offset = detent.offset + px;
    if (Math.abs(offset) <= this.snapPx) {
      detent.offset = offset;
      return 0;
    }
    this.exact = detent.point;
    this.detent = undefined;
    return offset - Math.sign(offset) * this.snapPx;
  }

  private slide(px: number, scale: number, snaps: readonly number[]): number {
    const from = this.exact;
    const to = clamp(from + px * this.perPx * scale, this.range);
    const [point] = snaps
      .filter((snap) => (from < snap && snap <= to) || (to <= snap && snap < from))
      .sort((a, b) => Math.abs(a - from) - Math.abs(b - from));

    if (point === undefined) {
      this.exact = to;
      return 0;
    }
    this.detent = { point, offset: 0 };
    return px - (point - from) / (this.perPx * scale);
  }
}
