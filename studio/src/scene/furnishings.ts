import {
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Texture,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  Scene,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Station } from "../content/stations";
import { BENCH, NAMEPLATE, STATION_X } from "./layout";
import nameplateUrl from "./nameplate.glb?url";
import workbenchUrl from "./workbench.glb?url";
import { addBox, addCylinder, canvasTexture, type SceneBin } from "./props";
import type { StudioPalette } from "./surfaces";

function cast(mesh: Mesh): Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const SHORT_NAME: Record<string, string> = {
  sourced: "Sourced",
  aegis: "Aegis",
  gridflex: "GridFlex",
  neobank: "Neobank",
  cuda: "CUDA",
  skyquery: "SkyQuery",
};

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

function keepTexture(bin: SceneBin, seen: Set<Texture>, texture: Texture | null): void {
  if (!texture || seen.has(texture)) return;
  seen.add(texture);
  bin.raw(texture);
}

function addWorkbench(bin: SceneBin, scene: Scene): void {
  const seen = new Set<Texture>();
  new GLTFLoader().load(workbenchUrl, (gltf) => {
    const bench = gltf.scene;
    bench.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      bin.geo(child.geometry);
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        bin.mat(material);
        if (!(material instanceof MeshStandardMaterial)) continue;
        if (material.metalness > 0.5) material.envMapIntensity = 0.35;
        for (const map of [material.map, material.normalMap, material.roughnessMap]) {
          keepTexture(bin, seen, map);
          if (!map) continue;
          map.anisotropy = 8;
        }
      }
    });
    scene.add(bench);
  });
}

function addNameplate(bin: SceneBin, scene: Scene): void {
  const mount = new Group();
  mount.position.set(NAMEPLATE.x, NAMEPLATE.y, NAMEPLATE.z);
  mount.rotation.x = -0.42;
  scene.add(mount);
  const seen = new Set<Texture>();
  new GLTFLoader().load(nameplateUrl, (gltf) => {
    const plate = gltf.scene;
    plate.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      bin.geo(child.geometry);
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        bin.mat(material);
        if (!(material instanceof MeshStandardMaterial)) continue;
        keepTexture(bin, seen, material.map);
        keepTexture(bin, seen, material.roughnessMap);
        keepTexture(bin, seen, material.metalnessMap);
        keepTexture(bin, seen, material.normalMap);
        material.envMapIntensity = 0.35;
        if (!material.roughnessMap) continue;
        material.roughness = 0.58;
        material.roughnessMap = null;
      }
    });
    mount.add(plate);
  });
}

function addLamp(
  bin: SceneBin,
  parent: Group,
  x: number,
  shade: MeshStandardMaterial,
  metal: MeshStandardMaterial,
  bulb: MeshStandardMaterial,
  parts: LampParts,
): void {
  const z = BENCH.centerZ - 0.18;
  const y = BENCH.top;
  const canopy = new Mesh(parts.canopy, metal);
  canopy.position.set(x, y + 1.02, z);
  cast(canopy);
  parent.add(canopy);
  cast(addCylinder(bin, parent, 0.004, 0.2, x, y + 0.91, z, metal));
  const drum = new Mesh(parts.shade, shade);
  drum.position.set(x, y + 0.76, z);
  cast(drum);
  parent.add(drum);
  const glow = new Mesh(parts.bulb, bulb);
  glow.position.set(x, y + 0.775, z);
  parent.add(glow);
}

function addSourced(
  bin: SceneBin,
  group: Group,
  paper: MeshStandardMaterial,
  ink: MeshStandardMaterial,
  brass: MeshStandardMaterial,
): void {
  const folio = new Group();
  folio.rotation.x = -0.2;
  group.add(folio);
  cast(addBox(bin, folio, 0.3, 0.38, 0.012, 0, 0.22, 0.05, paper));
  for (const [index, y] of [0.1, 0.17, 0.24, 0.31].entries()) {
    cast(addBox(bin, folio, index % 2 === 0 ? 0.2 : 0.12, 0.016, 0.014, -0.02, y, 0.062, index % 2 === 0 ? ink : paper));
  }
  const loupe = new Mesh(bin.geo(new TorusGeometry(0.046, 0.006, 8, 24)), brass);
  loupe.position.set(0.18, 0.08, 0.1);
  loupe.rotation.x = Math.PI / 2.35;
  loupe.rotation.z = -0.35;
  cast(loupe);
  folio.add(loupe);
  const grip = cast(addCylinder(bin, folio, 0.006, 0.07, 0.24, 0.045, 0.1, brass));
  grip.rotation.z = 0.85;
  grip.rotation.x = 0.55;
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

function drawCudaFace(context: CanvasRenderingContext2D): void {
  const { width, height } = context.canvas;
  context.fillStyle = "#12100e";
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#e0c089";
  context.font = "500 54px 'IBM Plex Mono', ui-monospace, monospace";
  context.fillText("GEMM", width / 2, height / 2 - 36);
  context.fillStyle = "#c9c1b4";
  context.font = "400 26px 'IBM Plex Mono', ui-monospace, monospace";
  context.fillText("NVIDIA T4   ·   FP32   ·   RECORDED", width / 2, height / 2 + 28);
}

function addCuda(bin: SceneBin, group: Group, foot: MeshStandardMaterial, brass: MeshStandardMaterial): void {
  const face = bin.mat(
    new MeshBasicMaterial({ map: canvasTexture(bin, 1024, 560, drawCudaFace), color: 0xffffff }),
  );
  const chassis = new Group();
  chassis.position.set(0, 0.2, 0.02);
  chassis.rotation.x = -0.42;
  group.add(chassis);
  cast(addBox(bin, chassis, 0.68, 0.4, 0.02, 0, 0, -0.006, foot));
  cast(addBox(bin, chassis, 0.7, 0.012, 0.024, 0, 0.194, 0.006, brass));
  cast(addBox(bin, chassis, 0.7, 0.012, 0.024, 0, -0.194, 0.006, brass));
  cast(addBox(bin, chassis, 0.012, 0.4, 0.024, -0.344, 0, 0.006, brass));
  cast(addBox(bin, chassis, 0.012, 0.4, 0.024, 0.344, 0, 0.006, brass));
  const screen = new Mesh(bin.geo(new PlaneGeometry(0.62, 0.34)), face);
  screen.position.set(0, 0, 0.012);
  cast(screen);
  chassis.add(screen);
  cast(addBox(bin, group, 0.028, 0.1, 0.028, -0.24, 0.05, 0.02, foot));
  cast(addBox(bin, group, 0.028, 0.1, 0.028, 0.24, 0.05, 0.02, foot));
  cast(addBox(bin, group, 0.5, 0.012, 0.04, 0, 0.1, 0.01, brass));
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

  if (station.id === "sourced") addSourced(bin, group, palette.paper, palette.ink, palette.brass);
  if (station.id === "aegis") addAegis(bin, group, palette.folder, palette.brass);
  if (station.id === "gridflex") addGridFlex(bin, group, palette.cell, palette.steel);
  if (station.id === "neobank") addNeobank(bin, group, palette.steel, palette.brass);
  if (station.id === "cuda") addCuda(bin, group, palette.steel, palette.brass);
  if (station.id === "skyquery") addSkyQuery(bin, group, palette.paper, palette.folder);
}

interface LampParts {
  shade: LatheGeometry;
  bulb: SphereGeometry;
  canopy: CylinderGeometry;
}

function lampParts(bin: SceneBin): LampParts {
  return {
    shade: bin.geo(
      new LatheGeometry(
        [
          new Vector2(0.016, 0.05),
          new Vector2(0.04, 0.044),
          new Vector2(0.074, 0.026),
          new Vector2(0.08, 0.01),
          new Vector2(0.062, 0),
        ],
        14,
      ),
    ),
    bulb: bin.geo(new SphereGeometry(0.015, 10, 8)),
    canopy: bin.geo(new CylinderGeometry(0.016, 0.024, 0.016, 10)),
  };
}

function addChair(bin: SceneBin, scene: Scene, cloth: MeshStandardMaterial, metal: MeshStandardMaterial): void {
  const chair = new Group();
  chair.position.set(-2.15, 0, 0.95);
  chair.rotation.y = Math.PI / 2;
  scene.add(chair);
  const caster = bin.geo(new SphereGeometry(0.016, 8, 6));
  cast(addCylinder(bin, chair, 0.035, 0.02, 0, 0.05, 0, metal));
  for (let i = 0; i < 5; i += 1) {
    const arm = new Group();
    arm.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
    chair.add(arm);
    cast(addBox(bin, arm, 0.26, 0.016, 0.02, 0.13, 0.07, 0, metal));
    const wheel = new Mesh(caster, metal);
    wheel.position.set(0.26, 0.04, 0);
    cast(wheel);
    arm.add(wheel);
  }
  cast(addCylinder(bin, chair, 0.02, 0.32, 0, 0.22, 0, metal));
  const seat = cast(addCylinder(bin, chair, 0.2, 0.04, 0, 0.46, 0, cloth));
  seat.scale.set(1.05, 1, 0.9);
  const back = cast(addBox(bin, chair, 0.36, 0.38, 0.028, 0, 0.78, -0.16, cloth));
  back.rotation.x = -0.14;
  cast(addBox(bin, chair, 0.03, 0.14, 0.025, 0, 0.56, -0.08, metal));
}

function addDesk(
  bin: SceneBin,
  scene: Scene,
  wood: MeshStandardMaterial,
  steel: MeshStandardMaterial,
  screen: MeshStandardMaterial,
  paper: MeshStandardMaterial,
): void {
  cast(addBox(bin, scene, 1.2, 0.035, 0.62, -2.7, 0.74, 0.15, wood));
  cast(addBox(bin, scene, 1.08, 0.62, 0.03, -2.7, 0.38, -0.12, steel));
  cast(addBox(bin, scene, 0.04, 0.68, 0.52, -3.22, 0.36, 0.12, steel));
  cast(addBox(bin, scene, 0.04, 0.68, 0.52, -2.18, 0.36, 0.12, steel));
  const monitor = new Group();
  monitor.position.set(-2.7, 1.02, -0.02);
  monitor.rotation.y = -Math.PI / 2;
  scene.add(monitor);
  cast(addBox(bin, monitor, 0.5, 0.3, 0.018, 0, 0, 0, steel));
  const display = new Mesh(bin.geo(new PlaneGeometry(0.44, 0.24)), screen);
  display.position.z = 0.011;
  monitor.add(display);
  cast(addCylinder(bin, scene, 0.012, 0.16, -2.7, 0.84, -0.02, steel));
  const foot = cast(addCylinder(bin, scene, 0.11, 0.012, -2.7, 0.762, -0.02, steel));
  foot.scale.z = 0.55;
  const keys = cast(addBox(bin, scene, 0.28, 0.012, 0.09, -2.48, 0.766, 0.22, steel));
  keys.rotation.x = -0.14;
  cast(addBox(bin, scene, 0.14, 0.008, 0.2, -2.95, 0.764, 0.22, paper));
  const lead = new CatmullRomCurve3([
    new Vector3(-2.7, 0.78, -0.04),
    new Vector3(-2.66, 0.62, -0.08),
    new Vector3(-2.74, 0.48, -0.1),
    new Vector3(-2.7, 0.36, -0.12),
  ]);
  const cable = new Mesh(bin.geo(new TubeGeometry(lead, 7, 0.005, 5, false)), steel);
  cast(cable);
  scene.add(cable);
}

function addShelves(
  bin: SceneBin,
  scene: Scene,
  wood: MeshStandardMaterial,
  paper: MeshStandardMaterial,
  steel: MeshStandardMaterial,
  brass: MeshStandardMaterial,
): void {
  const shelf = new Group();
  shelf.position.set(-3.42, 0, -1.7);
  scene.add(shelf);
  cast(addBox(bin, shelf, 0.028, 2.05, 0.28, 0, 1.05, 0, steel));
  cast(addBox(bin, shelf, 0.028, 2.05, 0.28, 0.86, 1.05, 0, steel));
  for (const y of [0.32, 0.78, 1.24, 1.68]) cast(addBox(bin, shelf, 0.84, 0.018, 0.26, 0.43, y, 0, wood));
  const books: Array<[number, number, number, number]> = [
    [0.16, 0.86, 0.22, 0],
    [0.24, 0.9, 0.26, 0.02],
    [0.34, 0.84, 0.2, -0.04],
    [0.52, 1.34, 0.16, 0.12],
    [0.62, 1.3, 0.18, 0],
  ];
  for (const [x, y, height, lean] of books) {
    const book = cast(addBox(bin, shelf, 0.028, height, 0.18, x, y, 0, paper));
    book.rotation.z = lean;
  }
  cast(addBox(bin, shelf, 0.16, 0.05, 0.12, 0.58, 0.82, 0, steel));
  cast(addCylinder(bin, shelf, 0.035, 0.07, 0.22, 1.32, 0.02, brass));
  cast(addBox(bin, shelf, 0.12, 0.09, 0.16, 0.48, 1.76, 0, steel));
}

/** Approved workbench, six station markers, lamps, nameplate, chair, shelves, and the side desk. */
export function addFurnishings(bin: SceneBin, scene: Scene, stations: readonly Station[], palette: StudioPalette): void {
  addWorkbench(bin, scene);

  const lamps = new Group();
  scene.add(lamps);
  const parts = lampParts(bin);
  for (const x of STATION_X) addLamp(bin, lamps, x, palette.warmShade, palette.steel, palette.warmBulb, parts);
  addLamp(bin, lamps, -1.55, palette.greenShade, palette.brass, palette.greenBulb, parts);

  addNameplate(bin, scene);
  const notebook = cast(addBox(bin, scene, 0.16, 0.012, 0.22, -1.62, BENCH.top + 0.01, BENCH.centerZ + 0.16, palette.paper));
  notebook.rotation.y = -0.2;
  const pen = cast(addCylinder(bin, scene, 0.004, 0.13, -1.48, BENCH.top + 0.012, BENCH.centerZ + 0.22, palette.brass));
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.4;

  for (const [index, station] of stations.entries()) addStation(bin, scene, station, index, palette);

  addChair(bin, scene, palette.cloth, palette.steel);
  addDesk(bin, scene, palette.wood, palette.steel, palette.screen, palette.paper);
  addShelves(bin, scene, palette.wood, palette.paper, palette.steel, palette.brass);
}
