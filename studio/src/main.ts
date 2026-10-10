import { readStations } from "./content/stations";
import { mountFilmStrip } from "./nav/filmStrip";

const root = document.querySelector<HTMLElement>("[data-night-floor]");
const canvas = document.querySelector<HTMLCanvasElement>("#night-floor-canvas");

if (!root || !canvas) {
  throw new Error("Night Floor document is missing its root or canvas.");
}

const stations = readStations(root);
if (stations.length !== 6) {
  throw new Error(`Night Floor expected 6 stations, found ${stations.length}.`);
}

mountFilmStrip(root);

const skipIntro = document.querySelector<HTMLButtonElement>("#skip-intro");
skipIntro?.addEventListener("click", () => {
  root.dataset.skipIntro = "true";
  document.documentElement.classList.add("intro-settled");
  document.querySelector<HTMLElement>("[data-station].is-selected")?.focus({ preventScroll: true });
});

void import("./scene")
  .then(({ mountNightFloorScene }) => {
    const scene = mountNightFloorScene(canvas, stations, root);
    if (!scene) {
      canvas.hidden = true;
      document.documentElement.classList.add("intro-settled");
      return;
    }
    window.addEventListener("pagehide", () => scene.dispose());
  })
  .catch(() => {
    canvas.hidden = true;
    document.documentElement.classList.add("intro-settled");
  });
