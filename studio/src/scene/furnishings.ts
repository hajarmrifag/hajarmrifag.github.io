import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry, Scene } from "three";
import type { Station } from "../content/stations";
import { BENCH, NAMEPLATE, STATION_X } from "./layout";
import { addBox, addCylinder, canvasTexture, type SceneBin } from "./props";

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

function drawScreen(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#141920";
  context.fillRect(0, 0, 256, 160);
  context.fillStyle = "#8aa0b8";
  for (let row = 0; row < 5; row += 1) {
    context.globalAlpha = 0.35 + (row % 3) * 0.15;
    context.fillRect(18, 22 + row * 24, 150 - row * 12, 8);
  }
  context.globalAlpha = 1;
}

function addNameplate(bin: SceneBin, scene: Scene, brass: MeshLambertMaterial): void {
  const texture = canvasTexture(bin, 1024, 512, drawName);
  const face = bin.mat(new MeshBasicMaterial({ map: texture }));
  const plate = new Mesh(bin.geo(new PlaneGeometry(0.5, 0.22)), face);
  plate.position.set(NAMEPLATE.x, NAMEPLATE.y, NAMEPLATE.z);
  plate.rotation.x = -0.42;
  scene.add(plate);
  addBox(bin, scene, 0.52, 0.012, 0.16, NAMEPLATE.x, BENCH.top + 0.008, NAMEPLATE.z + 0.02, brass);
}

function addLamp(
  bin: SceneBin,
  parent: Group,
  x: number,
  shade: MeshLambertMaterial,
  metal: MeshLambertMaterial,
  bulb: MeshLambertMaterial,
): void {
  const z = BENCH.centerZ - 0.18;
  addCylinder(bin, parent, 0.008, 0.22, x, BENCH.top + 0.92, z, metal);
  addBox(bin, parent, 0.16, 0.05, 0.16, x, BENCH.top + 0.78, z, shade);
  addBox(bin, parent, 0.04, 0.03, 0.04, x, BENCH.top + 0.74, z, bulb);
}

function addSourced(bin: SceneBin, group: Group, paper: MeshLambertMaterial, ink: MeshLambertMaterial): void {
  addBox(bin, group, 0.3, 0.38, 0.015, 0, 0.22, 0.06, paper);
  for (const [index, y] of [0.1, 0.17, 0.24, 0.31].entries()) {
    addBox(bin, group, index % 2 === 0 ? 0.2 : 0.12, 0.022, 0.02, -0.02, y, 0.075, index % 2 === 0 ? ink : paper);
  }
}

function addAegis(bin: SceneBin, group: Group, folder: MeshLambertMaterial, stamp: MeshLambertMaterial): void {
  addBox(bin, group, 0.28, 0.22, 0.018, -0.02, 0.16, 0.02, folder);
  addBox(bin, group, 0.28, 0.22, 0.012, 0.03, 0.17, 0.05, folder);
  addCylinder(bin, group, 0.045, 0.02, 0.08, 0.28, 0.08, stamp);
}

function addGridFlex(bin: SceneBin, group: Group, cell: MeshLambertMaterial, tray: MeshLambertMaterial): void {
  addBox(bin, group, 0.34, 0.04, 0.16, 0, 0.03, 0, tray);
  for (const x of [-0.1, 0, 0.1]) addBox(bin, group, 0.07, 0.22, 0.1, x, 0.15, 0, cell);
  addBox(bin, group, 0.22, 0.14, 0.012, 0.02, 0.22, -0.1, tray);
}

function addNeobank(bin: SceneBin, group: Group, body: MeshLambertMaterial, token: MeshLambertMaterial): void {
  addBox(bin, group, 0.28, 0.12, 0.18, 0, 0.08, 0, body);
  addBox(bin, group, 0.16, 0.012, 0.02, 0, 0.145, 0.06, token);
  addCylinder(bin, group, 0.045, 0.012, 0.05, 0.16, 0.02, token);
}

function addCuda(bin: SceneBin, group: Group, glass: MeshBasicMaterial, foot: MeshLambertMaterial): void {
  const plate = new Mesh(bin.geo(new PlaneGeometry(0.34, 0.24)), glass);
  plate.position.set(0, 0.16, 0);
  plate.rotation.x = -0.35;
  group.add(plate);
  addBox(bin, group, 0.03, 0.06, 0.03, -0.12, 0.04, 0.04, foot);
  addBox(bin, group, 0.03, 0.06, 0.03, 0.12, 0.04, 0.04, foot);
}

function addSkyQuery(bin: SceneBin, group: Group, left: MeshLambertMaterial, right: MeshLambertMaterial): void {
  const sheetA = addBox(bin, group, 0.16, 0.28, 0.012, -0.1, 0.16, 0, left);
  const sheetB = addBox(bin, group, 0.16, 0.28, 0.012, 0.1, 0.16, 0, right);
  sheetA.rotation.y = 0.18;
  sheetB.rotation.y = -0.18;
}

function addStation(
  bin: SceneBin,
  scene: Scene,
  station: Station,
  index: number,
  materials: StationMaterials,
): void {
  const group = new Group();
  const x = STATION_X[index] ?? 0;
  group.position.set(x, BENCH.top, BENCH.centerZ);
  scene.add(group);
  addBox(bin, group, 0.5, 0.2, 0.015, 0, 0.16, -0.2, materials.carrel);
  const label = new Mesh(
    bin.geo(new PlaneGeometry(0.28, 0.07)),
    bin.mat(
      new MeshBasicMaterial({
        map: canvasTexture(bin, 512, 128, drawLabel(SHORT_NAME[station.id] ?? station.name)),
      }),
    ),
  );
  label.position.set(0, 0.045, BENCH.depth / 2 - 0.08);
  label.rotation.x = -0.65;
  group.add(label);

  if (station.id === "sourced") addSourced(bin, group, materials.paper, materials.ink);
  if (station.id === "aegis") addAegis(bin, group, materials.folder, materials.brass);
  if (station.id === "gridflex") addGridFlex(bin, group, materials.cell, materials.steel);
  if (station.id === "neobank") addNeobank(bin, group, materials.steel, materials.brass);
  if (station.id === "cuda") addCuda(bin, group, materials.glass, materials.steel);
  if (station.id === "skyquery") addSkyQuery(bin, group, materials.paper, materials.folder);
}

interface StationMaterials {
  paper: MeshLambertMaterial;
  ink: MeshLambertMaterial;
  folder: MeshLambertMaterial;
  brass: MeshLambertMaterial;
  cell: MeshLambertMaterial;
  steel: MeshLambertMaterial;
  glass: MeshBasicMaterial;
  carrel: MeshLambertMaterial;
}

function addChair(bin: SceneBin, scene: Scene, cloth: MeshLambertMaterial, metal: MeshLambertMaterial): void {
  const chair = new Group();
  chair.position.set(-2.15, 0, 0.95);
  chair.rotation.y = Math.PI / 2;
  scene.add(chair);
  addBox(bin, chair, 0.46, 0.05, 0.46, 0, 0.48, 0, cloth);
  addBox(bin, chair, 0.46, 0.42, 0.04, 0, 0.72, 0.2, cloth);
  addCylinder(bin, chair, 0.035, 0.36, 0, 0.26, 0, metal);
  addCylinder(bin, chair, 0.26, 0.025, 0, 0.04, 0, metal);
}

function addDesk(bin: SceneBin, scene: Scene, wood: MeshLambertMaterial, steel: MeshLambertMaterial, screen: MeshBasicMaterial): void {
  addBox(bin, scene, 1.2, 0.04, 0.62, -2.7, 0.74, 0.15, wood);
  addBox(bin, scene, 1.08, 0.68, 0.04, -2.7, 0.36, -0.12, steel);
  addBox(bin, scene, 0.2, 0.4, 0.42, -3.15, 0.22, 0.15, steel);
  const monitor = new Group();
  monitor.position.set(-2.7, 0.98, -0.02);
  monitor.rotation.y = -Math.PI / 2;
  scene.add(monitor);
  addBox(bin, monitor, 0.52, 0.32, 0.03, 0, 0, 0, steel);
  const display = new Mesh(bin.geo(new PlaneGeometry(0.46, 0.26)), screen);
  display.position.z = 0.018;
  monitor.add(display);
  addBox(bin, scene, 0.32, 0.015, 0.11, -2.45, 0.77, 0.22, steel);
}

function addShelves(bin: SceneBin, scene: Scene, wood: MeshLambertMaterial, paper: MeshLambertMaterial, steel: MeshLambertMaterial): void {
  const shelf = new Group();
  shelf.position.set(-3.42, 0, -1.7);
  scene.add(shelf);
  addBox(bin, shelf, 0.04, 2.05, 0.32, 0, 1.05, 0, steel);
  addBox(bin, shelf, 0.04, 2.05, 0.32, 0.86, 1.05, 0, steel);
  for (const y of [0.28, 0.72, 1.16, 1.6]) addBox(bin, shelf, 0.86, 0.025, 0.3, 0.43, y, 0, wood);
  addBox(bin, shelf, 0.04, 0.28, 0.2, 0.16, 0.88, 0, paper);
  addBox(bin, shelf, 0.035, 0.32, 0.2, 0.22, 0.9, 0, steel);
  addBox(bin, shelf, 0.05, 0.24, 0.18, 0.3, 0.86, 0, paper);
  addBox(bin, shelf, 0.22, 0.1, 0.16, 0.58, 1.24, 0, steel);
  addBox(bin, shelf, 0.16, 0.16, 0.16, 0.5, 1.76, 0, paper);
}

/** Bench, six station markers, lamps, nameplate, chair, shelves, and the side desk. */
export function addFurnishings(bin: SceneBin, scene: Scene, stations: readonly Station[]): void {
  const wood = bin.mat(new MeshLambertMaterial({ color: 0x7a5a3c }));
  const steel = bin.mat(new MeshLambertMaterial({ color: 0x23262c }));
  const brass = bin.mat(new MeshLambertMaterial({ color: 0xc6a15a }));
  const paper = bin.mat(new MeshLambertMaterial({ color: 0xe6e0d2 }));
  const ink = bin.mat(new MeshLambertMaterial({ color: 0x2a313c }));
  const folder = bin.mat(new MeshLambertMaterial({ color: 0x8d734c }));
  const cell = bin.mat(new MeshLambertMaterial({ color: 0x4d6a78 }));
  const cloth = bin.mat(new MeshLambertMaterial({ color: 0x3a4048 }));
  const carrel = bin.mat(new MeshLambertMaterial({ color: 0x2c3138 }));
  const warmShade = bin.mat(new MeshLambertMaterial({ color: 0x8a7560 }));
  const greenShade = bin.mat(new MeshLambertMaterial({ color: 0x2f6a52 }));
  const warmBulb = bin.mat(new MeshLambertMaterial({ color: 0xffe2bf, emissive: 0xffb15a, emissiveIntensity: 1 }));
  const greenBulb = bin.mat(new MeshLambertMaterial({ color: 0xd7f5e4, emissive: 0x8ddebe, emissiveIntensity: 1 }));
  const glass = bin.mat(
    new MeshBasicMaterial({
      color: 0xc5d4e4,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  const screen = bin.mat(
    new MeshBasicMaterial({ map: canvasTexture(bin, 256, 160, drawScreen) }),
  );

  const length = BENCH.x1 - BENCH.x0;
  const centerX = (BENCH.x0 + BENCH.x1) / 2;
  addBox(bin, scene, length, 0.68, BENCH.depth - 0.06, centerX, 0.36, BENCH.centerZ, steel);
  addBox(bin, scene, length + 0.04, 0.045, BENCH.depth, centerX, BENCH.top - 0.02, BENCH.centerZ, wood);
  addBox(bin, scene, length, 0.06, 0.08, centerX, 0.58, BENCH.centerZ - BENCH.depth / 2 - 0.02, steel);
  addBox(bin, scene, length - 0.4, 0.03, 0.03, centerX + 0.3, BENCH.top + 1.02, BENCH.centerZ, steel);

  const lamps = new Group();
  scene.add(lamps);
  for (const x of STATION_X) addLamp(bin, lamps, x, warmShade, steel, warmBulb);
  addLamp(bin, lamps, -1.55, greenShade, brass, greenBulb);

  addNameplate(bin, scene, brass);

  const materials: StationMaterials = { paper, ink, folder, brass, cell, steel, glass, carrel };
  for (const [index, station] of stations.entries()) addStation(bin, scene, station, index, materials);

  addChair(bin, scene, cloth, steel);
  addDesk(bin, scene, wood, steel, screen);
  addShelves(bin, scene, wood, paper, steel);
}
