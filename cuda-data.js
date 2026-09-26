// NVIDIA T4, CUDA 12.8, FP32; median of 20 CUDA-event runs.
// Source: cuda-transformer-kernels/results/gemm_t4.md.
export const gemmResults = Object.freeze({
  128: Object.freeze([207.721, 231.168, 233.64, 251.096]),
  256: Object.freeze([327.68, 400.526, 645.675, 837.521]),
  512: Object.freeze([376.644, 473.157, 872.722, 3030.567]),
  1024: Object.freeze([385.648, 485.283, 1278.508, 5322.721]),
});
export function compareGemm(size) {
  if (!Object.hasOwn(gemmResults, size))
    throw new RangeError("No recorded benchmark for this size.");
  const values = gemmResults[size];
  return {
    values,
    speedup: values[2] / values[0],
    libraryPercent: (values[2] / values[3]) * 100,
  };
}
