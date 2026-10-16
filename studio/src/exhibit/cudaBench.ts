import { compareGemm } from "../../../cuda-data.js";
import { bindExhibit } from "./presence";
import { watchStage } from "./stage";

const SIZES = [128, 256, 512, 1024] as const;

const number = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** Bench readout for the recorded T4 GEMM series. Hidden until the CUDA station is approached. */
export function mountCudaBench(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>("[data-cuda-bench]");
  if (!panel) return;

  const radios = [...panel.querySelectorAll<HTMLInputElement>('input[name="cuda-matrix"]')];
  const figures = [...panel.querySelectorAll<HTMLElement>("[data-gpu-value]")];
  const bars = [...panel.querySelectorAll<HTMLElement>("[data-gpu-bar]")];
  const result = panel.querySelector<HTMLElement>("[data-gpu-result]");
  const label = panel.querySelector<HTMLElement>("[data-matrix-label]");
  if (!result || !label || figures.length !== 4 || bars.length !== 4) return;

  const show = (size: string) => {
    const comparison = compareGemm(size);
    const full = comparison.values[3] ?? 0;
    comparison.values.forEach((value, index) => {
      const figure = figures[index];
      const bar = bars[index];
      if (!figure || !bar || !(full > 0)) return;
      const text = number.format(value);
      figure.textContent = text;
      figure.setAttribute("aria-label", `${text} GFLOPS`);
      bar.style.width = `${(value / full) * 100}%`;
    });
    const detent = SIZES.indexOf(Number(size) as (typeof SIZES)[number]);
    panel.style.setProperty("--detent", String(Math.max(0, detent)));
    label.textContent = `${size} × ${size}`;
    result.textContent = `${comparison.speedup.toFixed(2)}× the naïve kernel’s throughput; ${comparison.libraryPercent.toFixed(1)}% of cuBLAS for ${size} × ${size}.`;
  };

  for (const radio of radios) {
    radio.addEventListener("change", () => {
      if (radio.checked) show(radio.value);
    });
  }

  const checked = radios.find((radio) => radio.checked);
  show(checked?.value ?? "1024");

  const place = () => {
    if (!panel.classList.contains("is-live")) return;
    const lede = document.querySelector(".lede");
    const dock = document.querySelector(".work");
    if (!lede || !dock) return;
    const top = lede.getBoundingClientRect().bottom + 8;
    const dockTop = dock.getBoundingClientRect().top;
    const gap = window.innerWidth < 900 ? 18 : 14;
    const span = Math.max(180, dockTop - top - gap);
    const nextTop = `${Math.round(top)}px`;
    const nextMax = `${Math.round(span)}px`;
    // Neobank and GridFlex fill about this much of the seated band. A shorter card leaves the bench back showing.
    const nextMin = `${Math.round(Math.min(span, Math.max(panel.scrollHeight, 486)))}px`;
    if (panel.style.top !== nextTop) panel.style.top = nextTop;
    if (panel.style.maxHeight !== nextMax) panel.style.maxHeight = nextMax;
    if (panel.style.minHeight !== nextMin) panel.style.minHeight = nextMin;
  };

  watchStage(place);
  bindExhibit(root, "cuda", panel, place);
  void document.fonts?.ready.then(place);
}
