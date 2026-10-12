import {
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
} from "three";
import { ROOM, STATION_X } from "./layout";
import { addBox, canvasTexture, type SceneBin } from "./props";

const NIGHT = new Color("#10141c");

function cityPattern(context: CanvasRenderingContext2D): void {
  const { width, height } = context.canvas;
  context.fillStyle = "#161b26";
  context.fillRect(0, 0, width, height);
  let n = 1;
  for (let y = 10; y < height - 8; y += 16) {
    for (let x = 8; x < width - 8; x += 14) {
      n += 1;
      const roll = Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
      if (roll > 0.62) continue;
      context.globalAlpha = 0.4 + (roll % 0.5);
      context.fillStyle = roll > 0.85 ? "#d5e2f5" : "#e4b56d";
      context.fillRect(x, y, 6, 8);
    }
  }
  context.globalAlpha = 1;
}

function addWindow(
  bin: SceneBin,
  scene: Scene,
  x: number,
  width: number,
  frame: MeshLambertMaterial,
  glass: MeshBasicMaterial,
): void {
  const y = (ROOM.sill + ROOM.windowTop) / 2;
  const height = ROOM.windowTop - ROOM.sill;
  const z = ROOM.zBack + 0.08;
  addBox(bin, scene, width + 0.08, 0.06, 0.1, x, ROOM.sill, z, frame);
  addBox(bin, scene, width + 0.08, 0.06, 0.1, x, ROOM.windowTop, z, frame);
  addBox(bin, scene, 0.06, height, 0.1, x - width / 2, y, z, frame);
  addBox(bin, scene, 0.06, height, 0.1, x + width / 2, y, z, frame);
  addBox(bin, scene, 0.04, height, 0.06, x, y, z, frame);
  const pane = new Mesh(bin.geo(new PlaneGeometry(width - 0.08, height - 0.08)), glass);
  pane.position.set(x, y, z + 0.02);
  scene.add(pane);
}

function addCity(bin: SceneBin, scene: Scene): void {
  const texture = canvasTexture(bin, 256, 384, cityPattern);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const fronts = [0, 0.2, 0.45, 0.7, 0.15, 0.55, 0.33, 0.82];
  const specs = [
    { x: -2.4, w: 1.8, h: 6.2, z: -6.4 },
    { x: -0.2, w: 2.2, h: 8.4, z: -7.6 },
    { x: 2.2, w: 1.6, h: 5.1, z: -6.1 },
    { x: 4.3, w: 2.4, h: 9.2, z: -8.1 },
    { x: 6.8, w: 1.7, h: 6.6, z: -6.5 },
    { x: 8.9, w: 2.1, h: 7.8, z: -7.4 },
    { x: 11.2, w: 1.9, h: 5.4, z: -6.2 },
    { x: 13.2, w: 1.5, h: 4.4, z: -7.1 },
  ];
  for (const [index, spec] of specs.entries()) {
    const map = bin.tex(texture.clone()) as CanvasTexture;
    map.offset.set(fronts[index] ?? 0, 0);
    map.repeat.set(1, spec.h / 4);
    const material = bin.mat(
      new MeshLambertMaterial({ color: 0x1c2230, map }),
    );
    addBox(bin, scene, spec.w, spec.h, 1.4, spec.x, spec.h / 2 - 0.2, spec.z, material);
  }
}

/** Concrete shell, tall windows, and a blockout city beyond the glass. */
export function addArchitecture(bin: SceneBin, scene: Scene): void {
  scene.background = NIGHT;

  const concrete = bin.mat(new MeshLambertMaterial({ color: 0x3c4048 }));
  const wall = bin.mat(new MeshLambertMaterial({ color: 0x2a2e36 }));
  const pier = bin.mat(new MeshLambertMaterial({ color: 0x343840 }));
  const frame = bin.mat(new MeshLambertMaterial({ color: 0x1a1d24 }));
  const glass = bin.mat(
    new MeshBasicMaterial({
      color: 0xb7c6d6,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );

  addCity(bin, scene);

  const floorWidth = ROOM.x1 - ROOM.x0 + 2;
  const floorDepth = 12;
  addBox(bin, scene, floorWidth, 0.18, floorDepth, (ROOM.x0 + ROOM.x1) / 2, -0.09, 1.2, concrete);
  for (const seam of [-1.2, 1.6, 4.4]) {
    addBox(bin, scene, floorWidth - 0.4, 0.01, 0.025, (ROOM.x0 + ROOM.x1) / 2, 0.005, seam, pier);
  }

  const wallZ = ROOM.zBack;
  const span = ROOM.x1 - ROOM.x0;
  addBox(bin, scene, span, ROOM.sill, 0.16, (ROOM.x0 + ROOM.x1) / 2, ROOM.sill / 2, wallZ, wall);
  addBox(
    bin,
    scene,
    span,
    ROOM.height - ROOM.windowTop,
    0.16,
    (ROOM.x0 + ROOM.x1) / 2,
    (ROOM.height + ROOM.windowTop) / 2,
    wallZ,
    wall,
  );

  addWindow(bin, scene, -1.7, 1.7, frame, glass);
  for (const x of STATION_X) addWindow(bin, scene, x, 1.45, frame, glass);

  const depth = ROOM.zFront - ROOM.zBack;
  const sideZ = (ROOM.zFront + ROOM.zBack) / 2;
  addBox(bin, scene, 0.16, ROOM.height, depth, ROOM.x0, ROOM.height / 2, sideZ, wall);
  addBox(bin, scene, 0.16, ROOM.height, depth, ROOM.x1, ROOM.height / 2, sideZ, wall);
  addBox(
    bin,
    scene,
    span,
    0.12,
    depth,
    (ROOM.x0 + ROOM.x1) / 2,
    ROOM.height,
    sideZ,
    pier,
  );

  addBox(bin, scene, span, 0.08, 0.08, (ROOM.x0 + ROOM.x1) / 2, 0.04, wallZ + 0.12, pier);
}
