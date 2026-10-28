import { CatmullRomCurve3, Vector3 } from "three";
import { CLOSE, CLOSE_POSE, NAMEPLATE, STANDING, STATION_X } from "./layout";

/** Threshold, lamp, nameplate, rest, then one standing stop per project. */
const POSITIONS = [
  new Vector3(-2.15, 1.62, 3.25),
  new Vector3(-1.35, 1.6, 3.05),
  new Vector3(-0.7, 1.59, 2.92),
  new Vector3(-0.35, 1.58, 2.85),
  ...STATION_X.map((x) => new Vector3(x, STANDING.y, STANDING.z)),
];

const TARGETS = [
  new Vector3(0.8, 1.55, -3.8),
  new Vector3(-1.5, 1.12, -0.5),
  new Vector3(NAMEPLATE.x, NAMEPLATE.y, NAMEPLATE.z),
  new Vector3(NAMEPLATE.x, NAMEPLATE.y, NAMEPLATE.z),
  ...STATION_X.map((x) => new Vector3(x, STANDING.lookY, STANDING.lookZ)),
];

const INTRO_POINTS = 4;
const POINT_COUNT = POSITIONS.length;

export const INTRO_SECONDS = 6.5;
export const SKIP_SECONDS = 0.33;
export const STATION_SECONDS = 1.15;
export const APPROACH_SECONDS = 1.8;
export const LEAVE_SECONDS = 0.9;
export const SETTLED_U = (INTRO_POINTS - 1) / (POINT_COUNT - 1);

const positionCurve = new CatmullRomCurve3(POSITIONS, false, "catmullrom", 0.35);
const targetCurve = new CatmullRomCurve3(TARGETS, false, "catmullrom", 0.35);
const closePosition = new Vector3();
const closeTarget = new Vector3();

export function stationU(index: number): number {
  return (INTRO_POINTS + index) / (POINT_COUNT - 1);
}

export function stationIndexAt(u: number): number {
  const along = u * (POINT_COUNT - 1) - INTRO_POINTS;
  const index = Math.round(along);
  if (index < 0 || index > 5 || Math.abs(along - index) > 0.04) return -1;
  return index;
}

export function sampleRail(u: number, position: Vector3, target: Vector3): void {
  const t = Math.min(1, Math.max(0, u));
  positionCurve.getPoint(t, position);
  targetCurve.getPoint(t, target);
}

/** Rail pose, then a blend toward the close view when `approach` is above zero. */
export function sampleView(u: number, approach: number, position: Vector3, target: Vector3): void {
  sampleRail(u, position, target);
  if (approach <= 0) return;
  const index = stationIndexAt(u);
  if (index < 0) return;
  const x = STATION_X[index] ?? 0;
  const pose = CLOSE_POSE[index] ?? CLOSE_POSE[0];
  closePosition.set(x, pose.y, pose.z);
  closeTarget.set(x, pose.lookY, CLOSE.lookZ);
  position.lerp(closePosition, approach);
  target.lerp(closeTarget, approach);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
