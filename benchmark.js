// Recorded GridFlex 0.2.0 measurements; values are not live benchmarks.
const measurements = {
  30: { before: 36.137, after: 1.439 },
  60: { before: 71.731, after: 2.246 },
  365: { before: 445.389, after: 10.139 },
};

document.querySelectorAll("[data-days]").forEach((button) => {
  button.addEventListener("click", () => {
    const days = button.dataset.days;
    const measurement = measurements[days];
    if (!measurement) return;
    document.querySelectorAll("[data-days]").forEach((control) => {
      control.setAttribute("aria-pressed", String(control === button));
    });
    document.getElementById("before-time").textContent =
      `${measurement.before.toFixed(3)} ms`;
    document.getElementById("after-time").textContent =
      `${measurement.after.toFixed(3)} ms`;
    document.getElementById("after-bar").style.width =
      `${(100 * measurement.after) / measurement.before}%`;
    document.getElementById("benchmark-result").textContent =
      `${(measurement.before / measurement.after).toFixed(1)}× faster · ${days}-day profile`;
  });
});
