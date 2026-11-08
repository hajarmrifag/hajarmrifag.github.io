import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const cases = ["skyquery", "gridflex", "neobank", "aegis", "cuda", "sourced"];

test("Night Floor exposes real work and contact fragment targets", () => {
  const home = readFileSync(join(root, "studio/index.html"), "utf8");
  assert.match(home, /<nav class="contact" id="contact"[^>]*tabindex="-1"/);
  assert.match(home, /<nav class="work" id="work"[^>]*tabindex="-1"/);
});

test("every case study returns to Night Floor without obsolete anchors", () => {
  for (const name of cases) {
    const page = readFileSync(join(root, `work/${name}.html`), "utf8");
    assert.doesNotMatch(page, /\.\.\/#(?:path|practice)(?:[\"#])/);
    assert.match(page, /href="\.\.\/#work"[^>]*>← Night Floor projects<\/a>/);
    assert.match(page, /href="\.\.\/#contact"[^>]*>Contact<\/a>/);
    assert.match(page, /href="\.\.\/"[^>]*>Night Floor<\/a>/);
  }
});
