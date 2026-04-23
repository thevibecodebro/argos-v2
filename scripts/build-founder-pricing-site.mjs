import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import founderPricingContent from "../site/founder-pricing/content.js";
import renderModule from "../site/founder-pricing/render.js";

const { renderFounderPricingHtml } = renderModule;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outDir = path.join(repoRoot, "dist/founder-pricing");
const outFile = path.join(outDir, "index.html");
const html = renderFounderPricingHtml(founderPricingContent);

await mkdir(outDir, { recursive: true });
await writeFile(outFile, html, "utf8");
console.log(outFile);
