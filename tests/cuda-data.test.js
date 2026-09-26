import test from "node:test";
import assert from "node:assert/strict";
import { compareGemm, gemmResults } from "../cuda-data.js";
test("comparisons use the selected workload and the cuBLAS baseline", () => {
  assert.equal(compareGemm(1024).speedup.toFixed(2), "3.32");
  assert.equal(compareGemm(1024).libraryPercent.toFixed(1), "24.0");
  assert.equal(compareGemm(128).libraryPercent.toFixed(1), "93.0");
  for (const size of Object.keys(gemmResults)) {
    const result = compareGemm(size);
    assert.equal(result.values.length, 4);
    assert.ok(
      result.values.every((value) => Number.isFinite(value) && value > 0),
    );
    assert.ok(result.libraryPercent <= 100);
  }
});
test("unknown sizes and prototype keys never become fabricated measurements", () => {
  for (const size of [4096, NaN, "constructor", "__proto__"])
    assert.throws(() => compareGemm(size), RangeError);
});
