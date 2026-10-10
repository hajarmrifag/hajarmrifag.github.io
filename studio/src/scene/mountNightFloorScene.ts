import { Color, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { Station } from "../content/stations";
import type { NightFloorScene } from "./types";

const NIGHT = new Color("#12141a");

/**
 * Prepares the WebGL surface for the later laboratory.
 * No meshes, camera move, or render loop yet: one clear, then redraws on resize.
 */
export function mountNightFloorScene(
  canvas: HTMLCanvasElement,
  stations: readonly Station[],
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

  const context = renderer.getContext();
  if (!context) {
    renderer.dispose();
    return null;
  }

  const scene = new Scene();
  scene.background = NIGHT;
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);

  const render = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  };

  render();
  const frame = requestAnimationFrame(render);
  const observer = new ResizeObserver(render);
  observer.observe(canvas);

  return {
    stations,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    },
  };
}
