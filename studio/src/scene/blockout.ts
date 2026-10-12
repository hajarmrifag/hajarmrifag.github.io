import { AmbientLight, Color, DirectionalLight, Fog, Scene } from "three";
import type { Station } from "../content/stations";
import { addArchitecture } from "./architecture";
import { addFurnishings } from "./furnishings";
import { createSceneBin } from "./props";

const NIGHT = new Color("#10141c");

/**
 * Geometry-only laboratory. Colors are flat blockout values, not the final grade.
 * Returns a dispose function for the meshes' GPU resources.
 */
export function addBlockout(scene: Scene, stations: readonly Station[]): () => void {
  const bin = createSceneBin();
  addArchitecture(bin, scene);
  addFurnishings(bin, scene, stations);

  scene.fog = new Fog(NIGHT, 10, 26);
  scene.add(new AmbientLight(0xd7deea, 0.78));

  const windowLight = new DirectionalLight(0xc9d7ea, 0.9);
  windowLight.position.set(-3, 7, -8);
  scene.add(windowLight);

  const fill = new DirectionalLight(0xfff1e2, 0.38);
  fill.position.set(4, 5, 7);
  scene.add(fill);

  return () => bin.dispose();
}
