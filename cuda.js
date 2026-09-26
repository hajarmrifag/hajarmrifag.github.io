import { compareGemm } from "./cuda-data.js";
const selector = document.getElementById("matrix-size");
const number = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
selector.addEventListener("change", () => {
  const result = compareGemm(selector.value);
  result.values.forEach((value, index) => {
    document.querySelector(`[data-gpu-value="${index}"]`).textContent =
      number.format(value);
    document.querySelector(`[data-gpu-bar="${index}"]`).style.width =
      `${(value / result.values[3]) * 100}%`;
  });
  document.querySelector("[data-gpu-speedup]").textContent =
    `${result.speedup.toFixed(2)}×`;
  document.querySelector("[data-gpu-ratio]").textContent =
    `${result.libraryPercent.toFixed(1)}%`;
  document.querySelector("[data-matrix-label]").textContent =
    `${selector.value} × ${selector.value}`;
});
document.querySelector(".cuda-control").hidden = false;
