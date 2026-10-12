import { CanvasTexture, Color, Mesh, NoColorSpace, PlaneGeometry, Scene } from "three";
import { ROOM, STATION_X } from "./layout";
import { addBox, canvasTexture, type SceneBin } from "./props";
import type { StudioPalette } from "./surfaces";

const NIGHT = new Color("#0c1016");

/**
 * Tiny occupied windows on a dark facade. Glow and color passes share one seed.
 * `stretch` keeps a window square on the tall mesh so it cannot bloom into an orb.
 * Farther facades are slightly smaller and dimmer.
 */
function cityPattern(
  seed: number,
  glow: boolean,
  blur: number,
  stretch: number,
): (context: CanvasRenderingContext2D) => void {
  return (context) => {
    const { width, height } = context.canvas;
    if (glow) {
      context.fillStyle = "#101820";
      context.fillRect(0, 0, width, height);
    } else {
      context.fillStyle = "#c5ced6";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(36, 44, 54, 0.42)";
      context.fillRect(0, 0, width, height * 0.2);
      context.fillStyle = "rgba(28, 34, 42, 0.3)";
      context.fillRect(width * ((seed % 5) * 0.14), 0, width * 0.16, height);
    }
    let state = seed * 997 + 17;
    const next = () => {
      state = (state * 16807 + 11) % 2147483647;
      return state / 2147483647;
    };
    const floors = 7 + Math.floor(next() * 3);
    for (let floor = 0; floor < floors; floor += 1) {
      const yJitter = next();
      const columns = 4 + Math.floor(next() * 3);
      const rowLit = next();
      const rowY = height * (0.34 + ((floor + yJitter * 0.28) / floors) * 0.6);
      for (let col = 0; col < columns; col += 1) {
        const xJitter = next();
        const sizeJitter = next();
        const warm = next() > 0.33;
        const strength = 0.22 + next() * 0.78;
        if (rowLit < 0.12 || xJitter < 0.1) continue;
        const halfH = (1.25 + sizeJitter * 1.05) * (1 - blur * 0.2);
        const halfW = Math.min(halfH * stretch * (0.8 + sizeJitter * 0.35), 8);
        const x = width * ((col + 0.42 + (xJitter - 0.5) * 0.42) / columns);
        const y = rowY + (sizeJitter - 0.5) * 4;
        if (glow) {
          context.fillStyle = warm ? "#c4a27a" : "#8aa4b8";
          context.globalAlpha = strength * (0.16 + (1 - blur) * 0.06);
          context.fillRect(x - halfW - 1, y - halfH - 0.8, (halfW + 1) * 2, (halfH + 0.8) * 2);
          context.fillStyle = warm ? "#ffe3c4" : "#d5e4f2";
          context.globalAlpha = strength * (0.72 + (1 - blur) * 0.22);
          context.fillRect(x - halfW, y - halfH, halfW * 2, halfH * 2);
        } else {
          context.fillStyle = warm ? "#6a6258" : "#556270";
          context.globalAlpha = 0.35;
          context.fillRect(x - halfW, y - halfH, halfW * 2, halfH * 2);
        }
      }
    }
    context.globalAlpha = 1;
  };
}

/** Glow is stored linear so the soft falloff is not crushed by an sRGB decode. */
function cityGlow(bin: SceneBin, seed: number, blur: number, stretch: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  if (context) cityPattern(seed, true, blur, stretch)(context);
  const texture = bin.raw(new CanvasTexture(canvas));
  texture.colorSpace = NoColorSpace;
  return texture;
}

function addWindow(
  bin: SceneBin,
  scene: Scene,
  x: number,
  width: number,
  palette: StudioPalette,
): void {
  const y = (ROOM.sill + ROOM.windowTop) / 2;
  const height = ROOM.windowTop - ROOM.sill;
  const z = ROOM.zBack + 0.08;
  addBox(bin, scene, width + 0.08, 0.06, 0.1, x, ROOM.sill, z, palette.frame);
  addBox(bin, scene, width + 0.08, 0.06, 0.1, x, ROOM.windowTop, z, palette.frame);
  addBox(bin, scene, 0.06, height, 0.1, x - width / 2, y, z, palette.frame);
  addBox(bin, scene, 0.06, height, 0.1, x + width / 2, y, z, palette.frame);
  addBox(bin, scene, 0.04, height, 0.06, x, y, z, palette.frame);
  const casingZ = z + 0.07;
  addBox(bin, scene, width + 0.2, 0.04, 0.045, x, ROOM.windowTop + 0.012, casingZ, palette.frame);
  addBox(bin, scene, 0.04, height + 0.02, 0.045, x - width / 2 - 0.03, y, casingZ, palette.frame);
  addBox(bin, scene, 0.04, height + 0.02, 0.045, x + width / 2 + 0.03, y, casingZ, palette.frame);
  addBox(bin, scene, width + 0.02, 0.028, 0.12, x, ROOM.sill + 0.012, z + 0.07, palette.pier);
  addBox(bin, scene, width - 0.04, 0.006, 0.008, x, ROOM.sill + 0.028, z + 0.125, palette.brass);
  const pane = new Mesh(bin.geo(new PlaneGeometry(width - 0.08, height - 0.08)), palette.windowGlass);
  pane.position.set(x, y, z + 0.02);
  scene.add(pane);
}

function addCity(bin: SceneBin, scene: Scene, palette: StudioPalette): void {
  const specs = [
    { x: -2.4, w: 1.8, h: 6.2, z: -6.4, seed: 3 },
    { x: -0.2, w: 2.2, h: 8.4, z: -7.6, seed: 11 },
    { x: 2.2, w: 1.6, h: 5.1, z: -6.1, seed: 19 },
    { x: 4.3, w: 2.4, h: 9.2, z: -8.1, seed: 29 },
    { x: 6.8, w: 1.7, h: 6.6, z: -6.5, seed: 37 },
    { x: 8.9, w: 2.1, h: 7.8, z: -7.4, seed: 47 },
    { x: 11.2, w: 1.9, h: 5.4, z: -6.2, seed: 53 },
    { x: 13.2, w: 1.5, h: 4.4, z: -7.1, seed: 61 },
  ];
  for (const spec of specs) {
    const distance = Math.min(1, Math.max(0, (-spec.z - 6) / 2.2));
    const stretch = (spec.h / spec.w) * (256 / 384);
    const map = canvasTexture(bin, 256, 384, cityPattern(spec.seed, false, distance, stretch));
    const windows = cityGlow(bin, spec.seed, distance, stretch);
    addBox(
      bin,
      scene,
      spec.w,
      spec.h,
      1.4,
      spec.x,
      spec.h / 2 - 0.2,
      spec.z,
      palette.city(map, windows, 0.82 - distance * 0.22),
    );
  }
}

/** Concrete shell, tall windows, and the city beyond the glass. */
export function addArchitecture(bin: SceneBin, scene: Scene, palette: StudioPalette): void {
  scene.background = NIGHT;

  addCity(bin, scene, palette);

  const floorWidth = ROOM.x1 - ROOM.x0 + 2;
  const floorDepth = 12;
  const floor = addBox(bin, scene, floorWidth, 0.18, floorDepth, (ROOM.x0 + ROOM.x1) / 2, -0.09, 1.2, palette.concrete);
  floor.receiveShadow = true;
  for (const seam of [-1.2, 1.6, 4.4]) {
    addBox(bin, scene, floorWidth - 0.4, 0.01, 0.025, (ROOM.x0 + ROOM.x1) / 2, 0.005, seam, palette.pier);
  }

  const wallZ = ROOM.zBack;
  const span = ROOM.x1 - ROOM.x0;
  addBox(bin, scene, span, ROOM.sill, 0.16, (ROOM.x0 + ROOM.x1) / 2, ROOM.sill / 2, wallZ, palette.wall);
  addBox(
    bin,
    scene,
    span,
    ROOM.height - ROOM.windowTop,
    0.16,
    (ROOM.x0 + ROOM.x1) / 2,
    (ROOM.height + ROOM.windowTop) / 2,
    wallZ,
    palette.wall,
  );

  addWindow(bin, scene, -1.7, 1.7, palette);
  for (const x of STATION_X) addWindow(bin, scene, x, 1.45, palette);

  const depth = ROOM.zFront - ROOM.zBack;
  const sideZ = (ROOM.zFront + ROOM.zBack) / 2;
  addBox(bin, scene, 0.16, ROOM.height, depth, ROOM.x0, ROOM.height / 2, sideZ, palette.wall);
  addBox(bin, scene, 0.16, ROOM.height, depth, ROOM.x1, ROOM.height / 2, sideZ, palette.wall);
  addBox(
    bin,
    scene,
    span,
    0.12,
    depth,
    (ROOM.x0 + ROOM.x1) / 2,
    ROOM.height,
    sideZ,
    palette.pier,
  );

  const base = 0.08;
  addBox(bin, scene, span, base, 0.035, (ROOM.x0 + ROOM.x1) / 2, base / 2, wallZ + 0.1, palette.frame);
  addBox(bin, scene, span, 0.012, 0.012, (ROOM.x0 + ROOM.x1) / 2, base + 0.004, wallZ + 0.112, palette.brass);
  addBox(bin, scene, 0.035, base, depth - 0.2, ROOM.x0 + 0.1, base / 2, sideZ, palette.frame);
  addBox(bin, scene, 0.035, base, depth - 0.2, ROOM.x1 - 0.1, base / 2, sideZ, palette.frame);
  addBox(bin, scene, span - 0.3, 0.035, 0.05, (ROOM.x0 + ROOM.x1) / 2, ROOM.height - 0.02, wallZ + 0.1, palette.frame);
}
