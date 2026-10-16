import {
  BackSide,
  CanvasTexture,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  Scene,
} from "three";
import { addBox, type SceneBin } from "./props";

/** Horizon the far blocks fade into. The sky gradient uses the same blue. */
export const NIGHT_HORIZON = 0x1e4660;
export const NIGHT_ZENITH = 0x070b12;

/** One facade painting represents this much building, in meters. */
const UNIT_W = 5;
const UNIT_H = 10;
const FLOORS = 18;
const COLUMNS = 8;

interface FacadeStyle {
  seed: number;
  /** Chance a dark floor still has a light on. Kept low: it is after midnight. */
  lit: number;
  /** Chance an otherwise dark floor is awake, with several rooms lit. */
  awake: number;
  /** Share of lit windows that are warm rather than a cool screen. */
  warm: number;
  /** Lit penthouse band at the roof. Used only on the crown piece. */
  crown: boolean;
}

interface Mass {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  style: FacadeStyle;
  color: number;
  glow: number;
}

const SILHOUETTE: FacadeStyle = { seed: 4, lit: 0.04, awake: 0.05, warm: 0.92, crown: false };
const HOMES: FacadeStyle = { seed: 17, lit: 0.12, awake: 0.34, warm: 0.9, crown: false };
const HOMES_ALT: FacadeStyle = { seed: 43, lit: 0.1, awake: 0.26, warm: 0.84, crown: false };
const SHAFT: FacadeStyle = { seed: 61, lit: 0.05, awake: 0.1, warm: 0.78, crown: false };
const CROWN: FacadeStyle = { seed: 83, lit: 0.1, awake: 0.18, warm: 0.72, crown: true };
const DISTANT: FacadeStyle = { seed: 97, lit: 0.07, awake: 0.12, warm: 0.4, crown: false };

/**
 * Layers, near to far. Tops step around the window head (y 3.12) so some
 * panes keep sky and the one tower is allowed to leave the frame.
 * `y` is the base. Nothing here casts a shadow into the room.
 */
const MASSES: readonly Mass[] = [
  { x: -3.05, y: -2, z: -9.2, w: 0.7, h: 7.4, d: 1.6, style: SILHOUETTE, color: 0xffffff, glow: 1.6 },
  { x: 1.1, y: -1.2, z: -10.6, w: 1.8, h: 3.3, d: 1.5, style: SILHOUETTE, color: 0xffffff, glow: 1.2 },

  { x: -0.4, y: -2.2, z: -14.8, w: 3.8, h: 7.6, d: 2.8, style: HOMES, color: 0xffffff, glow: 3.2 },
  { x: 2.55, y: -1.4, z: -12.8, w: 1.35, h: 3.6, d: 1.6, style: HOMES_ALT, color: 0xffffff, glow: 2.6 },
  { x: 4.55, y: -2.4, z: -17.2, w: 1.7, h: 8.2, d: 2.2, style: SHAFT, color: 0xffffff, glow: 2.2 },
  { x: 4.55, y: 5.8, z: -17.2, w: 1.1, h: 3.4, d: 1.5, style: SHAFT, color: 0xffffff, glow: 2.2 },
  { x: 4.55, y: 9.2, z: -17.2, w: 0.72, h: 2.4, d: 1.0, style: CROWN, color: 0xffffff, glow: 3.4 },
  { x: 6.55, y: -2, z: -15.6, w: 2.5, h: 6.8, d: 2.4, style: HOMES, color: 0xffffff, glow: 3.0 },
  { x: 9.05, y: -2.2, z: -18.8, w: 3.4, h: 6.4, d: 2.8, style: HOMES_ALT, color: 0xffffff, glow: 2.4 },
  { x: 12.15, y: -1.6, z: -14, w: 2.0, h: 5.2, d: 2.0, style: HOMES, color: 0xffffff, glow: 2.8 },

  { x: -1.6, y: -2, z: -28, w: 3.0, h: 6.4, d: 2.2, style: DISTANT, color: 0xb7c8d8, glow: 1.5 },
  { x: 2.3, y: -2.2, z: -33, w: 1.55, h: 10, d: 1.8, style: DISTANT, color: 0xa9bdd0, glow: 1.2 },
  { x: 6.5, y: -1.6, z: -31, w: 3.6, h: 5.4, d: 2.4, style: DISTANT, color: 0xb7c8d8, glow: 1.35 },
  { x: 10.7, y: -2, z: -37, w: 2.5, h: 7.4, d: 2.2, style: DISTANT, color: 0xa3b8cc, glow: 1.05 },
  { x: 5, y: -2.6, z: -45, w: 22, h: 4.2, d: 3.2, style: DISTANT, color: 0x9eb4c8, glow: 0.85 },
];

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Dark glass grid, with a few rooms still lit. Color and glow share one seed. */
function paintFacade(style: FacadeStyle, glow: boolean): (context: CanvasRenderingContext2D) => void {
  return (context) => {
    const { width, height } = context.canvas;
    const next = random(style.seed);
    if (glow) {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
    } else {
      context.fillStyle = "#2a3a4c";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(0, 0, 0, 0.28)";
      for (let column = 0; column < COLUMNS; column += 2) {
        context.fillRect((column / COLUMNS) * width, 0, (width / COLUMNS) * 0.5, height);
      }
      context.fillStyle = "rgba(0, 0, 0, 0.45)";
      context.fillRect(0, 0, width, height * 0.03);
    }

    const cellW = width / COLUMNS;
    const cellH = height / FLOORS;
    for (let floor = 0; floor < FLOORS; floor += 1) {
      const penthouse = style.crown && floor < 2;
      const awake = next() < (penthouse ? 0.9 : style.awake);
      const darkBand = !penthouse && floor % 7 === 5;
      if (!glow) {
        context.globalAlpha = 1;
        context.strokeStyle = "rgba(8, 12, 18, 0.55)";
        context.beginPath();
        context.moveTo(0, floor * cellH);
        context.lineTo(width, floor * cellH);
        context.stroke();
      }
      for (let column = 0; column < COLUMNS; column += 1) {
        const roll = next();
        const lit = !darkBand && (penthouse ? roll < 0.72 : awake ? roll < 0.55 : roll < style.lit);
        const warm = next() < style.warm;
        const dim = next();
        const insetX = cellW * 0.3;
        const insetY = cellH * 0.34;
        const x = column * cellW + insetX + (next() - 0.5) * cellW * 0.08;
        const y = floor * cellH + insetY;
        const w = Math.max(1, cellW - insetX * 2);
        const h = Math.max(1, cellH - insetY * 2);
        if (!glow) {
          context.globalAlpha = 1;
          context.fillStyle = lit ? "rgba(196, 132, 78, 0.35)" : "#070b10";
          context.fillRect(x, y, w, h);
          continue;
        }
        if (!lit) continue;
        context.fillStyle = warm ? (dim > 0.62 ? "#c47a3a" : "#ffb15e") : "#a9c3d4";
        context.globalAlpha = 0.72 + dim * 0.28;
        context.fillRect(x, y, w, h);
      }
    }
    context.globalAlpha = 1;
  };
}

function facadeTexture(bin: SceneBin, style: FacadeStyle, glow: boolean): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 448;
  const context = canvas.getContext("2d");
  if (context) paintFacade(style, glow)(context);
  const texture = bin.raw(new CanvasTexture(canvas));
  texture.colorSpace = glow ? NoColorSpace : SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function massMaterial(
  bin: SceneBin,
  colorMap: CanvasTexture,
  glowMap: CanvasTexture,
  mass: Mass,
): MeshStandardMaterial {
  const map = bin.raw(colorMap.clone());
  const glow = bin.raw(glowMap.clone());
  const repeatY = mass.h / UNIT_H;
  for (const texture of [map, glow]) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(mass.w / UNIT_W, repeatY);
    texture.offset.y = 1 - repeatY;
    texture.needsUpdate = true;
  }
  map.colorSpace = SRGBColorSpace;
  glow.colorSpace = NoColorSpace;
  return bin.mat(
    new MeshStandardMaterial({
      color: mass.color,
      map,
      emissive: 0xffffff,
      emissiveMap: glow,
      emissiveIntensity: mass.glow,
      roughness: 1,
      metalness: 0,
    }),
  );
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
    gradient.addColorStop(0.46, "#1a3c56");
    gradient.addColorStop(0.52, "#24506c");
    gradient.addColorStop(0.62, "#14202c");
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
    bin.mat(
      new MeshBasicMaterial({
        map,
        side: BackSide,
        fog: false,
        depthWrite: false,
      }),
    ),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -2;
  scene.add(sky);
}

/** Night city beyond the glass: near silhouettes, a lit middle, and a hazed distance. */
export function addCityNight(bin: SceneBin, scene: Scene): void {
  scene.background = new Color(NIGHT_ZENITH);
  addSky(bin, scene);

  const painted = new Map<FacadeStyle, { color: CanvasTexture; glow: CanvasTexture }>();
  const sheet = (style: FacadeStyle) => {
    const existing = painted.get(style);
    if (existing) return existing;
    const created = {
      color: facadeTexture(bin, style, false),
      glow: facadeTexture(bin, style, true),
    };
    painted.set(style, created);
    return created;
  };

  for (const mass of MASSES) {
    const maps = sheet(mass.style);
    const mesh = addBox(
      bin,
      scene,
      mass.w,
      mass.h,
      mass.d,
      mass.x,
      mass.y + mass.h / 2,
      mass.z,
      massMaterial(bin, maps.color, maps.glow, mass),
    );
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  }
}
