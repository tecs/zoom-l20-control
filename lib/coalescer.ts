/**
 * Collapses runs of identical values - the first one is reported at once,
 * repeats inside thewindow are only counted, then reported as one summary
 * when the window closes or a different value arrives.
 */
export class Coalescer<T> {
  private readonly windowMs: number;
  private readonly report: (value: T, repeats: number) => void;
  private last: T | undefined;
  private repeats = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(windowMs: number, report: (value: T, repeats: number) => void) {
    this.windowMs = windowMs;
    this.report = report;
  }

  push(value: T): void {
    if (this.timer !== undefined && value === this.last) {
      this.repeats++;
      return;
    }
    this.flush();
    this.last = value;
    this.report(value, 0);
    this.arm();
  }

  /** Report any swallowed repeats now and close the window. */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.reportRepeats();
  }

  private arm(): void {
    this.timer = setTimeout(() => this.windowEnd(), this.windowMs);
  }

  private windowEnd(): void {
    this.timer = undefined;
    if (this.repeats > 0) {
      this.reportRepeats();
      this.arm(); // still bursting: keep coalescing
    }
  }

  private reportRepeats(): void {
    const { repeats } = this;
    if (repeats > 0) {
      this.repeats = 0;
      this.report(this.last as T, repeats);
    }
  }
}
