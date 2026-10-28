import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import type { StationSelectDetail } from "../nav/filmStrip";
import type { Station } from "../content/stations";
import { addBlockout } from "./blockout";
import { CameraRig } from "./cameraRig";
import {
  APPROACH_SECONDS,
  easeInOutCubic,
  easeOutCubic,
  INTRO_SECONDS,
  LEAVE_SECONDS,
  SETTLED_U,
  SKIP_SECONDS,
  STATION_SECONDS,
  stationIndexAt,
  stationU,
} from "./rail";
import type { NightFloorScene } from "./types";

const INTRO_SEEN = "night-floor-intro";

// World-space envelope of lamp.glb and nameplate.glb (including its feet),
// rounded outwards from their geometry in the existing mounts.
// Frame these together on portrait screens; neither object nor the rail moves.
const ARRIVAL_FRAME = [-1.73, -0.94].flatMap((x) =>
  [0.75, 1.29].flatMap((y) => [-0.86, -0.10].map((z) => new Vector3(x, y, z))),
);

type Ease = (t: number) => number;
type CameraMode = "intro" | "skip" | "leave" | "travel" | "approach" | "settled" | "standing" | "station";

interface Motion {
  u?: number;
  approach?: number;
  seconds: number;
  ease: Ease;
  tag: CameraMode;
}

function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN, "seen");
  } catch {
    // Private browsing can reject storage. The shot still plays once.
  }
}

function introAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN) === "seen";
  } catch {
    return false;
  }
}

function focusSelectedFrame(): void {
  document
    .querySelector<HTMLElement>("[data-station].is-selected")
    ?.focus({ preventScroll: true });
}

function hideIntroControl(): void {
  document.documentElement.classList.add("intro-settled");
  document.querySelector<HTMLButtonElement>("#skip-intro")?.setAttribute("hidden", "");
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

function isExhibitControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-cuda-bench], [data-sourced-desk], [data-aegis-desk], [data-gridflex-desk], [data-neobank-desk], [data-skyquery-desk]"));
}

/**
 * Blockout laboratory on one spline. The arrival, the rail, and the
 * sit-down / stand-up moves share that path.
 * Returns null when WebGL cannot start. The document stays usable either way.
 */
export function mountNightFloorScene(
  canvas: HTMLCanvasElement,
  stations: readonly Station[],
  root: HTMLElement,
): NightFloorScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }

  if (!renderer.getContext()) {
    renderer.dispose();
    return null;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const lean =
    window.matchMedia("(max-width: 800px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  if (!lean) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
  }

  const scene = new Scene();
  const disposeBlockout = addBlockout(scene, stations, renderer, {
    shadows: !lean,
    lamps: !lean,
    reflections: !lean,
  });
  const camera = new PerspectiveCamera(35, 1, 0.06, 80);
  const rig = new CameraRig();
  const look = new Vector3();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forceIntro = new URLSearchParams(window.location.search).get("intro") === "1";
  const skip = document.querySelector<HTMLButtonElement>("#skip-intro");

  let mode: CameraMode = "settled";
  let frame = 0;
  let width = 0;
  let height = 0;
  let queue: Motion[] = [];

  const resize = () => {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    if (nextWidth === 0 || nextHeight === 0) return;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lean ? 1.25 : 2));
    renderer.setSize(width, height, false);
  };

  /** Put the look target in the open band between the lede and the film strip. */
  const placeSubject = () => {
    const lede = document.querySelector(".lede");
    const dock = document.querySelector(".work");
    if (!lede || !dock || width === 0 || height === 0) return;
    const ledeBottom = lede.getBoundingClientRect().bottom;
    const dockTop = dock.getBoundingClientRect().top;
    const band = dockTop - ledeBottom;
    const aim = ledeBottom + band * 0.46;
    const shift = Math.round(height / 2 - aim);
    camera.zoom = 1;
    camera.clearViewOffset();
    if (band < 80) return;

    // Ease the portrait composition in from the lamp beat, then release it
    // before the first station. Desktop and all six station poses stay intact.
    const enter = Math.min(1, Math.max(0, (rig.u - SETTLED_U / 3) / (SETTLED_U / 3)));
    const leave = Math.min(1, Math.max(0, (rig.u - SETTLED_U) / (stationU(0) - SETTLED_U)));
    const portrait = Math.min(1, Math.max(0, (height / width - 1) / 0.5));
    const blend = portrait * easeInOutCubic(enter) * (1 - easeInOutCubic(leave));
    if (blend > 0) {
      const points = ARRIVAL_FRAME.map((point) => point.clone().project(camera));
      const left = Math.min(...points.map((point) => point.x)) * width / 2;
      const right = Math.max(...points.map((point) => point.x)) * width / 2;
      const top = -Math.max(...points.map((point) => point.y)) * height / 2;
      const bottom = -Math.min(...points.map((point) => point.y)) * height / 2;
      const gutter = 12;
      const zoom = Math.min(1, (width - gutter * 2) / (right - left), (band - gutter * 2) / (bottom - top));
      const offsetX = (left + right) / 2 * zoom;
      const offsetY = height / 2 + (top + bottom) / 2 * zoom - (ledeBottom + band / 2);
      camera.zoom = 1 + (zoom - 1) * blend;
      camera.setViewOffset(width, height, offsetX * blend, shift + (offsetY - shift) * blend, width, height);
    } else if (Math.abs(shift) >= 6) {
      camera.setViewOffset(width, height, 0, shift, width, height);
    }
  };

  /**
   * The open exhibit follows the camera, not the film-strip highlight.
   * It is published only after the sit-down step has finished, and cleared
   * on the same turn a departure or retarget begins.
   */
  const publishExhibit = () => {
    const index = mode === "station" ? stationIndexAt(rig.u) : -1;
    const next = index < 0 ? "" : (stations[index]?.id ?? "");
    if ((root.dataset.exhibit ?? "") === next) return;
    root.dataset.exhibit = next;
  };

  const paint = () => {
    rig.apply(camera.position, look);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    placeSubject();
    renderer.render(scene, camera);
    root.dataset.railU = rig.u.toFixed(3);
    root.dataset.approach = rig.approach.toFixed(2);
  };

  const finishRest = () => {
    if (mode === "intro" || mode === "skip") {
      mode = "settled";
      hideIntroControl();
      markIntroSeen();
    } else if (mode === "approach") {
      mode = "station";
    } else if (mode === "leave" || mode === "travel") {
      mode = Math.abs(rig.u - SETTLED_U) < 0.03 ? "settled" : "standing";
    }
    root.dataset.camera = mode;
    publishExhibit();
  };

  const startStep = (step: Motion) => {
    mode = step.tag;
    root.dataset.camera = mode;
    publishExhibit();
    const seconds = reduced ? 0 : step.seconds;
    if (step.u !== undefined) rig.animateTo(step.u, seconds, step.ease);
    if (step.approach !== undefined) rig.animateApproach(step.approach, seconds, step.ease);
    if (rig.isMoving) startLoop();
    else onStepDone();
  };

  const onStepDone = () => {
    const next = queue.shift();
    if (!next) {
      finishRest();
      paint();
      return;
    }
    startStep(next);
  };

  const startLoop = () => {
    if (frame) return;
    let last = performance.now();
    const step = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      resize();
      const moving = rig.tick(delta);
      paint();
      if (moving) {
        frame = requestAnimationFrame(step);
        return;
      }
      frame = 0;
      onStepDone();
    };
    frame = requestAnimationFrame(step);
  };

  const play = (steps: readonly Motion[]) => {
    const [first, ...rest] = steps;
    if (!first) return;
    queue = rest;
    startStep(first);
  };

  const goToStation = (index: number) => {
    const destination = stationU(index);
    const there = Math.abs(rig.u - destination) < 0.02;
    const steps: Motion[] = [];
    if (rig.approach > 0.02 && !there) {
      steps.push({ approach: 0, seconds: LEAVE_SECONDS, ease: easeInOutCubic, tag: "leave" });
    }
    if (!there) {
      steps.push({ u: destination, seconds: STATION_SECONDS, ease: easeInOutCubic, tag: "travel" });
    }
    if (!there || rig.approach < 0.98) {
      steps.push({ approach: 1, seconds: APPROACH_SECONDS, ease: easeInOutCubic, tag: "approach" });
    }
    play(steps);
  };

  const onSkip = () => {
    root.dataset.skipIntro = "true";
    hideIntroControl();
    focusSelectedFrame();
    play([
      {
        u: SETTLED_U,
        approach: 0,
        seconds: SKIP_SECONDS,
        ease: easeOutCubic,
        tag: "skip",
      },
    ]);
  };

  const onStation = (event: Event) => {
    const detail = (event as CustomEvent<StationSelectDetail>).detail;
    if (!detail?.user || detail.index < 0 || detail.index > 5) return;
    hideIntroControl();
    markIntroSeen();
    goToStation(detail.index);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const exhibit = isExhibitControl(event.target);
    if (isTypingTarget(event.target) && !(exhibit && event.key === "Escape")) return;
    if (exhibit && event.key !== "Escape") return;
    if (event.key === "Enter") {
      if (event.target instanceof Element && event.target.closest("a, button")) return;
      const index = stations.findIndex((station) => station.id === root.dataset.selected);
      if (index < 0) return;
      event.preventDefault();
      hideIntroControl();
      markIntroSeen();
      goToStation(index);
      return;
    }
    if (event.key === "Escape" && rig.approach > 0.02) {
      event.preventDefault();
      play([{ approach: 0, seconds: LEAVE_SECONDS, ease: easeInOutCubic, tag: "leave" }]);
    }
  };

  skip?.addEventListener("click", onSkip);
  root.addEventListener("nightfloor:station", onStation);
  window.addEventListener("keydown", onKey);

  const chosen = stations.findIndex((station) => station.id === root.dataset.selected);
  const chosenIndex = chosen < 0 ? 0 : chosen;
  if (root.dataset.skipIntro === "true") {
    rig.seek(SETTLED_U);
    rig.seekApproach(0);
    hideIntroControl();
    markIntroSeen();
    mode = "settled";
  } else if (root.dataset.stationUser === "true") {
    rig.seek(stationU(chosenIndex));
    rig.seekApproach(0);
    hideIntroControl();
    markIntroSeen();
    mode = "travel";
    play([{ approach: 1, seconds: APPROACH_SECONDS, ease: easeInOutCubic, tag: "approach" }]);
  } else if (!reduced && (forceIntro || !introAlreadySeen())) {
    rig.seek(0);
    rig.seekApproach(0);
    mode = "intro";
    play([{ u: SETTLED_U, seconds: INTRO_SECONDS, ease: easeInOutCubic, tag: "intro" }]);
  } else {
    rig.seek(SETTLED_U);
    rig.seekApproach(0);
    hideIntroControl();
    mode = "settled";
  }

  root.dataset.camera = mode;
  resize();
  paint();

  const observer = new ResizeObserver(() => {
    resize();
    paint();
  });
  observer.observe(canvas);

  return {
    stations,
    dispose() {
      if (frame) cancelAnimationFrame(frame);
      queue = [];
      observer.disconnect();
      skip?.removeEventListener("click", onSkip);
      root.removeEventListener("nightfloor:station", onStation);
      window.removeEventListener("keydown", onKey);
      disposeBlockout();
      renderer.dispose();
    },
  };
}
