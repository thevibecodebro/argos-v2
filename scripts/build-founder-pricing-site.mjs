import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outDir = path.join(repoRoot, "dist/founder-pricing");
const outFile = path.join(outDir, "index.html");

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Founder Pricing</title>
  </head>
  <body>
    <main>
      <h1>Founder Pricing & COGS</h1>
      <button data-mode="deck" type="button">Deck</button>
      <button data-mode="memo" type="button">Memo</button>
    </main>
  </body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(outFile, html, "utf8");
console.log(outFile);
