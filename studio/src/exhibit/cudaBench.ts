import { compareGemm } from "../../../cuda-data.js";

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
    const lede = document.querySelector(".lede");
    const dock = document.querySelector(".work");
    if (!lede || !dock) return;
    const ledeBottom = lede.getBoundingClientRect().bottom;
    const dockTop = dock.getBoundingClientRect().top;
    const band = dockTop - ledeBottom;
    panel.style.top = `${ledeBottom + band * 0.46}px`;
    panel.style.maxHeight = `${Math.max(160, band - 20)}px`;
  };

  let live = false;
  const sync = () => {
    const approach = Number(root.dataset.approach ?? "0");
    const next = root.dataset.selected === "cuda" && approach >= 0.82;
    if (next === live) return;
    live = next;
    panel.classList.toggle("is-live", next);
    panel.inert = !next;
    panel.setAttribute("aria-hidden", next ? "false" : "true");
    if (next) place();
  };

  const frame = new ResizeObserver(place);
  frame.observe(document.documentElement);
  for (const node of [document.querySelector(".mast"), document.querySelector(".lede"), document.querySelector(".work")]) {
    if (node) frame.observe(node);
  }
  place();
  sync();

  const watch = new MutationObserver(sync);
  watch.observe(root, { attributes: true, attributeFilter: ["data-approach", "data-selected"] });
}
