import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const exhibits = {
  sourced: {
    title: "Sourced",
    caseStudy: "/work/sourced.html",
    evidence: "Source-linked opportunity research keeps uncertainty explicit; this desk uses fictional data.",
    cue: "Inspect a listing line, then change the eligibility check.",
  },
  aegis: {
    title: "Aegis Claims",
    caseStudy: "/work/aegis.html",
    evidence: "This simulated desk reflects API-enforced role authorization, signature-aware document checks and claim-status history.",
    cue: "Choose a role and requested status, then stamp the claim.",
  },
  gridflex: {
    title: "GridFlex",
    caseStudy: "/work/gridflex.html",
    evidence: "Recorded, not live: 31.9× on one bounded 60-day engine computation—not end-to-end speed.",
    cue: "Scrub measured demand or compare recorded benchmark horizons.",
  },
  neobank: {
    title: "Neobank",
    caseStudy: "/work/neobank.html",
    evidence: "This simulated ledger demonstrates PostgreSQL transactions, idempotency and ordered row locks, backed by concurrent-spending tests.",
    cue: "Post £25, retry the key, or use a fresh key for an overdraw.",
  },
  skyquery: {
    title: "SkyQuery",
    caseStudy: "/work/skyquery.html",
    evidence: "My HDFS, Hive and PySpark work supported a two-person team project analysing 15 million flight records; this desk is not a live service.",
    cue: "Trace the data pipeline or inspect the separate query prototype.",
  },
  cuda: {
    title: "CUDA Kernels",
    caseStudy: "/work/cuda.html",
    evidence: "Recorded NVIDIA T4 GEMM measurements compare custom kernels with cuBLAS; cuBLAS remains faster.",
    cue: "Switch matrix size to inspect stored throughput measurements.",
  },
};

const compact = (value) => value.replace(/\s+/g, " ").trim();

test("every exhibit exposes the shared orientation, case-study, and return controls", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");
  const starts = [...html.matchAll(/data-exhibit-panel="([^"]+)"/g)].map((match) => ({
    id: match[1],
    index: match.index,
  }));

  assert.equal(starts.length, 6);
  for (const [position, start] of starts.entries()) {
    const expected = exhibits[start.id];
    assert.ok(expected, `unexpected exhibit panel ${start.id}`);
    const end = starts[position + 1]?.index ?? html.indexOf('<nav class="work"');
    const panel = compact(html.slice(start.index, end));

    assert.match(panel, /class="exhibit-toolbar"/);
    assert.match(panel, new RegExp(`data-exhibit-heading tabindex="-1">${expected.title}<`));
    assert.match(panel, new RegExp(`href="${expected.caseStudy.replaceAll("/", "\\/")}">Case study<`));
    assert.match(panel, /<button type="button" data-exhibit-back>Back to projects<\/button>/);
    assert.match(panel, /data-exhibit-scroll-cue>More below ↓<\/span>/);
    assert.ok(panel.includes(expected.evidence), `${start.id} evidence changed`);
    assert.ok(panel.includes(expected.cue), `${start.id} interaction cue changed`);
  }
});

test("exhibit lifecycle owns scroll, focus, and the shared leave choreography", async () => {
  const presence = await readFile(
    new URL("../studio/src/exhibit/presence.ts", import.meta.url),
    "utf8",
  );
  const scene = await readFile(
    new URL("../studio/src/scene/mountNightFloorScene.ts", import.meta.url),
    "utf8",
  );

  assert.match(presence, /panel\.scrollTop = 0/);
  assert.match(presence, /heading\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(presence, /panel\.inert = !next/);
  assert.match(presence, /panel\.setAttribute\("aria-hidden", next \? "false" : "true"\)/);
  assert.match(presence, /new CustomEvent\("nightfloor:leave-station"\)/);
  assert.match(presence, /panel\.scrollHeight - panel\.scrollTop - panel\.clientHeight/);

  assert.match(scene, /const leaveStation = \(\): boolean =>/);
  assert.match(scene, /event\.key === "Escape" && leaveStation\(\)/);
  assert.match(scene, /root\.addEventListener\("nightfloor:leave-station", onLeaveStation\)/);
  assert.match(scene, /play\(\[\{ approach: 0, seconds: LEAVE_SECONDS/);
  assert.match(scene, /focusSelectedFrame\(\)/);
});
