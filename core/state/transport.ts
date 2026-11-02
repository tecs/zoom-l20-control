import { Publisher } from '../../lib/publisher.ts';
import type { TransportMessage, PlayheadField } from '../protocol/transport.ts';
import { assertNever } from '../protocol/valuetypes.ts';

export class TransportState extends Publisher<[]> {
  private stateByte = 0;
  private isOverdub = false;
  private rawPlayhead: Record<PlayheadField, number> = { hHi: 0, hLo: 0, m: 0, s: 0 };

  get state(): number {
    return this.stateByte;
  }

  get overdub(): boolean {
    return this.isOverdub;
  }

  get playhead(): { h: number; m: number; s: number } {
    return { h: this.rawPlayhead.hHi * 128 + this.rawPlayhead.hLo, m: this.rawPlayhead.m, s: this.rawPlayhead.s };
  }

  apply(message: TransportMessage): void {
    switch (message.kind) {
      case 'state':
        if (message.value !== this.stateByte) {
          this.stateByte = message.value;
          this.emit();
        }
        break;
      case 'overdub':
        if (message.value !== this.isOverdub) {
          this.isOverdub = message.value;
          this.emit();
        }
        break;
      case 'playhead':
        if (message.field in this.rawPlayhead && this.rawPlayhead[message.field] !== message.value) {
          this.rawPlayhead[message.field] = message.value;
          this.emit();
        }
        break;
      case 'mode':
      case 'other':
        // not tracked
        break;
      default:
        assertNever(message);
    }
  }
}
