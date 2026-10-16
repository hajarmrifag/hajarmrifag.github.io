import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Texture,
  TorusGeometry,
  Scene,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Station } from "../content/stations";
import { BENCH, NAMEPLATE, STATION_X } from "./layout";
import lampUrl from "./lamp.glb?url";
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

/** Base contact point. The shade mouth is the warm pool in blockout.ts. */
const TASK_LAMP = { x: -1.64, z: -0.64 };

function addTaskLamp(bin: SceneBin, scene: Scene): void {
  const mount = new Group();
  mount.position.set(TASK_LAMP.x, BENCH.top, TASK_LAMP.z);
  scene.add(mount);
  new GLTFLoader().load(lampUrl, (gltf) => {
    const lamp = gltf.scene;
    lamp.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      bin.geo(child.geometry);
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        bin.mat(material);
        if (!(material instanceof MeshStandardMaterial)) continue;
        material.envMapIntensity = 0.35;
      }
    });
    mount.add(lamp);
  });
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

function addCuda(bin: SceneBin, group: Group, foot: MeshStandardMaterial, brass: MeshStandardMaterial): void {
  cast(addBox(bin, group, 0.32, 0.018, 0.2, 0, 0.02, 0.02, foot));
  cast(addBox(bin, group, 0.14, 0.01, 0.14, 0, 0.034, 0.02, foot));
  cast(addBox(bin, group, 0.15, 0.006, 0.006, 0, 0.042, 0.088, brass));
  cast(addBox(bin, group, 0.15, 0.006, 0.006, 0, 0.042, -0.048, brass));
  cast(addBox(bin, group, 0.006, 0.006, 0.14, -0.072, 0.042, 0.02, brass));
  cast(addBox(bin, group, 0.006, 0.006, 0.14, 0.072, 0.042, 0.02, brass));
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

/** The walnut bench, task lamp, nameplate, and six station markers. */
export function addFurnishings(bin: SceneBin, scene: Scene, stations: readonly Station[], palette: StudioPalette): void {
  addWorkbench(bin, scene);
  addTaskLamp(bin, scene);
  addNameplate(bin, scene);
  const notebook = cast(addBox(bin, scene, 0.16, 0.012, 0.22, -1.62, BENCH.top + 0.01, BENCH.centerZ + 0.16, palette.paper));
  notebook.rotation.y = -0.2;
  const pen = cast(addCylinder(bin, scene, 0.004, 0.13, -1.48, BENCH.top + 0.012, BENCH.centerZ + 0.22, palette.brass));
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.4;

  for (const [index, station] of stations.entries()) addStation(bin, scene, station, index, palette);
}
