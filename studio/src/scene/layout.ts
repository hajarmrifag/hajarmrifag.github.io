/** Shared room coordinates, in meters. The rail and the blockout both read these. */

export const STATION_X = [0, 2.2, 4.4, 6.6, 8.8, 11] as const;

export const BENCH = {
  top: 0.76,
  centerZ: -0.45,
  depth: 0.92,
  x0: -1.75,
  x1: 12.2,
};

export const BENCH_FRONT = BENCH.centerZ + BENCH.depth / 2;

export const NAMEPLATE = {
  x: -1.18,
  y: 0.96,
  z: BENCH_FRONT - 0.16,
};

export const ROOM = {
  x0: -3.7,
  x1: 13.7,
  zBack: -4.2,
  zFront: 3.5,
  height: 3.55,
  sill: 0.28,
  windowTop: 3.12,
};

export const STANDING = { y: 1.58, z: 2.85, lookY: 1.08, lookZ: BENCH.centerZ };

/** Seated framing. Close enough to read the instrument, far enough to keep the bench. */
export const CLOSE = { y: 1.16, z: 1.12, lookZ: BENCH.centerZ + 0.05 };

/** Per station, so a small terminal can sit as large in frame as a tall form. */
export const CLOSE_POSE = [
  { y: 1.16, z: 1.12, lookY: 0.94 },
  { y: 1.14, z: 1.08, lookY: 0.9 },
  { y: 1.14, z: 1.08, lookY: 0.88 },
  { y: 1.02, z: 0.64, lookY: 0.86 },
  { y: 1.14, z: 1.08, lookY: 0.9 },
  { y: 1.14, z: 1.06, lookY: 0.92 },
] as const;
