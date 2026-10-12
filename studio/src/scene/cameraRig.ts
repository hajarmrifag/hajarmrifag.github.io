import type { Vector3 } from "three";
import { easeInOutCubic, sampleView } from "./rail";

type Ease = (t: number) => number;

class Channel {
  value = 0;
  private from = 0;
  private to = 0;
  private elapsed = 0;
  private duration = 0;
  private ease: Ease = easeInOutCubic;
  private active = false;

  seek(value: number): void {
    this.value = value;
    this.active = false;
  }

  animateTo(value: number, seconds: number, ease: Ease): void {
    if (seconds <= 0 || Math.abs(value - this.value) < 0.0001) {
      this.seek(value);
      return;
    }
    this.from = this.value;
    this.to = value;
    this.elapsed = 0;
    this.duration = seconds;
    this.ease = ease;
    this.active = true;
  }

  get moving(): boolean {
    return this.active;
  }

  tick(delta: number): boolean {
    if (!this.active) return false;
    this.elapsed += delta;
    const t = Math.min(1, this.elapsed / this.duration);
    this.value = this.from + (this.to - this.from) * this.ease(t);
    if (t >= 1) {
      this.value = this.to;
      this.active = false;
    }
    return this.active;
  }
}

/** Scrubs the shared rail and the sit-down blend. Idle when both settle. */
export class CameraRig {
  private readonly along = new Channel();
  private readonly closeness = new Channel();

  get u(): number {
    return this.along.value;
  }

  get approach(): number {
    return this.closeness.value;
  }

  seek(u: number): void {
    this.along.seek(u);
  }

  seekApproach(amount: number): void {
    this.closeness.seek(amount);
  }

  animateTo(u: number, seconds: number, ease: Ease = easeInOutCubic): void {
    this.along.animateTo(u, seconds, ease);
  }

  animateApproach(amount: number, seconds: number, ease: Ease = easeInOutCubic): void {
    this.closeness.animateTo(amount, seconds, ease);
  }

  get isMoving(): boolean {
    return this.along.moving || this.closeness.moving;
  }

  tick(delta: number): boolean {
    const along = this.along.tick(delta);
    const closeness = this.closeness.tick(delta);
    return along || closeness;
  }

  apply(position: Vector3, target: Vector3): void {
    sampleView(this.u, this.approach, position, target);
  }
}
