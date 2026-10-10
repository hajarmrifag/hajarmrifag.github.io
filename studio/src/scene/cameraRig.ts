import type { Vector3 } from "three";
import { easeInOutCubic, sampleRail } from "./rail";

type Ease = (t: number) => number;

/** Scrubs one parameter along the shared rail. Idle when the move finishes. */
export class CameraRig {
  u = 0;
  private from = 0;
  private to = 0;
  private elapsed = 0;
  private duration = 0;
  private ease: Ease = easeInOutCubic;
  private moving = false;

  seek(u: number): void {
    this.u = u;
    this.moving = false;
  }

  animateTo(u: number, seconds: number, ease: Ease = easeInOutCubic): void {
    if (seconds <= 0 || Math.abs(u - this.u) < 0.0001) {
      this.seek(u);
      return;
    }
    this.from = this.u;
    this.to = u;
    this.elapsed = 0;
    this.duration = seconds;
    this.ease = ease;
    this.moving = true;
  }

  get isMoving(): boolean {
    return this.moving;
  }

  tick(delta: number): boolean {
    if (!this.moving) return false;
    this.elapsed += delta;
    const t = Math.min(1, this.elapsed / this.duration);
    this.u = this.from + (this.to - this.from) * this.ease(t);
    if (t >= 1) {
      this.u = this.to;
      this.moving = false;
    }
    return this.moving;
  }

  apply(position: Vector3, target: Vector3): void {
    sampleRail(this.u, position, target);
  }
}
