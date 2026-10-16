import { Mesh, PlaneGeometry, Scene } from "three";
import { addCityNight } from "./city";
import { ROOM, STATION_X } from "./layout";
import { addBox, type SceneBin } from "./props";
import type { StudioPalette } from "./surfaces";

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
  pane.renderOrder = 1;
  scene.add(pane);
}

/** Concrete shell, tall windows, and the city beyond the glass. */
export function addArchitecture(bin: SceneBin, scene: Scene, palette: StudioPalette): void {
  addCityNight(bin, scene);

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
