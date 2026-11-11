// Relative drag over an integer range

export interface Range {
  min: number;
  max: number;
}

export interface DragOptions {
  travel: number;
}

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

export class ValueDrag {
  private readonly range: Range;
  private readonly perPx: number;
  private exact: number;
  private position: number;

  constructor(value: number, position: number, range: Range, { travel }: DragOptions) {
    this.range = range;
    this.perPx = (range.max - range.min) / travel;
    this.exact = clamp(value, range);
    this.position = position;
  }

  move(position: number, scale = 1): number {
    const px = position - this.position;
    this.position = position;

    const from = this.exact;
    const to = clamp(from + px * this.perPx * scale, this.range);

    this.exact = to;

    return this.value;
  }

  get value(): number {
    return Math.round(this.exact);
  }
}
