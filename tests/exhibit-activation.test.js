import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projects = [
  ["skyquery", "SkyQuery"],
  ["gridflex", "GridFlex"],
  ["neobank", "Neobank"],
  ["aegis", "Aegis Claims"],
  ["cuda", "CUDA Kernels"],
  ["sourced", "Sourced"],
];

test("every filmstrip project has a native, named exhibit action with a case-study fallback", async () => {
  const html = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");
  const cards = [...html.matchAll(/<article\b[^>]*\bdata-station="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];

  assert.equal(cards.length, projects.length);
  for (const [index, [id, name]] of projects.entries()) {
    assert.equal(cards[index][1], id);
    const body = cards[index][2];
    const action = body.match(/<a href="([^"]+)" data-open-exhibit aria-label="([^"]+)">Open exhibit<\/a>/);
    assert.ok(action, `${id} should expose an Open exhibit link`);
    assert.equal(action[1], `/work/${id}.html`);
    assert.equal(action[2], `Open ${name} interactive exhibit`);
    assert.match(body, new RegExp(`<a href="\\/work\\/${id}\\.html">Case study<\\/a>`));
  }
});

test("exhibit activation selects first, queues while loading, and falls back on scene failure", async () => {
  const filmStrip = await readFile(
    new URL("../studio/src/nav/filmStrip.ts", import.meta.url),
    "utf8",
  );
  const main = await readFile(new URL("../studio/src/main.ts", import.meta.url), "utf8");

  assert.match(filmStrip, /apply\(next, \{ scroll: false, user: true \}\);[\s\S]*event\.preventDefault\(\);/);
  assert.match(filmStrip, /new CustomEvent<ExhibitOpenDetail>\("nightfloor:open-exhibit"/);
  assert.match(filmStrip, /caseStudy: opener\.href/);

  assert.match(main, /type SceneStatus = "loading" \| "ready" \| "unavailable"/);
  assert.match(main, /if \(sceneStatus === "loading"\) pendingOpen = detail/);
  assert.match(main, /if \(sceneStatus === "unavailable"\) \{[\s\S]*openCaseStudy\(detail\)/);
  assert.match(main, /if \(pendingOpen\) openCaseStudy\(pendingOpen\)/);
  assert.match(main, /window\.location\.assign\(detail\.caseStudy\)/);
  assert.match(main, /sceneStatus = "ready";[\s\S]*pendingOpen = null/);
});

test("existing keyboard and camera activation paths remain intact", async () => {
  const filmStrip = await readFile(
    new URL("../studio/src/nav/filmStrip.ts", import.meta.url),
    "utf8",
  );
  const scene = await readFile(
    new URL("../studio/src/scene/mountNightFloorScene.ts", import.meta.url),
    "utf8",
  );

  assert.match(filmStrip, /FRAME_KEY\.test\(event\.key\)/);
  assert.match(filmStrip, /apply\(Number\(event\.key\) - 1, \{ focus: true, scroll: true, user: true \}\)/);
  assert.match(scene, /root\.addEventListener\("nightfloor:station", onStation\)/);
  assert.match(scene, /if \(event\.key === "Enter"\)/);
  assert.match(scene, /goToStation\(index\)/);
});
