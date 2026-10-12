import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import type { Station } from "../content/stations";
import { addArchitecture } from "./architecture";
import { addFurnishings } from "./furnishings";
import { BENCH, NAMEPLATE, STATION_X } from "./layout";
import { createSceneBin } from "./props";
import { createStudioPalette } from "./surfaces";

const NIGHT = new Color("#0c1016");

export interface StudioQuality {
  shadows: boolean;
  /** One warm pool per station. Phones keep the bulbs and a shared fill. */
  lamps: boolean;
}

/**
 * The approved blockout, with physically based surfaces and a night grade.
 * Returns a dispose function for the meshes' GPU resources.
 */
export function addBlockout(
  scene: Scene,
  stations: readonly Station[],
  renderer: WebGLRenderer,
  quality: StudioQuality,
): () => void {
  const bin = createSceneBin();
  const palette = createStudioPalette(bin);
  addArchitecture(bin, scene, palette);
  addFurnishings(bin, scene, stations, palette);
  const environment = addNightGrade(scene, renderer, quality);

  return () => {
    environment.dispose();
    bin.dispose();
  };
}

function addNightGrade(scene: Scene, renderer: WebGLRenderer, quality: StudioQuality): WebGLRenderTarget {
  scene.fog = new Fog(NIGHT, 8.5, 16);
  scene.environmentIntensity = 0.28;
  const environment = nightEnvironment(renderer);
  scene.environment = environment.texture;

  scene.add(new HemisphereLight(0x7e92aa, 0x1c1916, 0.32));

  const windowLight = new DirectionalLight(0xb7c6dc, 1.05);
  windowLight.position.set(3, 8, -6);
  windowLight.target.position.set(5, 0.7, -0.2);
  scene.add(windowLight);
  scene.add(windowLight.target);
  if (quality.shadows) {
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(2048, 2048);
    windowLight.shadow.bias = -0.00015;
    windowLight.shadow.normalBias = 0.035;
    const camera = windowLight.shadow.camera;
    camera.left = -10;
    camera.right = 10;
    camera.top = 6;
    camera.bottom = -6;
    camera.near = 0.5;
    camera.far = 24;
    camera.updateProjectionMatrix();
  }

  const warm = quality.lamps ? STATION_X : [STATION_X[0], STATION_X[3], STATION_X[5]];
  for (const x of warm) addPool(scene, x, 0xffc49a, quality.lamps ? 16 : 22, 1.55);
  addPool(scene, NAMEPLATE.x - 0.85, 0xffd2ae, 8, 2.4, NAMEPLATE.z + 0.35, NAMEPLATE.y + 0.42);

  return environment;
}

function addPool(
  scene: Scene,
  x: number,
  color: number,
  intensity: number,
  distance: number,
  z = BENCH.centerZ + 0.12,
  y = BENCH.top + 0.48,
): void {
  const light = new PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z);
  scene.add(light);
}

/** A small night room, filtered once into soft image-based lighting. */
function nightEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const env = new Scene();
  env.background = new Color("#10161e");
  const cool = new Mesh(
    new PlaneGeometry(12, 6),
    new MeshBasicMaterial({ color: 0x5d7390 }),
  );
  cool.position.set(0, 2.4, -8);
  env.add(cool);
  const warm = new Mesh(
    new PlaneGeometry(8, 1.4),
    new MeshBasicMaterial({ color: 0x6a5340 }),
  );
  warm.position.set(0, 0.5, 5);
  env.add(warm);
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.08, 0.1, 20, { size: 128 });
  pmrem.dispose();
  cool.geometry.dispose();
  (cool.material as MeshBasicMaterial).dispose();
  warm.geometry.dispose();
  (warm.material as MeshBasicMaterial).dispose();
  return target;
}
