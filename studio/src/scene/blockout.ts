import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Scene,
} from "three";
import { railPoints } from "./rail";

const NIGHT = new Color("#12141a");

/** Placeholder masses so the rail can be seen. Not the laboratory. */
export function addBlockout(scene: Scene): () => void {
  const geometries: BufferGeometry[] = [];
  const materials: Array<MeshLambertMaterial | LineBasicMaterial> = [];

  const track = (geometry: BufferGeometry) => {
    geometries.push(geometry);
    return geometry;
  };
  const shade = (material: MeshLambertMaterial | LineBasicMaterial) => {
    materials.push(material);
    return material;
  };

  scene.background = NIGHT;
  scene.fog = new Fog(NIGHT, 12, 28);

  const ground = new Mesh(
    track(new PlaneGeometry(40, 24)),
    shade(new MeshLambertMaterial({ color: 0x171a21 })),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const wall = new Mesh(
    track(new PlaneGeometry(28, 8)),
    shade(new MeshLambertMaterial({ color: 0x22262e })),
  );
  wall.position.set(5.5, 3.2, -2.6);
  scene.add(wall);

  const bench = new Mesh(
    track(new BoxGeometry(15.2, 0.16, 1.5)),
    shade(new MeshLambertMaterial({ color: 0x4a4338 })),
  );
  bench.position.set(5.2, 0.08, 0);
  scene.add(bench);

  const plate = new Mesh(
    track(new BoxGeometry(0.86, 0.7, 0.05)),
    shade(new MeshLambertMaterial({ color: 0xc6a15a })),
  );
  plate.position.set(-1.15, 0.51, 0.15);
  scene.add(plate);

  const marker = shade(new MeshLambertMaterial({ color: 0x8d8478 }));
  for (const [index, x] of [0, 2.2, 4.4, 6.6, 8.8, 11].entries()) {
    const height = 0.42 + index * 0.05;
    const box = new Mesh(track(new BoxGeometry(0.5, height, 0.5)), marker);
    box.position.set(x, 0.16 + height / 2, 0);
    scene.add(box);
  }

  const rail = new Line(
    track(new BufferGeometry().setFromPoints(railPoints())),
    shade(new LineBasicMaterial({ color: 0x6e675c })),
  );
  scene.add(rail);

  scene.add(new AmbientLight(0xffffff, 0.62));
  const key = new DirectionalLight(0xfff2dd, 1.15);
  key.position.set(-6, 8, 7);
  scene.add(key);

  return () => {
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  };
}
