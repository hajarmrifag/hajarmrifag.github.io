import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expected = ["skyquery", "gridflex", "neobank", "aegis", "cuda", "sourced"];
const evidence = [
  "Backend/data work within a two-person internship team: 15M flight records · HDFS · Hive · PySpark.",
  "Recorded 31.9× in a bounded 60-day engine benchmark—not end-to-end speed.",
  "PostgreSQL transactions · idempotent retries · ordered row locks · concurrency tests. Analytics data: synthetic.",
  "ASP.NET Core · server-enforced roles · signature-aware uploads · claim-status history.",
  "Recorded NVIDIA T4 GEMM measurements against cuBLAS; custom kernels remain below the baseline.",
  "Led a five-person hackathon team; source-linked research keeps uncertainty explicit. Demo data is fictional.",
];

test("Night Floor presents the approved recruiter-first station order", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article\b([^>]*\bdata-station="([^"]+)"[^>]*)>([\s\S]*?)<\/article>/g)];

  assert.deepEqual(cards.map(([, , id]) => id), expected);
  assert.deepEqual(
    cards.map(([, , , body]) => body.match(/<p class="frame-no">(\d{2})<\/p>/)?.[1]),
    ["01", "02", "03", "04", "05", "06"],
  );
  assert.deepEqual(
    cards.map(([, , , body]) =>
      body.match(/<p class="evidence">([\s\S]*?)<\/p>/)?.[1].replace(/\s+/g, " ").trim(),
    ),
    evidence,
  );
  for (const [, , , body] of cards) assert.doesNotMatch(body, /class="summary"/);
  assert.match(cards[0][1], /class="is-selected"/);
  assert.match(cards[0][1], /aria-current="true"/);
  assert.match(cards[0][1], /tabindex="0"/);
  for (const [, attributes] of cards.slice(1)) {
    assert.doesNotMatch(attributes, /is-selected|aria-current="true"|tabindex="0"/);
  }
});

test("scene ordering and close poses derive from the same project identities", async () => {
  const stations = await readFile(new URL("../studio/src/content/stations.ts", import.meta.url), "utf8");
  const layout = await readFile(new URL("../studio/src/scene/layout.ts", import.meta.url), "utf8");
  const orderBlock = stations.match(/STATION_ORDER = \[([\s\S]*?)\] as const/);

  assert.ok(orderBlock, "STATION_ORDER should remain explicit and reviewable");
  assert.deepEqual([...orderBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]), expected);
  for (const id of expected) assert.match(layout, new RegExp(`\\b${id}: \\{`));
  assert.match(layout, /STATION_ORDER\.map\(\(id\) => CLOSE_POSE_BY_STATION\[id\]\)/);
});
