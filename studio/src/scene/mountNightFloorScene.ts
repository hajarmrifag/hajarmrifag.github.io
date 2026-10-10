import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import type { StationSelectDetail } from "../nav/filmStrip";
import type { Station } from "../content/stations";
import { addBlockout } from "./blockout";
import { CameraRig } from "./cameraRig";
import {
  easeInOutCubic,
  easeOutCubic,
  INTRO_SECONDS,
  SETTLED_U,
  SKIP_SECONDS,
  STATION_SECONDS,
  stationU,
} from "./rail";
import type { NightFloorScene } from "./types";

const INTRO_SEEN = "night-floor-intro";

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

/**
 * Blockout rail: one spline for the entrance and the six project stops.
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

  const scene = new Scene();
  const disposeBlockout = addBlockout(scene);
  const camera = new PerspectiveCamera(35, 1, 0.08, 60);
  const rig = new CameraRig();
  const look = new Vector3();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forceIntro = new URLSearchParams(window.location.search).get("intro") === "1";
  const skip = document.querySelector<HTMLButtonElement>("#skip-intro");

  let mode: "intro" | "skip" | "travel" | "settled" | "station" = "settled";
  let frame = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    if (nextWidth === 0 || nextHeight === 0) return;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
  };

  const paint = () => {
    rig.apply(camera.position, look);
    camera.lookAt(look);
    renderer.render(scene, camera);
    root.dataset.railU = rig.u.toFixed(3);
  };

  const finish = () => {
    if (mode === "intro" || mode === "skip") {
      mode = "settled";
      root.dataset.camera = "settled";
      hideIntroControl();
      markIntroSeen();
      return;
    }
    if (mode === "travel") {
      mode = "station";
      root.dataset.camera = "station";
    }
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
      finish();
    };
    frame = requestAnimationFrame(step);
  };

  const travelTo = (u: number, seconds: number, next: typeof mode) => {
    mode = next;
    root.dataset.camera = next;
    rig.animateTo(u, reduced ? 0 : seconds, next === "skip" ? easeOutCubic : easeInOutCubic);
    if (rig.isMoving) startLoop();
    else {
      paint();
      finish();
    }
  };

  const onSkip = () => {
    root.dataset.skipIntro = "true";
    hideIntroControl();
    focusSelectedFrame();
    travelTo(SETTLED_U, SKIP_SECONDS, "skip");
  };

  const onStation = (event: Event) => {
    const detail = (event as CustomEvent<StationSelectDetail>).detail;
    if (!detail?.user || detail.index < 0 || detail.index > 5) return;
    hideIntroControl();
    markIntroSeen();
    travelTo(stationU(detail.index), STATION_SECONDS, "travel");
  };

  skip?.addEventListener("click", onSkip);
  root.addEventListener("nightfloor:station", onStation);

  const chosen = stations.findIndex((station) => station.id === root.dataset.selected);
  const chosenIndex = chosen < 0 ? 0 : chosen;
  if (root.dataset.skipIntro === "true") {
    rig.seek(SETTLED_U);
    hideIntroControl();
    markIntroSeen();
    mode = "settled";
  } else if (root.dataset.stationUser === "true") {
    rig.seek(stationU(chosenIndex));
    hideIntroControl();
    markIntroSeen();
    mode = "station";
  } else if (!reduced && (forceIntro || !introAlreadySeen())) {
    rig.seek(0);
    mode = "intro";
    root.dataset.camera = "intro";
    rig.animateTo(SETTLED_U, INTRO_SECONDS, easeInOutCubic);
  } else {
    rig.seek(SETTLED_U);
    hideIntroControl();
    mode = "settled";
  }

  root.dataset.camera = mode;
  resize();
  paint();
  if (rig.isMoving) startLoop();

  const observer = new ResizeObserver(() => {
    resize();
    paint();
  });
  observer.observe(canvas);

  return {
    stations,
    dispose() {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      skip?.removeEventListener("click", onSkip);
      root.removeEventListener("nightfloor:station", onStation);
      disposeBlockout();
      renderer.dispose();
    },
  };
}
