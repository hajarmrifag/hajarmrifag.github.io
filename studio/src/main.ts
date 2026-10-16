import { readStations } from "./content/stations";
import { mountAegisDesk } from "./exhibit/aegisDesk";
import { mountGridFlex } from "./exhibit/gridflexTable";
import { mountNeobankLedger } from "./exhibit/neobankLedger";
import { mountSkyQuery } from "./exhibit/skyqueryDesk";
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
mountAegisDesk(root);
mountGridFlex(root);
mountNeobankLedger(root);
mountSkyQuery(root);
mountSeatedView(root);

const skipIntro = document.querySelector<HTMLButtonElement>("#skip-intro");
skipIntro?.addEventListener("click", () => {
  root.dataset.skipIntro = "true";
  document.documentElement.classList.add("intro-settled");
  document.querySelector<HTMLElement>("[data-station].is-selected")?.focus({ preventScroll: true });
});

/** Compact the homepage identity for the whole sit-down, not mid-blend samples. */
function mountSeatedView(root: HTMLElement): void {
  const sync = () => {
    const camera = root.dataset.camera;
    root.classList.toggle("is-seated", camera === "approach" || camera === "station");
  };
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ["data-camera"],
  });
  sync();
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
