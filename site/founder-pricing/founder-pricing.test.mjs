import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import founderPricingContent from "./content.js";

test("build:founder-pricing emits a publishable HTML document", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(testDir, "..", "..");
  const outDir = path.join(repoRoot, "dist/founder-pricing");
  const outFile = path.join(outDir, "index.html");
  const { counts, facts, meta, memoSections, slides } = founderPricingContent;

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
  assert.match(html, new RegExp(`data-content-slides="${counts.slides}"`));
  assert.match(html, new RegExp(`data-content-memo-sections="${counts.memoSections}"`));
  assert.match(html, new RegExp(`data-content-facts="${counts.facts}"`));

  assert.equal((html.match(/data-slide-id="/g) ?? []).length, slides.length);
  assert.equal((html.match(/data-section-id="/g) ?? []).length, memoSections.length);

  for (const slide of slides) {
    assert.match(html, new RegExp(`data-slide-id="${slide.id}"`));
    assert.match(html, new RegExp(`data-fact-ids="${slide.factIds.join(" ")}"`));
  }

  for (const section of memoSections) {
    assert.match(html, new RegExp(`data-section-id="${section.id}"`));
    assert.match(html, new RegExp(`data-fact-ids="${section.factIds.join(" ")}"`));
  }

  for (const fact of Object.values(facts)) {
    assert.match(html, new RegExp(`data-fact-key="${fact.id}"`));
  }

  assert.match(html, new RegExp(escapeRegExp(meta.verificationDate)));
  assert.match(html, new RegExp(escapeRegExp(meta.publishedPath)));
  assert.match(html, /data-fact-key="seatPrice"/);
  assert.match(html, /data-fact-key="seatMinimum"/);
  assert.match(html, /data-fact-key="voiceAllowance"/);
  assert.match(html, /data-fact-key="orgEstimate"/);
  assert.match(html, /data-fact-key="vendorStack"/);
  assert.match(html, /data-fact-key="verificationDate"/);
  assert.match(html, /data-fact-key="publishedPath"/);
  assert.match(html, /\$50 \/ seat \/ month/);
  assert.match(html, /3-seat minimum/);
  assert.match(html, /120 pooled live voice minutes per paid seat per month/);
  assert.match(html, /~\$58 \/ org \/ month/);
  assert.match(html, /OpenAI/);
  assert.match(html, /Vercel/);
  assert.match(html, /Supabase/);
  assert.match(html, /Fly\.io/);
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
