import {
  CanvasTexture,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type CanvasTexture as CanvasTextureType,
} from "three";
import { canvasTexture, type SceneBin } from "./props";

/**
 * Original procedural surfaces for the Night Floor laboratory.
 * No third-party textures or HDRIs. Three.js (MIT) provides MeshStandardMaterial
 * and PMREMGenerator; the night environment is drawn in this project.
 */

export interface StudioPalette {
  concrete: MeshStandardMaterial;
  wall: MeshStandardMaterial;
  pier: MeshStandardMaterial;
  frame: MeshStandardMaterial;
  windowGlass: MeshStandardMaterial;
  wood: MeshStandardMaterial;
  brass: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  paper: MeshStandardMaterial;
  ink: MeshStandardMaterial;
  folder: MeshStandardMaterial;
  cell: MeshStandardMaterial;
  cloth: MeshStandardMaterial;
  carrel: MeshStandardMaterial;
  warmShade: MeshStandardMaterial;
  greenShade: MeshStandardMaterial;
  warmBulb: MeshStandardMaterial;
  greenBulb: MeshStandardMaterial;
  plateGlass: MeshStandardMaterial;
  screen: MeshStandardMaterial;
  city(map: CanvasTextureType, glow: CanvasTextureType, strength?: number): MeshStandardMaterial;
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

function grain(data: Uint8ClampedArray, size: number): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const wobble = 0.012 * Math.sin(u * Math.PI * 2 * 2);
      const v2 = v + wobble;
      const bands = Math.abs(Math.sin(v2 * Math.PI * 2 * 14));
      const fine = Math.abs(Math.sin(v2 * Math.PI * 2 * 40 + u * 2));
      const along = 0.92 + 0.08 * Math.sin(u * Math.PI * 2);
      const shade = along * (0.86 + 0.14 * bands) * (0.96 + 0.04 * fine);
      const value = Math.round(58 + shade * 36);
      const index = (y * size + x) * 4;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
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

export function createStudioPalette(bin: SceneBin): StudioPalette {
  const woodMap = tile(bin, 256, SRGBColorSpace, grain);
  const stoneMap = tile(bin, 256, SRGBColorSpace, concrete);
  const brushMap = tile(bin, 128, NoColorSpace, brush);
  const floorMap = repeated(bin, stoneMap, 6, 4);
  const wallMap = repeated(bin, stoneMap, 3, 1);

  const screenMap = canvasTexture(bin, 256, 160, (context) => {
    context.fillStyle = "#121820";
    context.fillRect(0, 0, 256, 160);
    context.fillStyle = "#9aafc4";
    for (let row = 0; row < 5; row += 1) {
      context.globalAlpha = 0.28 + (row % 3) * 0.12;
      context.fillRect(18, 22 + row * 24, 150 - row * 12, 8);
    }
    context.globalAlpha = 1;
  });

  return {
    concrete: standard(bin, 0x8d929b, 0.92, 0, floorMap),
    wall: standard(bin, 0x6d737c, 0.96, 0, wallMap),
    pier: standard(bin, 0x5c626b, 0.9, 0.02),
    frame: standard(bin, 0x2a2e34, 0.55, 0.45),
    windowGlass: bin.mat(
      new MeshStandardMaterial({
        color: 0x8e9aab,
        roughness: 0.16,
        metalness: 0.02,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        envMapIntensity: 1.1,
      }),
    ),
    wood: standard(bin, 0x4a3222, 0.72, 0, repeated(bin, woodMap, 2, 1)),
    brass: standard(bin, 0xd4b06a, 0.4, 0.78, undefined, brushMap),
    steel: standard(bin, 0x4e555c, 0.62, 0.64),
    paper: standard(bin, 0xe7e0d2, 0.88, 0),
    ink: standard(bin, 0x2c3340, 0.72, 0),
    folder: standard(bin, 0x9a7a4e, 0.78, 0),
    cell: standard(bin, 0x6d8796, 0.42, 0.22),
    cloth: standard(bin, 0x3e4550, 0.92, 0),
    carrel: standard(bin, 0x3a4048, 0.84, 0.04),
    warmShade: standard(bin, 0x6e5848, 0.58, 0.18),
    greenShade: standard(bin, 0x245443, 0.52, 0.16),
    warmBulb: bin.mat(
      new MeshStandardMaterial({
        color: 0xffe2c2,
        emissive: 0xffb15a,
        emissiveIntensity: 0.85,
        roughness: 0.4,
        metalness: 0,
      }),
    ),
    greenBulb: bin.mat(
      new MeshStandardMaterial({
        color: 0xfff0d8,
        emissive: 0xffc48a,
        emissiveIntensity: 1.1,
        roughness: 0.4,
        metalness: 0,
      }),
    ),
    plateGlass: bin.mat(
      new MeshStandardMaterial({
        color: 0xd5e2ee,
        roughness: 0.08,
        metalness: 0.06,
        transparent: true,
        opacity: 0.55,
        envMapIntensity: 1,
      }),
    ),
    screen: bin.mat(
      new MeshStandardMaterial({
        color: 0x1a222c,
        map: screenMap,
        emissive: 0x8aa0b4,
        emissiveMap: screenMap,
        emissiveIntensity: 0.35,
        roughness: 0.72,
        metalness: 0,
      }),
    ),
    city(map, glow, strength = 0.32) {
      return bin.mat(
        new MeshStandardMaterial({
          color: 0x24303c,
          map,
          emissive: 0xffffff,
          emissiveMap: glow,
          emissiveIntensity: strength,
          roughness: 0.96,
          metalness: 0,
        }),
      );
    },
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
