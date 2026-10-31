import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LatheGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Scene,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneBin } from "./props";

// Keep the room's existing fog and environment contract unchanged.
export const NIGHT_HORIZON = 0x1e4660;
export const NIGHT_ZENITH = 0x070b12;

// A perspective-scaled exterior, not a geographic reconstruction. All buildings
// share a 3.1 m storey / 2.6 m bay ratio, reduced to fit the existing far plane.
// References: Chengdu's dense residential slabs, recessed paired window bays,
// rooftop service cores, and the shaft / observation basket of the 339 TV tower.
const FLOOR = 0.36;
const BAY = FLOOR * 2.6 / 3.1;
const BASE = -9;
const COLS = 16;
const ROWS = 48;
const TILE_W = 256;
const TILE_H = 512;

type Layer = 0 | 1 | 2;
interface Building {
  x: number;
  z: number;
  bays: number;
  floors: number;
  depth: number;
  layer: Layer;
  seed: number;
}

// The gaps are as deliberate as the buildings: near roofs reveal the middle
// distance; the distant layer remains visible through the full six-station rail.
const BUILDINGS: readonly Building[] = [
  { x: -12, z: -21, bays: 10, floors: 25, depth: 7, layer: 0, seed: 11 },
  { x: -6.5, z: -18, bays: 9, floors: 19, depth: 6, layer: 0, seed: 25 },
  { x: -0.8, z: -23, bays: 12, floors: 23, depth: 7, layer: 0, seed: 34 },
  { x: 5.1, z: -20, bays: 8, floors: 17, depth: 6, layer: 0, seed: 47 },
  { x: 10.4, z: -24, bays: 11, floors: 26, depth: 7, layer: 0, seed: 52 },
  { x: 17, z: -20, bays: 10, floors: 21, depth: 6, layer: 0, seed: 63 },
  { x: 23, z: -25, bays: 9, floors: 28, depth: 6, layer: 0, seed: 76 },
  ...Array.from({ length: 18 }, (_, i): Building => ({
    x: -26 + i * 3.9 + Math.sin(i * 2.1) * 0.7,
    z: -33 - (i % 3) * 3.6,
    bays: [7, 9, 8, 11, 6][i % 5],
    floors: [30, 22, 36, 27, 34, 24, 39][i % 7],
    depth: 6 + i % 3,
    layer: 1,
    seed: 103 + i * 19,
  })),
  ...Array.from({ length: 24 }, (_, i): Building => ({
    x: -38 + i * 3.8,
    z: -52 - (i % 3) * 3.4,
    bays: [8, 12, 7, 10, 6][i % 5],
    floors: [31, 39, 26, 34, 43, 29, 37][i % 7],
    depth: 7,
    layer: 2,
    seed: 503 + i * 23,
  })),
];

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Baked facade radiance: the room's task lights must not illuminate the city.
 * Six facade panels share one mipmapped atlas. No window meshes or light sources.
 * Distance is painted into both the dark fabric and occupied rooms, so haze
 * lowers contrast without turning the distant buildings into bright blue blocks.
 */
function facadeAtlas(bin: SceneBin): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#17232e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const bodies = ["#17212a", "#1c2b36", "#283b47"];
    const ribs = ["#1d2933", "#253540", "#2c414d"];
    const unlit = ["#0c141d", "#172530", "#243843"];
    const warm = [["#93795b", "#b49c76", "#6a5845"], ["#756c59", "#91836a", "#514e43"], ["#536066", "#68716f", "#3d505c"]];
    const cool = [["#71878b", "#92a3a0", "#455d69"], ["#617783", "#819092", "#3f5663"], ["#526775", "#6a7a83", "#3b5362"]];
    for (let tile = 0; tile < 6; tile++) {
      const layer = Math.floor(tile / 2);
      const residential = tile % 2 === 0;
      const next = random(71 + tile * 293);
      const x0 = tile % 4 * TILE_W;
      const y0 = Math.floor(tile / 4) * TILE_H;
      context.fillStyle = bodies[layer];
      context.fillRect(x0, y0, TILE_W, TILE_H);
      const cw = TILE_W / COLS;
      const ch = TILE_H / ROWS;
      const occupied = Array.from({ length: COLS }, () => 0.14 + next() * 0.3);
      for (let row = 0; row < ROWS; row++) {
        const officeFloor = next() < 0.25;
        for (let col = 0; col < COLS; col++) {
          const x = x0 + col * cw;
          const y = y0 + row * ch;
          // Paired apartment bays and darker service risers break the grid.
          const service = col % 8 === 7;
          const lit = !service && next() < (residential ? occupied[col] : officeFloor ? 0.64 : 0.07);
          const isWarm = next() < (residential ? 0.84 : 0.38);
          const tone = Math.floor(next() * 3);
          const blind = next();
          context.fillStyle = ribs[layer];
          context.fillRect(x, y, residential && col % 2 === 0 ? 2 : 1, ch);
          context.fillStyle = unlit[layer];
          context.fillRect(x + 3, y + 2, cw - 6, ch - 3);
          if (lit) {
            context.fillStyle = (isWarm ? warm : cool)[layer][tone];
            context.fillRect(x + 4, y + 3 + (blind > 0.7 ? 2 : 0), cw - 8, ch - 5 - (blind > 0.7 ? 2 : 0));
          }
          // A mullion, sill shadow, and occasional enclosed balcony remain
          // architectural features rather than decorative random bright dots.
          context.fillStyle = bodies[layer];
          context.fillRect(x + cw / 2, y + 2, 1, ch - 3);
          context.fillStyle = ribs[layer];
          context.fillRect(x + 1, y + ch - 1, cw - 2, 1);
        }
      }
    }
  }
  const texture = bin.tex(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function vertexTint(geometry: BufferGeometry, color: Color): void {
  const colors = new Float32Array(geometry.getAttribute("position").count * 3);
  for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
}

function addBuilding(building: Building, facades: BufferGeometry[], solids: BufferGeometry[]): void {
  const { x, z, bays, floors, depth, layer, seed } = building;
  const next = random(seed);
  const w = bays * BAY;
  const d = depth * BAY;
  const h = floors * FLOOR;
  const base = BASE - layer * 1.1;
  const tile = layer * 2 + seed % 2;
  const colOffset = Math.floor(next() * (COLS - Math.max(bays, depth)));
  const rowOffset = Math.floor(next() * (ROWS - floors));
  const tint = new Color().setScalar(0.86 + next() * 0.14);

  // Independent wall faces keep floor and bay scale identical on the sides.
  const vertices: number[] = [];
  const uv: number[] = [];
  const colors: number[] = [];
  const face = (corners: number[][], count: number, shade: number) => {
    const x0 = (tile % 4 * TILE_W + (colOffset + 0.05) / COLS * TILE_W) / 1024;
    const x1 = x0 + (count - 0.1) / COLS * TILE_W / 1024;
    const y1 = 1 - (Math.floor(tile / 4) * TILE_H + (rowOffset + 0.05) / ROWS * TILE_H) / 1024;
    const y0 = y1 - (floors - 0.1) / ROWS * TILE_H / 1024;
    const tex = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      vertices.push(...corners[i]); uv.push(...tex[i]);
      colors.push(tint.r * shade, tint.g * shade, tint.b * shade);
    }
  };
  face([[x-w/2,base,z+d/2],[x+w/2,base,z+d/2],[x+w/2,base+h,z+d/2],[x-w/2,base+h,z+d/2]], bays, 1);
  face([[x+w/2,base,z+d/2],[x+w/2,base,z-d/2],[x+w/2,base+h,z-d/2],[x+w/2,base+h,z+d/2]], depth, 0.72);
  face([[x-w/2,base,z-d/2],[x-w/2,base,z+d/2],[x-w/2,base+h,z+d/2],[x-w/2,base+h,z-d/2]], depth, 0.86);
  face([[x+w/2,base,z-d/2],[x-w/2,base,z-d/2],[x-w/2,base+h,z-d/2],[x+w/2,base+h,z-d/2]], bays, 0.72);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  facades.push(geometry);

  const roofColor = [0x202b34, 0x263743, 0x2b404c][layer];
  const box = (bw: number, bh: number, bd: number, bx: number, by: number, bz: number) => {
    const piece = new BoxGeometry(bw, bh, bd).toNonIndexed();
    piece.deleteAttribute("normal"); piece.deleteAttribute("uv");
    piece.translate(bx, by, bz);
    vertexTint(piece, new Color(roofColor));
    solids.push(piece);
  };
  box(w + 0.08, 0.10, d + 0.08, x, base + h, z);
  // Stair / lift cores, a recessed top storey, and low service equipment.
  box(w * 0.48, FLOOR * (seed % 3 + 1), d * 0.6, x - w * 0.12, base + h + FLOOR * (seed % 3 + 1) / 2, z - d * 0.06);
  if (layer === 0) {
    box(0.36, 0.18, 0.28, x + w * 0.28, base + h + 0.12, z + d * 0.15);
    box(w + 0.12, 0.08, d + 0.12, x, base + h - FLOOR * 3, z);
  }
}

/** A distant, unbranded 339-inspired profile. Its base sits among the same city
 * blocks; the observation basket is a quiet warm band, not a luminous monument.
 */
function addTower(solids: BufferGeometry[]): void {
  const x = -8, z = -54, base = -10;
  const profiles: [number[][], number][] = [
    [[[0.24,0],[0.16,2],[0.12,10.1],[0.16,10.6]], 0x344650],
    [[[0.16,10.6],[0.42,11.3],[0.66,12.0],[0.66,12.2]], 0x44515a],
    [[[0.66,12.2],[0.67,12.36],[0.62,12.44]], 0x8c7960],
    [[[0.62,12.44],[0.48,12.65],[0.12,12.8],[0.085,14],[0.025,16.7],[0,17]], 0x3d4e59],
  ];
  for (const [profile, color] of profiles) {
    const part = new LatheGeometry(profile.map(([r,y]) => new Vector2(r,y)), 16).toNonIndexed();
    part.deleteAttribute("normal"); part.deleteAttribute("uv");
    part.translate(x,base,z); vertexTint(part,new Color(color)); solids.push(part);
  }
}

function addSky(bin: SceneBin, scene: Scene): void {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#060910");
    gradient.addColorStop(0.34, "#0c1420");
    gradient.addColorStop(0.46, "#172a39");
    gradient.addColorStop(0.52, "#2b414e");
    gradient.addColorStop(0.62, "#18242f");
    gradient.addColorStop(1, "#0c1016");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const map = bin.tex(new CanvasTexture(canvas));
  map.generateMipmaps = false;
  map.minFilter = LinearFilter;
  map.magFilter = LinearFilter;
  const sky = new Mesh(
    bin.geo(new SphereGeometry(64, 28, 18)),
    bin.mat(new MeshBasicMaterial({ map, side: BackSide, fog: false, depthWrite: false })),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -2;
  scene.add(sky);
}

export function addCityNight(bin: SceneBin, scene: Scene): void {
  scene.background = new Color(NIGHT_ZENITH);
  addSky(bin, scene);
  const facades: BufferGeometry[] = [];
  const solids: BufferGeometry[] = [];
  for (const building of BUILDINGS) addBuilding(building, facades, solids);
  addTower(solids);
  const walls = mergeGeometries(facades)!;
  const roofs = mergeGeometries(solids)!;
  for (const geometry of [...facades, ...solids]) geometry.dispose();
  scene.add(new Mesh(bin.geo(walls), bin.mat(new MeshBasicMaterial({ map: facadeAtlas(bin), vertexColors: true, fog: false }))));
  scene.add(new Mesh(bin.geo(roofs), bin.mat(new MeshBasicMaterial({ vertexColors: true, fog: false }))));
}
