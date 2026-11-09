import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const caseStudies = ["skyquery", "gridflex", "neobank", "aegis", "cuda", "sourced"];

test("primary CV links open the existing PDF without forcing a download", async () => {
  const home = await readFile(new URL("../studio/index.html", import.meta.url), "utf8");
  const homeLink = home.match(/<a class="cv"([^>]*)>CV<\/a>/);
  assert.ok(homeLink, "Night Floor should expose its primary CV link");
  assert.match(homeLink[1], /href="\/assets\/Hajar-Mrifag-CV\.pdf"/);
  assert.doesNotMatch(homeLink[1], /\bdownload\b/);

  for (const name of caseStudies) {
    const page = await readFile(new URL(`../work/${name}.html`, import.meta.url), "utf8");
    const navLink = page.match(/<a class="nav-cv"([^>]*)>CV<\/a>/);
    assert.ok(navLink, `${name} should expose its primary CV link`);
    assert.match(navLink[1], /href="\.\.\/assets\/Hajar-Mrifag-CV\.pdf"/);
    assert.doesNotMatch(navLink[1], /\bdownload\b/);
  }
});

test("explicit CV download actions remain downloads of the same PDF", async () => {
  const page = await readFile(new URL("../work/skyquery.html", import.meta.url), "utf8");
  const explicitDownload = page.match(
    /<a class="text-link" href="([^"]+)" download\s*>\s*Download my CV ↓<\/a\s*>/,
  );

  assert.ok(explicitDownload, "SkyQuery should retain the explicit CV download action");
  assert.equal(explicitDownload[1], "../assets/Hajar-Mrifag-CV.pdf");
});
