import { Publisher } from '../../lib/publisher.ts';

export interface SceneStatus {
  on: boolean;
  active: number | null;
}

export class SceneState extends Publisher<[status: SceneStatus]> {
  private status: SceneStatus = { on: false, active: null };

  get on(): boolean {
    return this.status.on;
  }

  get active(): number | null {
    return this.status.active;
  }

  setOn(on: boolean): void {
    if (on !== this.status.on) {
      this.status.on = on;
      this.emit({ ...this.status });
    }
  }

  setActive(n: number | null): void {
    if (n !== this.status.active) {
      this.status.active = n;
      this.emit({ ...this.status });
    }
  }
}
