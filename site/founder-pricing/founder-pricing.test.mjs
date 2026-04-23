import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("build:founder-pricing emits a publishable HTML document", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(testDir, "..", "..");
  const outDir = path.join(repoRoot, "dist/founder-pricing");
  const outFile = path.join(outDir, "index.html");
  const requiredStrings = [
    "$50 / seat / month",
    "3-seat minimum",
    "120 pooled live voice minutes per paid seat per month",
    "~$58 / org / month",
    "OpenAI",
    "Vercel",
    "Supabase",
    "Fly.io",
  ];

  rmSync(outDir, { recursive: true, force: true });

  execFileSync("npm", ["run", "build:founder-pricing"], {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const html = readFileSync(outFile, "utf8");

  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /Founder Pricing &amp; COGS/);
  assert.match(html, /data-mode="deck"/);
  assert.match(html, /data-mode="memo"/);

  for (const requiredString of requiredStrings) {
    assert.ok(html.includes(requiredString), `expected HTML to include "${requiredString}"`);
  }
});
