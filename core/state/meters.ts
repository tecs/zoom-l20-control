import { Publisher } from '../../lib/publisher.ts';
import type { MeterFrame } from '../messaging/meters.ts';

export class MeterStore extends Publisher<[frame: MeterFrame]> {
  private latest: MeterFrame | null = null;

  get(): MeterFrame | null {
    return this.latest;
  }

  update(frame: MeterFrame): void {
    this.latest = frame;
    this.emit(frame);
  }
}
