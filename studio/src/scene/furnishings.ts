import { Group, Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from "three";
import type { Station } from "../content/stations";
import { BENCH, NAMEPLATE, STATION_X } from "./layout";
import { addBox, addCylinder, canvasTexture, type SceneBin } from "./props";

function cast(mesh: Mesh): Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
import type { StudioPalette } from "./surfaces";

const SHORT_NAME: Record<string, string> = {
  sourced: "Sourced",
  aegis: "Aegis",
  gridflex: "GridFlex",
  neobank: "Neobank",
  cuda: "CUDA",
  skyquery: "SkyQuery",
};

function drawName(context: CanvasRenderingContext2D): void {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#c6a15a";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#2a2116";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "600 120px 'Schibsted Grotesk', sans-serif";
  context.fillText("Hajar Mrifag", width / 2, height * 0.4);
  context.fillStyle = "#3e3326";
  context.font = "400 42px 'IBM Plex Mono', ui-monospace, monospace";
  context.fillText("Software Engineering  ·  2027", width / 2, height * 0.68);
}

function drawLabel(text: string): (context: CanvasRenderingContext2D) => void {
  return (context) => {
    const { width, height } = context.canvas;
    context.fillStyle = "#241f1b";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#f4f0e6";
    context.font = "500 64px 'IBM Plex Mono', ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2 + 4);
  };
}

function addNameplate(bin: SceneBin, scene: Scene, palette: StudioPalette): void {
  const texture = canvasTexture(bin, 1024, 512, drawName);
  const face = palette.nameplate(texture);
  const plate = new Mesh(bin.geo(new PlaneGeometry(0.5, 0.22)), face);
  plate.position.set(NAMEPLATE.x, NAMEPLATE.y, NAMEPLATE.z);
  plate.rotation.x = -0.42;
  cast(plate);
  scene.add(plate);
  cast(addBox(bin, scene, 0.52, 0.012, 0.16, NAMEPLATE.x, BENCH.top + 0.008, NAMEPLATE.z + 0.02, palette.brass));
}

function addLamp(
  bin: SceneBin,
  parent: Group,
  x: number,
  shade: MeshStandardMaterial,
  metal: MeshStandardMaterial,
  bulb: MeshStandardMaterial,
): void {
  const z = BENCH.centerZ - 0.18;
  cast(addCylinder(bin, parent, 0.008, 0.22, x, BENCH.top + 0.92, z, metal));
  cast(addBox(bin, parent, 0.16, 0.05, 0.16, x, BENCH.top + 0.78, z, shade));
  cast(addBox(bin, parent, 0.04, 0.03, 0.04, x, BENCH.top + 0.74, z, bulb));
}

function addSourced(bin: SceneBin, group: Group, paper: MeshStandardMaterial, ink: MeshStandardMaterial): void {
  cast(addBox(bin, group, 0.3, 0.38, 0.015, 0, 0.22, 0.06, paper));
  for (const [index, y] of [0.1, 0.17, 0.24, 0.31].entries()) {
    cast(addBox(bin, group, index % 2 === 0 ? 0.2 : 0.12, 0.022, 0.02, -0.02, y, 0.075, index % 2 === 0 ? ink : paper));
  }
}

function addAegis(bin: SceneBin, group: Group, folder: MeshStandardMaterial, stamp: MeshStandardMaterial): void {
  cast(addBox(bin, group, 0.28, 0.22, 0.018, -0.02, 0.16, 0.02, folder));
  cast(addBox(bin, group, 0.28, 0.22, 0.012, 0.03, 0.17, 0.05, folder));
  cast(addCylinder(bin, group, 0.045, 0.02, 0.08, 0.28, 0.08, stamp));
}

function addGridFlex(bin: SceneBin, group: Group, cell: MeshStandardMaterial, tray: MeshStandardMaterial): void {
  cast(addBox(bin, group, 0.34, 0.04, 0.16, 0, 0.03, 0, tray));
  for (const x of [-0.1, 0, 0.1]) cast(addBox(bin, group, 0.07, 0.22, 0.1, x, 0.15, 0, cell));
  cast(addBox(bin, group, 0.22, 0.14, 0.012, 0.02, 0.22, -0.1, tray));
}

function addNeobank(bin: SceneBin, group: Group, body: MeshStandardMaterial, token: MeshStandardMaterial): void {
  cast(addBox(bin, group, 0.28, 0.12, 0.18, 0, 0.08, 0, body));
  cast(addBox(bin, group, 0.16, 0.012, 0.02, 0, 0.145, 0.06, token));
  cast(addCylinder(bin, group, 0.045, 0.012, 0.05, 0.16, 0.02, token));
}

function addCuda(bin: SceneBin, group: Group, glass: MeshStandardMaterial, foot: MeshStandardMaterial): void {
  const plate = new Mesh(bin.geo(new PlaneGeometry(0.34, 0.24)), glass);
  plate.position.set(0, 0.16, 0);
  plate.rotation.x = -0.35;
  cast(plate);
  group.add(plate);
  cast(addBox(bin, group, 0.03, 0.06, 0.03, -0.12, 0.04, 0.04, foot));
  cast(addBox(bin, group, 0.03, 0.06, 0.03, 0.12, 0.04, 0.04, foot));
}

function addSkyQuery(bin: SceneBin, group: Group, left: MeshStandardMaterial, right: MeshStandardMaterial): void {
  const sheetA = cast(addBox(bin, group, 0.16, 0.28, 0.012, -0.1, 0.16, 0, left));
  const sheetB = cast(addBox(bin, group, 0.16, 0.28, 0.012, 0.1, 0.16, 0, right));
  sheetA.rotation.y = 0.18;
  sheetB.rotation.y = -0.18;
}

function addStation(
  bin: SceneBin,
  scene: Scene,
  station: Station,
  index: number,
  palette: StudioPalette,
): void {
  const group = new Group();
  const x = STATION_X[index] ?? 0;
  group.position.set(x, BENCH.top, BENCH.centerZ);
  scene.add(group);
  cast(addBox(bin, group, 0.5, 0.2, 0.015, 0, 0.16, -0.2, palette.carrel));
  const label = new Mesh(
    bin.geo(new PlaneGeometry(0.28, 0.07)),
    palette.plaque(canvasTexture(bin, 512, 128, drawLabel(SHORT_NAME[station.id] ?? station.name))),
  );
  label.position.set(0, 0.045, BENCH.depth / 2 - 0.08);
  label.rotation.x = -0.65;
  cast(label);
  group.add(label);

  if (station.id === "sourced") addSourced(bin, group, palette.paper, palette.ink);
  if (station.id === "aegis") addAegis(bin, group, palette.folder, palette.brass);
  if (station.id === "gridflex") addGridFlex(bin, group, palette.cell, palette.steel);
  if (station.id === "neobank") addNeobank(bin, group, palette.steel, palette.brass);
  if (station.id === "cuda") addCuda(bin, group, palette.plateGlass, palette.steel);
  if (station.id === "skyquery") addSkyQuery(bin, group, palette.paper, palette.folder);
}

function addChair(bin: SceneBin, scene: Scene, cloth: MeshStandardMaterial, metal: MeshStandardMaterial): void {
  const chair = new Group();
  chair.position.set(-2.15, 0, 0.95);
  chair.rotation.y = Math.PI / 2;
  scene.add(chair);
  cast(addBox(bin, chair, 0.46, 0.05, 0.46, 0, 0.48, 0, cloth));
  cast(addBox(bin, chair, 0.46, 0.42, 0.04, 0, 0.72, 0.2, cloth));
  cast(addCylinder(bin, chair, 0.035, 0.36, 0, 0.26, 0, metal));
  cast(addCylinder(bin, chair, 0.26, 0.025, 0, 0.04, 0, metal));
}

function addDesk(bin: SceneBin, scene: Scene, wood: MeshStandardMaterial, steel: MeshStandardMaterial, screen: MeshStandardMaterial): void {
  cast(addBox(bin, scene, 1.2, 0.04, 0.62, -2.7, 0.74, 0.15, wood));
  cast(addBox(bin, scene, 1.08, 0.68, 0.04, -2.7, 0.36, -0.12, steel));
  cast(addBox(bin, scene, 0.2, 0.4, 0.42, -3.15, 0.22, 0.15, steel));
  const monitor = new Group();
  monitor.position.set(-2.7, 0.98, -0.02);
  monitor.rotation.y = -Math.PI / 2;
  scene.add(monitor);
  cast(addBox(bin, monitor, 0.52, 0.32, 0.03, 0, 0, 0, steel));
  const display = new Mesh(bin.geo(new PlaneGeometry(0.46, 0.26)), screen);
  display.position.z = 0.018;
  monitor.add(display);
  cast(addBox(bin, scene, 0.32, 0.015, 0.11, -2.45, 0.77, 0.22, steel));
}

function addShelves(bin: SceneBin, scene: Scene, wood: MeshStandardMaterial, paper: MeshStandardMaterial, steel: MeshStandardMaterial): void {
  const shelf = new Group();
  shelf.position.set(-3.42, 0, -1.7);
  scene.add(shelf);
  cast(addBox(bin, shelf, 0.04, 2.05, 0.32, 0, 1.05, 0, steel));
  cast(addBox(bin, shelf, 0.04, 2.05, 0.32, 0.86, 1.05, 0, steel));
  for (const y of [0.28, 0.72, 1.16, 1.6]) cast(addBox(bin, shelf, 0.86, 0.025, 0.3, 0.43, y, 0, wood));
  cast(addBox(bin, shelf, 0.04, 0.28, 0.2, 0.16, 0.88, 0, paper));
  cast(addBox(bin, shelf, 0.035, 0.32, 0.2, 0.22, 0.9, 0, steel));
  cast(addBox(bin, shelf, 0.05, 0.24, 0.18, 0.3, 0.86, 0, paper));
  cast(addBox(bin, shelf, 0.22, 0.1, 0.16, 0.58, 1.24, 0, steel));
  cast(addBox(bin, shelf, 0.16, 0.16, 0.16, 0.5, 1.76, 0, paper));
}

/** Bench, six station markers, lamps, nameplate, chair, shelves, and the side desk. */
export function addFurnishings(bin: SceneBin, scene: Scene, stations: readonly Station[], palette: StudioPalette): void {
  const length = BENCH.x1 - BENCH.x0;
  const centerX = (BENCH.x0 + BENCH.x1) / 2;
  cast(addBox(bin, scene, length, 0.68, BENCH.depth - 0.06, centerX, 0.36, BENCH.centerZ, palette.steel));
  cast(addBox(bin, scene, length + 0.04, 0.045, BENCH.depth, centerX, BENCH.top - 0.02, BENCH.centerZ, palette.bench));
  cast(addBox(bin, scene, length, 0.06, 0.08, centerX, 0.58, BENCH.centerZ - BENCH.depth / 2 - 0.02, palette.steel));
  cast(addBox(bin, scene, length - 0.4, 0.03, 0.03, centerX + 0.3, BENCH.top + 1.02, BENCH.centerZ, palette.steel));

  const lamps = new Group();
  scene.add(lamps);
  for (const x of STATION_X) addLamp(bin, lamps, x, palette.warmShade, palette.steel, palette.warmBulb);
  addLamp(bin, lamps, -1.55, palette.greenShade, palette.brass, palette.greenBulb);

  addNameplate(bin, scene, palette);

  for (const [index, station] of stations.entries()) addStation(bin, scene, station, index, palette);

  addChair(bin, scene, palette.cloth, palette.steel);
  addDesk(bin, scene, palette.wood, palette.steel, palette.screen);
  addShelves(bin, scene, palette.wood, palette.paper, palette.steel);
}
