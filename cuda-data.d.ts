export function compareGemm(size: number | string): {
  values: readonly number[];
  speedup: number;
  libraryPercent: number;
};
