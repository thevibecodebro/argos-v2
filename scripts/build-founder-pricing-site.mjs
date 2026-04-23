import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import founderPricingContent from "../site/founder-pricing/content.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outDir = path.join(repoRoot, "dist/founder-pricing");
const outFile = path.join(outDir, "index.html");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHighlights(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

const { meta, theme, controls, slides, memoSections } = founderPricingContent;

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="verification-date" content="${escapeHtml(meta.verificationDate)}" />
    <meta name="published-path" content="${escapeHtml(meta.publishedPath)}" />
    <title>${escapeHtml(meta.title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --background: ${theme.colors.background};
        --primary-surface: ${theme.colors.primarySurface};
        --secondary-surface: ${theme.colors.secondarySurface};
        --elevated-surface: ${theme.colors.elevatedSurface};
        --elevated-surface-alt: ${theme.colors.elevatedSurfaceAlt};
        --primary-text: ${theme.colors.primaryText};
        --secondary-text: ${theme.colors.secondaryText};
        --primary-accent: ${theme.colors.primaryAccent};
        --tertiary-accent: ${theme.colors.tertiaryAccent};
        --outline: ${theme.colors.outline};
        --display-font: ${escapeHtml(theme.typography.display)};
        --body-font: ${escapeHtml(theme.typography.body)};
      }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(116, 177, 255, 0.15), transparent 30%),
          radial-gradient(circle at top right, rgba(109, 221, 255, 0.1), transparent 25%),
          var(--background);
        color: var(--primary-text);
        font-family: var(--body-font), sans-serif;
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 32px 20px 64px;
      }
      header, section {
        border: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
        background: color-mix(in srgb, var(--primary-surface) 92%, transparent);
        border-radius: 20px;
        padding: 24px;
        margin-bottom: 18px;
      }
      h1, h2, h3 {
        font-family: var(--display-font), sans-serif;
        margin: 0 0 12px;
      }
      p, li, dt, dd {
        color: var(--secondary-text);
        line-height: 1.55;
      }
      .mode-switch {
        display: flex;
        gap: 12px;
        margin: 16px 0 0;
      }
      button {
        appearance: none;
        border: 1px solid var(--outline);
        background: var(--secondary-surface);
        color: var(--primary-text);
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
      }
      .controls {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      }
      .card {
        border: 1px solid var(--outline);
        background: var(--elevated-surface);
        border-radius: 16px;
        padding: 16px;
      }
      .cards {
        display: grid;
        gap: 14px;
      }
      .meta-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid var(--outline);
        padding: 4px 10px;
        margin: 0 8px 8px 0;
        color: var(--primary-text);
      }
      .label {
        color: var(--secondary-text);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.78rem;
        margin-bottom: 8px;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      .deck-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="label">Founder pricing deck</div>
        <h1>${escapeHtml(meta.title)}</h1>
        <div class="meta-grid">
          <div class="card">
            <div class="label">Verification date</div>
            <div>${escapeHtml(meta.verificationDate)}</div>
          </div>
          <div class="card">
            <div class="label">Published path</div>
            <div>${escapeHtml(meta.publishedPath)}</div>
          </div>
        </div>
        <div class="mode-switch" aria-label="Mode switch">
          <button data-mode="deck" type="button">Deck</button>
          <button data-mode="memo" type="button">Memo</button>
        </div>
      </header>

      <section data-mode="deck" aria-labelledby="deck-title">
        <h2 id="deck-title">Deck</h2>
        <div class="controls">
          <div class="card">
            <div class="label">Seat pricing</div>
            <div>${escapeHtml(controls.pricing.seatPrice)}</div>
          </div>
          <div class="card">
            <div class="label">Minimum</div>
            <div>${escapeHtml(controls.pricing.seatMinimum)}</div>
          </div>
          <div class="card">
            <div class="label">Voice allowance</div>
            <div>${escapeHtml(controls.pricing.voiceAllowance)}</div>
          </div>
          <div class="card">
            <div class="label">Org estimate</div>
            <div>${escapeHtml(controls.pricing.orgEstimate)}</div>
          </div>
        </div>
        <div class="deck-grid" style="margin-top: 16px;">
          ${slides
            .map(
              (slide) => `
                <article class="card" data-slide-id="${escapeHtml(slide.id)}">
                  <div class="label">Slide</div>
                  <h3>${escapeHtml(slide.title)}</h3>
                  <p>${escapeHtml(slide.summary)}</p>
                  ${slide.highlights?.length ? `<ul>${renderHighlights(slide.highlights)}</ul>` : ""}
                </article>
              `,
            )
            .join("")}
        </div>
      </section>

      <section data-mode="memo" aria-labelledby="memo-title">
        <h2 id="memo-title">Memo</h2>
        <div class="cards">
          ${memoSections
            .map(
              (section) => `
                <article class="card" data-section-id="${escapeHtml(section.id)}">
                  <div class="label">Section</div>
                  <h3>${escapeHtml(section.title)}</h3>
                  ${(section.paragraphs ?? []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    </main>
  </body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(outFile, html, "utf8");
console.log(outFile);
