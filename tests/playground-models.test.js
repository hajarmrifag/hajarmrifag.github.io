import test from "node:test";
import assert from "node:assert/strict";
import {
  createClaim,
  updateClaim,
  createBank,
  transfer,
  compareGemm,
} from "../playground-models.js";

test("an unauthorized status attempt preserves state and audit history", () => {
  const claim = createClaim();
  const result = updateClaim(claim, "Adjuster", "Approved");
  assert.equal(result.code, 403);
  assert.deepEqual(result.state, { status: "Submitted", audit: [] });
});
test("Manager and Admin changes are audited, while identical retries are no-ops", () => {
  for (const role of ["Manager", "Admin"]) {
    const initial = createClaim();
    const changed = updateClaim(initial, role, "Approved");
    const replayed = updateClaim(changed.state, role, "Approved");
    assert.equal(changed.code, 200);
    assert.deepEqual(changed.state.audit, [
      { from: "Submitted", to: "Approved", role },
    ]);
    assert.deepEqual(replayed.state, changed.state);
    assert.equal(initial.status, "Submitted");
  }
});
test("unrecognized claim statuses never change state", () => {
  const claim = createClaim();
  assert.equal(updateClaim(claim, "Manager", "Unknown").code, 400);
  assert.deepEqual(claim, createClaim());
});
test("successful transfers conserve money and never mutate their input", () => {
  const initial = createBank();
  const result = transfer(initial, { key: "one", amountMinor: 10000 });
  assert.equal(result.code, 201);
  assert.equal(result.state.source, 90000);
  assert.equal(result.state.destination, 35000);
  assert.equal(result.state.source + result.state.destination, 125000);
  assert.deepEqual(initial, createBank());
});
test("the same idempotency key moves money only once", () => {
  const request = { key: "once", amountMinor: 10000 };
  const committed = transfer(createBank(), request).state;
  let current = committed;
  for (let i = 0; i < 20; i++) {
    const replay = transfer(current, request);
    assert.equal(replay.code, 200);
    current = replay.state;
  }
  assert.deepEqual(current, committed);
  assert.equal(current.transfers.length, 1);
});
test("reusing a key for another payload is rejected without a partial update", () => {
  const committed = transfer(createBank(), {
    key: "one",
    amountMinor: 10000,
  }).state;
  const conflict = transfer(committed, { key: "one", amountMinor: 20000 });
  assert.equal(conflict.code, 409);
  assert.deepEqual(conflict.state, committed);
});
test("injected failure and insufficient funds preserve both accounts", () => {
  const initial = createBank();
  const failure = transfer(initial, {
    key: "fail",
    amountMinor: 10000,
    failBeforeCommit: true,
  });
  const overdraw = transfer(initial, { key: "big", amountMinor: 500000 });
  assert.equal(failure.code, 503);
  assert.equal(overdraw.code, 409);
  assert.deepEqual(failure.state, initial);
  assert.deepEqual(overdraw.state, initial);
  assert.equal(
    transfer(failure.state, { key: "fail", amountMinor: 10000 }).code,
    201,
  );
});
test("invalid amounts cannot create or destroy money", () => {
  for (const amountMinor of [
    0,
    -1,
    0.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    const result = transfer(createBank(), { key: "invalid", amountMinor });
    assert.equal(result.code, 422);
    assert.deepEqual(result.state, createBank());
  }
});
test("the benchmark comparison uses the selected workload and actual baseline", () => {
  assert.equal(compareGemm(1024).speedup.toFixed(2), "3.32");
  assert.equal(compareGemm(1024).libraryPercent.toFixed(1), "24.0");
  assert.equal(compareGemm(128).libraryPercent.toFixed(1), "93.0");
  assert.throws(() => compareGemm(4096), RangeError);
});
