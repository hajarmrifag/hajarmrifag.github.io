/**
 * Recorded GridFlex light table.
 * Demand hours are the measured hourly means in morocco_tetouan_sample.csv
 * for 2017-01-01 UTC. Solar and wind in that file are estimated shapes and
 * are not plotted here.
 * Timings are the shift-and-battery rows in benchmark.js and recorded.json.
 * This desk does not run the engine.
 */

/** Measured demand, MW, 00:00 through 23:00 UTC. */
const DEMAND_MW = [
  66.47677059666667, 57.778526209999995, 52.08988164, 48.914447548333335, 47.71463834666667,
  48.27217814333333, 49.75869511833333, 41.54337860333334, 42.53402655833333, 49.74641214500001,
  57.72032408166667, 63.06110159333333, 64.93047425, 65.90832749166665, 64.871075335,
  63.53572299333333, 62.62190378166667, 77.79378661333332, 89.71009925999999, 91.19741265166667,
  92.271218575, 88.89396386833332, 80.62179777333334, 69.75748164833334,
] as const;

/** Shift + battery pipeline. Same pairs as benchmark.js. */
const ENGINE_MS: Record<30 | 60 | 365, { before: number; after: number }> = {
  30: { before: 36.137, after: 1.439 },
  60: { before: 71.731, after: 2.246 },
  365: { before: 445.389, after: 10.139 },
};

const HORIZONS = [30, 60, 365] as const;

type Horizon = (typeof HORIZONS)[number];

function isHorizon(value: string): value is `${Horizon}` {
  return HORIZONS.some((days) => String(days) === value);
}

function clock(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

/** Desk readout for the GridFlex station. Hidden until that station is approached. */
export function mountGridFlex(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>("[data-gridflex-desk]");
  if (!panel) return;

  const film = panel.querySelector<HTMLElement>("[data-demand-film]");
  const hourInput = panel.querySelector<HTMLInputElement>("[data-hour]");
  const hourClock = panel.querySelector<HTMLElement>("[data-hour-clock]");
  const hourMw = panel.querySelector<HTMLElement>("[data-hour-mw]");
  const daySum = panel.querySelector<HTMLElement>("[data-day-sum]");
  const horizons = [...panel.querySelectorAll<HTMLInputElement>('input[name="gridflex-days"]')];
  const beforeBar = panel.querySelector<HTMLElement>("[data-before-bar]");
  const afterBar = panel.querySelector<HTMLElement>("[data-after-bar]");
  const beforeMs = panel.querySelector<HTMLElement>("[data-before-ms]");
  const afterMs = panel.querySelector<HTMLElement>("[data-after-ms]");
  const speedup = panel.querySelector<HTMLElement>("[data-speedup]");
  const scope = panel.querySelector<HTMLElement>("[data-scope]");
  if (!film || !hourInput || !hourClock || !hourMw || !daySum || !beforeBar || !afterBar || !beforeMs || !afterMs || !speedup || !scope) return;
  if (horizons.length !== 3) return;

  const peak = Math.max(...DEMAND_MW);
  const dayMwh = DEMAND_MW.reduce((sum, hour) => sum + hour, 0);
  daySum.textContent = dayMwh.toFixed(1);
  const bars = DEMAND_MW.map((demand, hour) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gf-bar";
    button.style.setProperty("--level", `${(demand / peak) * 100}%`);
    button.setAttribute("aria-label", `${clock(hour)}, ${demand.toFixed(2)} MW`);
    button.addEventListener("click", () => {
      hourInput.value = String(hour);
      paintHour();
    });
    film.append(button);
    return button;
  });

  const paintHour = () => {
    const hour = Math.min(23, Math.max(0, Number(hourInput.value) || 0));
    const demand = DEMAND_MW[hour] ?? DEMAND_MW[0];
    bars.forEach((bar, index) => {
      bar.setAttribute("aria-pressed", String(index === hour));
    });
    hourInput.setAttribute("aria-valuetext", `${clock(hour)}, ${demand.toFixed(2)} megawatts`);
    hourClock.textContent = clock(hour);
    hourMw.textContent = demand.toFixed(2);
  };

  const selectedHorizon = (): Horizon => {
    const value = horizons.find((input) => input.checked)?.value ?? "60";
    return isHorizon(value) ? Number(value) as Horizon : 60;
  };

  const paintBench = () => {
    const days = selectedHorizon();
    const timing = ENGINE_MS[days];
    const ratio = (timing.before / timing.after).toFixed(1);
    const afterWidth = (100 * timing.after) / timing.before;
    beforeBar.style.width = "100%";
    afterBar.style.width = `${afterWidth}%`;
    const before = timing.before.toFixed(3);
    const after = timing.after.toFixed(3);
    beforeMs.textContent = `${before} ms`;
    afterMs.textContent = `${after} ms`;
    speedup.textContent = `${ratio}×`;
    scope.textContent = days === 365 ? "Scaling case. The public app stops at 60 days." : "";
  };

  hourInput.addEventListener("input", paintHour);
  for (const input of horizons) input.addEventListener("change", paintBench);
  paintHour();
  paintBench();

  const place = () => {
    const lede = document.querySelector(".lede");
    const dock = document.querySelector(".work");
    if (!lede || !dock) return;
    const top = lede.getBoundingClientRect().bottom + 8;
    const dockTop = dock.getBoundingClientRect().top;
    const gap = window.innerWidth < 900 ? 18 : 14;
    panel.style.top = `${top}px`;
    panel.style.maxHeight = `${Math.max(180, dockTop - top - gap)}px`;
  };

  let live = false;
  const sync = () => {
    const approach = Number(root.dataset.approach ?? "0");
    const next = root.dataset.selected === "gridflex" && approach >= 0.82;
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
  new MutationObserver(sync).observe(root, {
    attributes: true,
    attributeFilter: ["data-approach", "data-selected"],
  });
}
