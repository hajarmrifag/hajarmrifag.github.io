import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  Material,
  Mesh,
  Object3D,
  SRGBColorSpace,
  Texture,
} from "three";

/** Tracks disposable GPU resources for the blockout. */
export interface SceneBin {
  geo<T extends BufferGeometry>(geometry: T): T;
  mat<T extends Material>(material: T): T;
  /** Color textures. Stored in sRGB. */
  tex<T extends Texture>(texture: T): T;
  /** Data textures (roughness, glow masks) and environment maps. Color space is left alone. */
  raw<T extends Texture>(texture: T): T;
  dispose(): void;
}

export function createSceneBin(): SceneBin {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const textures: Texture[] = [];
  return {
    geo(geometry) {
      geometries.push(geometry);
      return geometry;
    },
    mat(material) {
      materials.push(material);
      return material;
    },
    tex(texture) {
      textures.push(texture);
      texture.colorSpace = SRGBColorSpace;
      return texture;
    },
    raw(texture) {
      textures.push(texture);
      return texture;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}

export function addBox(
  bin: SceneBin,
  parent: Object3D,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: Material,
): Mesh {
  const mesh = new Mesh(bin.geo(new BoxGeometry(width, height, depth)), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function addCylinder(
  bin: SceneBin,
  parent: Object3D,
  radius: number,
  height: number,
  x: number,
  y: number,
  z: number,
  material: Material,
): Mesh {
  const mesh = new Mesh(
    bin.geo(new CylinderGeometry(radius, radius, height, 16)),
    material,
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function canvasTexture(
  bin: SceneBin,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) draw(context);
  const texture = bin.tex(new CanvasTexture(canvas));
  if (context && document.fonts) {
    void document.fonts.ready.then(() => {
      draw(context);
      texture.needsUpdate = true;
    });
  }
  return texture;
}
