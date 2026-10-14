import { readStations } from "./content/stations";
import { mountCudaBench } from "./exhibit/cudaBench";
import { mountSourcedDesk } from "./exhibit/sourcedDesk";
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
mountCudaBench(root);
mountSourcedDesk(root);
mountSeatedView(root);

const skipIntro = document.querySelector<HTMLButtonElement>("#skip-intro");
skipIntro?.addEventListener("click", () => {
  root.dataset.skipIntro = "true";
  document.documentElement.classList.add("intro-settled");
  document.querySelector<HTMLElement>("[data-station].is-selected")?.focus({ preventScroll: true });
});

/** Compact the homepage identity while a station is in the close view. */
function mountSeatedView(root: HTMLElement): void {
  let seated = false;
  const sync = () => {
    const approach = Number(root.dataset.approach ?? "0");
    const next = seated ? approach >= 0.45 : approach >= 0.22;
    if (next === seated) return;
    seated = next;
    root.classList.toggle("is-seated", next);
  };
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ["data-approach"],
  });
}

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
