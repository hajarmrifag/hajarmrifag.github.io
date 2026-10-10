import { CatmullRomCurve3, Vector3 } from "three";

/** Control points: approach, threshold, nameplate, then one stop per project. */
const POSITIONS = [
  new Vector3(-4.8, 3.1, 8.6),
  new Vector3(-2.4, 2.15, 5.8),
  new Vector3(-0.8, 1.52, 3.7),
  new Vector3(0, 1.46, 3.15),
  new Vector3(2.2, 1.46, 3.15),
  new Vector3(4.4, 1.46, 3.15),
  new Vector3(6.6, 1.46, 3.15),
  new Vector3(8.8, 1.46, 3.15),
  new Vector3(11, 1.46, 3.15),
];

const TARGETS = [
  new Vector3(1.5, 0.4, 0),
  new Vector3(0.2, 0.45, 0),
  new Vector3(-1.15, 0.5, 0.15),
  new Vector3(0, 0.5, 0),
  new Vector3(2.2, 0.5, 0),
  new Vector3(4.4, 0.5, 0),
  new Vector3(6.6, 0.5, 0),
  new Vector3(8.8, 0.5, 0),
  new Vector3(11, 0.5, 0),
];

const INTRO_POINTS = 3;
const POINT_COUNT = POSITIONS.length;

export const INTRO_SECONDS = 6.5;
export const SKIP_SECONDS = 0.33;
export const STATION_SECONDS = 1.15;
export const SETTLED_U = (INTRO_POINTS - 1) / (POINT_COUNT - 1);

const positionCurve = new CatmullRomCurve3(POSITIONS, false, "catmullrom", 0.35);
const targetCurve = new CatmullRomCurve3(TARGETS, false, "catmullrom", 0.35);

export function stationU(index: number): number {
  return (INTRO_POINTS + index) / (POINT_COUNT - 1);
}

export function sampleRail(u: number, position: Vector3, target: Vector3): void {
  const t = Math.min(1, Math.max(0, u));
  positionCurve.getPoint(t, position);
  targetCurve.getPoint(t, target);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function railPoints(): Vector3[] {
  return positionCurve.getPoints(48);
}
