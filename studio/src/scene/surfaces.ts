import {
  CanvasTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type CanvasTexture as CanvasTextureType,
} from "three";
import type { SceneBin } from "./props";

/**
 * Original procedural surfaces for the Night Floor laboratory.
 * No third-party textures or HDRIs. Three.js (MIT) provides MeshStandardMaterial
 * and PMREMGenerator; the night environment is drawn in this project.
 * Desktop panes use transmission so the night reflects in the glass. Phones
 * keep a tinted transparent pane and skip that extra render.
 */

export interface StudioPalette {
  concrete: MeshStandardMaterial;
  wall: MeshStandardMaterial;
  pier: MeshStandardMaterial;
  frame: MeshStandardMaterial;
  windowGlass: MeshStandardMaterial;
  brass: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  paper: MeshStandardMaterial;
  ink: MeshStandardMaterial;
  folder: MeshStandardMaterial;
  cell: MeshStandardMaterial;
  carrel: MeshStandardMaterial;
  plaque(map: CanvasTextureType): MeshStandardMaterial;
}

function tile(
  bin: SceneBin,
  size: number,
  colorSpace: typeof SRGBColorSpace | typeof NoColorSpace,
  paint: (data: Uint8ClampedArray, size: number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const texture = bin.raw(new CanvasTexture(canvas));
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  if (!context) return texture;
  const image = context.createImageData(size, size);
  paint(image.data, size);
  context.putImageData(image, 0, 0);
  texture.needsUpdate = true;
  return texture;
}

function wave(u: number, turns: number): number {
  return 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * turns);
}

function concrete(data: Uint8ClampedArray, size: number): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const blot = wave(u, 3) * wave(v, 4);
      const speck = wave(u + v * 0.37, 48) * wave(v, 53);
      const pit = speck > 0.82 ? 0.55 : 1;
      const shade = (0.55 + blot * 0.3 + (speck - 0.5) * 0.16) * pit;
      const value = Math.round(150 + shade * 70);
      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
}

function brush(data: Uint8ClampedArray, size: number): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const streak = wave(u, 90);
      const value = Math.round(70 + streak * 50);
      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
}

function repeated(
  bin: SceneBin,
  source: CanvasTexture,
  repeatX: number,
  repeatY: number,
): CanvasTexture {
  const map = bin.raw(source.clone());
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.colorSpace = source.colorSpace;
  return map;
}

function standard(
  bin: SceneBin,
  color: number,
  roughness: number,
  metalness: number,
  map?: CanvasTexture,
  roughnessMap?: CanvasTexture,
): MeshStandardMaterial {
  return bin.mat(
    new MeshStandardMaterial({
      color,
      map,
      roughness,
      roughnessMap,
      metalness,
      envMapIntensity: metalness > 0.5 ? 0.85 : 0.45,
    }),
  );
}

export function createStudioPalette(bin: SceneBin, reflections: boolean): StudioPalette {
  const stoneMap = tile(bin, 256, SRGBColorSpace, concrete);
  const brushMap = tile(bin, 128, NoColorSpace, brush);
  const floorMap = repeated(bin, stoneMap, 6, 4);
  const wallMap = repeated(bin, stoneMap, 3, 1);

  return {
    concrete: standard(bin, 0x8d929b, 0.92, 0, floorMap),
    wall: standard(bin, 0x6d737c, 0.96, 0, wallMap),
    pier: standard(bin, 0x5c626b, 0.9, 0.02),
    frame: standard(bin, 0x2a2e34, 0.55, 0.45),
    windowGlass: reflections
      ? bin.mat(
          new MeshPhysicalMaterial({
            color: 0xdce6f0,
            metalness: 0,
            roughness: 0.06,
            transmission: 1,
            thickness: 0.2,
            ior: 1.5,
            envMapIntensity: 1.15,
            transparent: true,
          }),
        )
      : bin.mat(
          new MeshStandardMaterial({
            color: 0xb7c6d4,
            roughness: 0.2,
            metalness: 0,
            transparent: true,
            opacity: 0.1,
            depthWrite: false,
            envMapIntensity: 0.85,
          }),
        ),
    brass: standard(bin, 0xd4b06a, 0.4, 0.78, undefined, brushMap),
    steel: standard(bin, 0x4e555c, 0.62, 0.64),
    paper: standard(bin, 0xe7e0d2, 0.88, 0),
    ink: standard(bin, 0x2c3340, 0.72, 0),
    folder: standard(bin, 0x9a7a4e, 0.78, 0),
    cell: standard(bin, 0x6d8796, 0.42, 0.22),
    carrel: standard(bin, 0x3a4048, 0.84, 0.04),
    plaque(map) {
      return bin.mat(
        new MeshStandardMaterial({
          map,
          roughness: 0.78,
          metalness: 0,
          emissive: 0xc8bba8,
          emissiveMap: map,
          emissiveIntensity: 0.35,
        }),
      );
    },
  };
}
