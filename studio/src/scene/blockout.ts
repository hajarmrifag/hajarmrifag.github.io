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
import { NIGHT_HORIZON } from "./city";
import { addFurnishings } from "./furnishings";
import { BENCH, NAMEPLATE, STATION_X } from "./layout";
import { createSceneBin } from "./props";
import { createStudioPalette } from "./surfaces";

export interface StudioQuality {
  shadows: boolean;
  /** One warm pool per station. Phones keep the bulbs and a shared fill. */
  lamps: boolean;
  /** Reflective window film and a sharper night environment. */
  reflections: boolean;
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
  const palette = createStudioPalette(bin, quality.reflections);
  addArchitecture(bin, scene, palette);
  addFurnishings(bin, scene, stations, palette);
  const environment = addNightGrade(scene, renderer, quality);

  return () => {
    environment.dispose();
    bin.dispose();
  };
}

function addNightGrade(scene: Scene, renderer: WebGLRenderer, quality: StudioQuality): WebGLRenderTarget {
  // Starts beyond the back wall, so the bench stays sharp and only the city hazes.
  scene.fog = new Fog(NIGHT_HORIZON, 20, 52);
  scene.environmentIntensity = 0.32;
  const environment = nightEnvironment(renderer, quality.reflections);
  scene.environment = environment.texture;

  scene.add(new HemisphereLight(0x96adc4, 0x30281f, quality.lamps ? 0.44 : 0.58));

  const windowLight = new DirectionalLight(0xc5d5e6, 0.92);
  windowLight.position.set(3.2, 7.4, -7.2);
  windowLight.target.position.set(5.2, 0.9, 0.2);
  scene.add(windowLight);
  scene.add(windowLight.target);
  if (quality.shadows) {
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(2048, 2048);
    windowLight.shadow.bias = -0.00015;
    windowLight.shadow.normalBias = 0.035;
    const camera = windowLight.shadow.camera;
    camera.left = -12;
    camera.right = 12;
    camera.top = 8;
    camera.bottom = -6;
    camera.near = 1;
    camera.far = 30;
    camera.updateProjectionMatrix();
  }

  const warm = quality.lamps ? STATION_X : [STATION_X[0], STATION_X[3], STATION_X[5]];
  for (const x of warm) addPool(scene, x, 0xffc49a, quality.lamps ? 16 : 22, 1.55);
  addPool(scene, NAMEPLATE.x - 0.85, 0xffd2ae, 8, 2.4, NAMEPLATE.z + 0.35, NAMEPLATE.y + 0.42);
  const cool = quality.reflections ? [-0.8, 4.6, 10.2] : [4.6];
  for (const x of cool) {
    addPool(scene, x, 0xa9c0d4, quality.reflections ? 2.6 : 3.4, quality.reflections ? 6.4 : 8.5, -3.45, 1.75);
  }

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

/**
 * Filtered once into image-based lighting. Desktop glass samples this
 * for its reflection. The transmission pass is what makes that reflection
 * sit on the pane; phones skip it.
 */
function nightEnvironment(renderer: WebGLRenderer, reflections: boolean): WebGLRenderTarget {
  const env = new Scene();
  env.background = new Color("#101820");
  const planes = [
    plane(22, 8, 0x3a5168, 0, 6.2, -9, false),
    plane(22, 2.2, 0x5c4a38, 0, 1.5, -9, false),
    plane(18, 1.15, 0x7a5c44, 0, 1.05, 8, true),
    plane(16, 5, 0x243040, 0, 5.2, 6, true),
  ];
  for (const mesh of planes) env.add(mesh);
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, reflections ? 0.04 : 0.08, 0.1, 24, {
    size: reflections ? 256 : 128,
  });
  pmrem.dispose();
  for (const mesh of planes) {
    mesh.geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
  }
  return target;
}

function plane(
  width: number,
  height: number,
  color: number,
  x: number,
  y: number,
  z: number,
  turn: boolean,
): Mesh {
  const mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  if (turn) mesh.rotation.y = Math.PI;
  return mesh;
}
