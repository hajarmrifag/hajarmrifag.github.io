import { readStations } from "./content/stations";
import { mountAegisDesk } from "./exhibit/aegisDesk";
import { mountGridFlex } from "./exhibit/gridflexTable";
import { mountNeobankLedger } from "./exhibit/neobankLedger";
import { mountSkyQuery } from "./exhibit/skyqueryDesk";
import { mountCudaBench } from "./exhibit/cudaBench";
import { mountSourcedDesk } from "./exhibit/sourcedDesk";
import { mountFilmStrip } from "./nav/filmStrip";
import type { ExhibitOpenDetail } from "./nav/filmStrip";

const root = document.querySelector<HTMLElement>("[data-night-floor]");
const canvas = document.querySelector<HTMLCanvasElement>("#night-floor-canvas");

if (!root || !canvas) {
  throw new Error("Night Floor document is missing its root or canvas.");
}

const stations = readStations(root);
if (stations.length !== 6) {
  throw new Error(`Night Floor expected 6 stations, found ${stations.length}.`);
}

type SceneStatus = "loading" | "ready" | "unavailable";

let sceneStatus: SceneStatus = "loading";
let pendingOpen: ExhibitOpenDetail | null = null;
root.dataset.scene = sceneStatus;

const openCaseStudy = (detail: ExhibitOpenDetail) => {
  window.location.assign(detail.caseStudy);
};

const markSceneUnavailable = (error?: unknown) => {
  sceneStatus = "unavailable";
  root.dataset.scene = sceneStatus;
  canvas.hidden = true;
  document.documentElement.classList.add("intro-settled");
  if (error) console.error("Night Floor scene failed to initialize.", error);
  if (pendingOpen) openCaseStudy(pendingOpen);
  pendingOpen = null;
};

root.addEventListener("nightfloor:open-exhibit", (event) => {
  const detail = (event as CustomEvent<ExhibitOpenDetail>).detail;
  if (!detail?.id || !detail.caseStudy) return;
  if (sceneStatus === "unavailable") {
    openCaseStudy(detail);
    return;
  }
  if (sceneStatus === "loading") pendingOpen = detail;
});

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
      markSceneUnavailable();
      return;
    }
    sceneStatus = "ready";
    root.dataset.scene = sceneStatus;
    pendingOpen = null;
    window.addEventListener("pagehide", () => scene.dispose());
  })
  .catch(markSceneUnavailable);
