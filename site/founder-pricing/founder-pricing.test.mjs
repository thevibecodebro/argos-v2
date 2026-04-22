import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

test("build:founder-pricing emits a publishable HTML document", () => {
  rmSync("dist/founder-pricing", { recursive: true, force: true });

  execFileSync("node", ["scripts/build-founder-pricing-site.mjs"], {
    stdio: "pipe",
  });

  const html = readFileSync("dist/founder-pricing/index.html", "utf8");

  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /Founder Pricing & COGS/);
  assert.match(html, /data-mode="deck"/);
  assert.match(html, /data-mode="memo"/);
});
