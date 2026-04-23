function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinNatural(items = []) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function renderFactValue(fact) {
  if (!fact) {
    return "";
  }

  if (Array.isArray(fact.values)) {
    return joinNatural(fact.values.map((item) => escapeHtml(item)));
  }

  return escapeHtml(fact.value ?? "");
}

function renderFactCard(fact, extraClass = "") {
  if (!fact) {
    return "";
  }

  const key = escapeHtml(fact.id);
  const label = escapeHtml(fact.label);
  const value = renderFactValue(fact);
  const className = extraClass ? `card ${extraClass}` : "card";

  return `
    <article class="${className}" data-fact-key="${key}">
      <div class="label">${label}</div>
      <div class="fact-value">${value}</div>
    </article>
  `;
}

function renderTemplate(template, facts) {
  return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, factKey) => {
    const fact = facts[factKey];

    if (!fact) {
      return "";
    }

    return renderFactValue(fact);
  });
}

function titleCase(value) {
  return String(value)
    .split(/(\s+|[-/&])/)
    .map((token) => {
      if (!token.trim() || /[-/&]/.test(token)) {
        return token;
      }

      if (token === token.toUpperCase()) {
        return token;
      }

      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
    })
    .join("");
}

function renderDeckRail(slides) {
  return `
    <nav class="rail-card" aria-label="Deck outline">
      <div class="rail-label">Deck outline</div>
      <ol class="rail-list">
        ${slides
          .map(
            (slide, index) => `
              <li>
                <a href="#slide-${escapeHtml(slide.id)}" data-slide-target="${escapeHtml(slide.id)}">
                  <span class="rail-index">${String(index + 1).padStart(2, "0")}</span>
                  <span>${escapeHtml(titleCase(slide.title))}</span>
                </a>
              </li>
            `,
          )
          .join("")}
      </ol>
    </nav>
  `;
}

function renderMemoRail(memoSections) {
  return `
    <nav class="rail-card" aria-label="Memo contents">
      <div class="rail-label">Memo contents</div>
      <ol class="rail-list">
        ${memoSections
          .map(
            (section, index) => `
              <li>
                <a href="#memo-${escapeHtml(section.id)}" data-section-target="${escapeHtml(section.id)}">
                  <span class="rail-index">${String(index + 1).padStart(2, "0")}</span>
                  <span>${escapeHtml(titleCase(section.title))}</span>
                </a>
              </li>
            `,
          )
          .join("")}
      </ol>
    </nav>
  `;
}

function getTitleById(items, id) {
  return titleCase(items.find((item) => item.id === id)?.title ?? "");
}

function renderControllerScript() {
  return `
    <script>
      class FounderPricingController {
        constructor() {
          this.deckView = document.getElementById("deck-view");
          this.memoView = document.getElementById("memo-view");
          this.slideNodes = Array.from(document.querySelectorAll(".slide"));
          this.modeButtons = Array.from(document.querySelectorAll(".mode-button[data-mode]"));
          this.deckLinks = Array.from(document.querySelectorAll("[data-slide-target]"));
          this.memoLinks = Array.from(document.querySelectorAll("[data-section-target]"));
          this.prevButton = document.querySelector('[data-nav="prev"]');
          this.nextButton = document.querySelector('[data-nav="next"]');
          this.statusNode = document.querySelector("[data-slide-status]");
          this.touchStartX = 0;
          this.touchStartY = 0;
          this.wheelLocked = false;
          this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
          this.mode = "deck";
          this.initialHash = window.location?.hash?.replace(/^#/, "") ?? "";
          this.index = Math.max(
            0,
            this.slideNodes.findIndex((slide) => !slide.hidden),
          );

          this.bind();
          this.setMode("deck");
          this.syncFromHash(this.initialHash);
        }

        bind() {
          this.modeButtons.forEach((button) => {
            button.addEventListener("click", () => this.setMode(button.dataset.mode));
          });

          this.prevButton?.addEventListener("click", () => this.go(-1));
          this.nextButton?.addEventListener("click", () => this.go(1));

          this.deckLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
              event.preventDefault();
              this.setMode("deck");
              this.showSlideById(link.dataset.slideTarget);
            });
          });

          this.memoLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
              event.preventDefault();
              this.setMode("memo");
              this.syncHash(\`memo-\${link.dataset.sectionTarget}\`);
              this.scrollToNode(document.getElementById(\`memo-\${link.dataset.sectionTarget}\`));
            });
          });

          window.addEventListener("keydown", (event) => {
            if (this.mode !== "deck") {
              return;
            }

            if (event.key === "ArrowRight" || event.key === "PageDown") {
              event.preventDefault();
              this.go(1);
            }

            if (event.key === "ArrowLeft" || event.key === "PageUp") {
              event.preventDefault();
              this.go(-1);
            }
          });

          window.addEventListener(
            "wheel",
            (event) => {
              if (this.mode !== "deck" || this.wheelLocked || Math.abs(event.deltaY) < 28) {
                return;
              }

              this.wheelLocked = true;
              this.go(event.deltaY > 0 ? 1 : -1);
              window.setTimeout(() => {
                this.wheelLocked = false;
              }, 450);
            },
            { passive: true },
          );

          window.addEventListener(
            "touchstart",
            (event) => {
              this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
              this.touchStartY = event.changedTouches[0]?.clientY ?? 0;
            },
            { passive: true },
          );

          window.addEventListener(
            "touchend",
            (event) => {
              if (this.mode !== "deck") {
                return;
              }

              const endX = event.changedTouches[0]?.clientX ?? 0;
              const endY = event.changedTouches[0]?.clientY ?? 0;
              const deltaX = endX - this.touchStartX;
              const deltaY = endY - this.touchStartY;

              if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) {
                return;
              }

              this.go(deltaX < 0 ? 1 : -1);
            },
            { passive: true },
          );

          window.addEventListener("hashchange", () => {
            this.syncFromHash();
          });
        }

        setMode(mode) {
          const isDeck = mode === "deck";

          this.mode = isDeck ? "deck" : "memo";
          this.deckView.hidden = !isDeck;
          this.memoView.hidden = isDeck;
          this.deckView.setAttribute("aria-hidden", String(!isDeck));
          this.memoView.setAttribute("aria-hidden", String(isDeck));

          this.modeButtons.forEach((button) => {
            const isActive = button.dataset.mode === this.mode;
            button.dataset.active = String(isActive);
            button.setAttribute("aria-pressed", String(isActive));
          });

          this.update();
        }

        showSlideById(slideId) {
          const nextIndex = this.slideNodes.findIndex((slide) => slide.dataset.slideId === slideId);

          if (nextIndex < 0) {
            return;
          }

          this.index = nextIndex;
          this.update();
        }

        go(direction) {
          if (this.mode !== "deck") {
            return;
          }

          const nextIndex = Math.max(
            0,
            Math.min(this.slideNodes.length - 1, this.index + direction),
          );

          if (nextIndex === this.index) {
            return;
          }

          this.index = nextIndex;
          this.update();
        }

        scrollToNode(node) {
          if (!node || this.motionQuery.matches) {
            return;
          }

          node.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }

        syncHash(nextHash) {
          if (!window.location || !nextHash) {
            return;
          }

          const hashValue = \`#\${nextHash}\`;

          if (window.history?.replaceState) {
            window.history.replaceState(null, "", hashValue);
            return;
          }

          window.location.hash = hashValue;
        }

        syncFromHash(hash = window.location?.hash?.replace(/^#/, "") ?? "") {

          if (!hash) {
            return;
          }

          if (hash.startsWith("slide-")) {
            this.setMode("deck");
            this.showSlideById(hash.replace(/^slide-/, ""));
            return;
          }

          if (hash.startsWith("memo-")) {
            this.setMode("memo");
            this.scrollToNode(document.getElementById(hash));
          }
        }

        update() {
          this.slideNodes.forEach((slide, index) => {
            const isVisible = this.mode === "deck" && index === this.index;

            slide.hidden = !isVisible;
            slide.setAttribute("aria-hidden", String(!isVisible));
            slide.dataset.active = String(isVisible);
          });

          if (this.prevButton) {
            this.prevButton.disabled = this.mode !== "deck" || this.index === 0;
          }

          if (this.nextButton) {
            this.nextButton.disabled =
              this.mode !== "deck" || this.index === this.slideNodes.length - 1;
          }

          if (this.statusNode) {
            this.statusNode.textContent =
              this.mode === "deck"
                ? \`Slide \${this.index + 1} of \${this.slideNodes.length}\`
                : "Memo mode";
          }

          if (this.mode === "deck") {
            this.syncHash(\`slide-\${this.slideNodes[this.index]?.dataset.slideId ?? ""}\`);
            this.scrollToNode(this.slideNodes[this.index]);
          }
        }
      }

      window.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("deck-view") && document.getElementById("memo-view")) {
          window.__founderPricingController = new FounderPricingController();
        }
      });
    </script>
  `;
}

function renderFounderPricingHtml(content) {
  const { controls, counts, facts, memoSections, meta, slides, theme } = content;
  const pricingFacts = [
    facts.seatPrice,
    facts.seatMinimum,
    facts.voiceAllowance,
    facts.orgEstimate,
  ];
  const deckLabelMap = new Map(
    slides.map((slide, index) => [slide.id, `Slide ${String(index + 1).padStart(2, "0")}`]),
  );
  const vendorRateCardTitle = getTitleById(slides, "vendor-rate-card");
  const founderRecommendationsTitle = getTitleById(
    memoSections,
    "founder-recommendations",
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="verification-date" content="${escapeHtml(meta.verificationDate)}" />
    <meta name="published-path" content="${escapeHtml(meta.publishedPath)}" />
    <title>${escapeHtml(meta.title)}</title>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Source+Sans+3:wght@400;600;700&display=swap");

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
        --display-font: "${escapeHtml(theme.typography.display)}", sans-serif;
        --body-font: "${escapeHtml(theme.typography.body)}", sans-serif;
        --max-width: 1240px;
      }

      * {
        box-sizing: border-box;
      }

      html {
        background: var(--background);
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 0% 0%, rgba(116, 177, 255, 0.22), transparent 28%),
          radial-gradient(circle at 100% 0%, rgba(109, 221, 255, 0.16), transparent 22%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 28%),
          #0b0e14;
        color: var(--primary-text);
        font-family: var(--body-font);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .site-shell {
        width: min(calc(100% - 32px), var(--max-width));
        margin: 24px auto 64px;
      }

      .shell-frame {
        position: relative;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--outline) 84%, transparent);
        border-radius: 28px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 18%),
          color-mix(in srgb, var(--primary-surface) 94%, transparent);
        box-shadow:
          0 24px 64px rgba(0, 0, 0, 0.32),
          inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .shell-frame::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 15% 0%, rgba(116, 177, 255, 0.14), transparent 26%),
          radial-gradient(circle at 85% 10%, rgba(109, 221, 255, 0.1), transparent 18%);
      }

      .shell-topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px 24px;
        border-bottom: 1px solid color-mix(in srgb, var(--outline) 78%, transparent);
        background: color-mix(in srgb, var(--primary-surface) 92%, transparent);
        backdrop-filter: blur(16px);
      }

      .brand-lockup,
      .topbar-actions,
      .mode-switch {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-mark,
      .capsule,
      .mode-chip {
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
        background: color-mix(in srgb, var(--secondary-surface) 88%, transparent);
      }

      .brand-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        font-family: var(--display-font);
        font-size: 0.95rem;
        letter-spacing: 0.08em;
        color: var(--primary-accent);
      }

      .brand-copy strong,
      h1,
      h2,
      h3,
      h4 {
        font-family: var(--display-font);
      }

      .brand-copy {
        display: grid;
        gap: 2px;
      }

      .brand-copy strong {
        font-size: 0.98rem;
      }

      .brand-copy span,
      .capsule,
      .kicker,
      .rail-label,
      .label {
        color: var(--secondary-text);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .brand-copy span,
      .capsule,
      .kicker,
      .rail-label,
      .label {
        font-size: 0.74rem;
      }

      .capsule,
      .mode-chip {
        padding: 9px 14px;
      }

      .mode-switch {
        gap: 8px;
      }

      .mode-chip {
        appearance: none;
        color: var(--primary-text);
        font: inherit;
      }

      .mode-chip[data-active="true"] {
        border-color: rgba(116, 177, 255, 0.54);
        box-shadow: inset 0 0 0 1px rgba(116, 177, 255, 0.18);
      }

      .mode-button {
        cursor: pointer;
      }

      .shell-content {
        position: relative;
        padding: 28px 24px 32px;
      }

      .hero-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
        margin-bottom: 18px;
      }

      .hero-card,
      .summary-card,
      .rail-card,
      .view-card,
      .slide-card,
      .memo-card,
      .card {
        position: relative;
        border: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
        border-radius: 22px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 20%),
          color-mix(in srgb, var(--elevated-surface) 92%, transparent);
      }

      .hero-card,
      .summary-card,
      .rail-card,
      .view-card,
      .memo-card {
        padding: 22px;
      }

      .hero-card h1 {
        margin: 0 0 14px;
        font-size: clamp(2.25rem, 4vw, 3.8rem);
        line-height: 0.95;
      }

      .hero-card p,
      .summary-card p,
      .memo-card p,
      .slide-card p {
        margin: 0;
        color: var(--secondary-text);
        line-height: 1.6;
      }

      .hero-card .hero-copy {
        max-width: 56ch;
      }

      .hero-facts,
      .fact-grid,
      .slide-facts,
      .memo-facts {
        display: grid;
        gap: 12px;
      }

      .hero-facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 22px;
      }

      .summary-card {
        display: grid;
        gap: 16px;
      }

      .summary-card .fact-grid {
        grid-template-columns: 1fr;
      }

      .view-grid {
        display: grid;
        gap: 18px;
      }

      .view-card {
        display: grid;
        gap: 18px;
      }

      .view-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
      }

      .view-header h2 {
        margin: 0;
        font-size: clamp(1.45rem, 2vw, 2rem);
      }

      .view-header p {
        max-width: 60ch;
        margin: 10px 0 0;
        color: var(--secondary-text);
      }

      .view-layout {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.7fr);
      }

      .rail-card {
        align-self: start;
        position: sticky;
        top: 92px;
      }

      .rail-list {
        margin: 14px 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 10px;
      }

      .rail-list li a {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid transparent;
        color: var(--secondary-text);
        transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
      }

      .rail-list li a:hover {
        color: var(--primary-text);
        border-color: color-mix(in srgb, var(--outline) 70%, transparent);
        background: color-mix(in srgb, var(--secondary-surface) 84%, transparent);
      }

      .rail-index {
        min-width: 2ch;
        color: var(--primary-accent);
        font-family: var(--display-font);
      }

      .slide-stack,
      .memo-stack {
        display: grid;
        gap: 16px;
      }

      .slide-card {
        padding: 20px;
      }

      .card-header {
        display: grid;
        gap: 8px;
        margin-bottom: 14px;
      }

      .slide-card h3,
      .memo-card h3 {
        margin: 0;
        font-size: clamp(1.18rem, 2vw, 1.5rem);
      }

      .slide-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .deck-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid color-mix(in srgb, var(--outline) 76%, transparent);
        background: color-mix(in srgb, var(--secondary-surface) 86%, transparent);
      }

      .control-button {
        appearance: none;
        border: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
        border-radius: 999px;
        padding: 10px 14px;
        background: color-mix(in srgb, var(--primary-surface) 88%, transparent);
        color: var(--primary-text);
        font: inherit;
        cursor: pointer;
      }

      .control-button[disabled] {
        opacity: 0.48;
        cursor: not-allowed;
      }

      .slide-status {
        margin: 0;
        color: var(--secondary-text);
        text-align: center;
      }

      .deck-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 11px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--outline) 76%, transparent);
        background: color-mix(in srgb, var(--secondary-surface) 86%, transparent);
        color: var(--secondary-text);
        font-size: 0.78rem;
      }

      .fact-grid,
      .slide-facts,
      .memo-facts {
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }

      .card {
        padding: 14px 15px;
      }

      .fact-value {
        color: var(--primary-text);
        line-height: 1.5;
      }

      .memo-card {
        scroll-margin-top: 96px;
      }

      .memo-card + .memo-card {
        margin-top: 16px;
      }

      .memo-card p + p {
        margin-top: 12px;
      }

      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }

        .rail-list li a {
          transition: none;
        }
      }

      @media (max-width: 980px) {
        .hero-grid,
        .view-layout {
          grid-template-columns: 1fr;
        }

        .rail-card {
          position: static;
        }
      }

      @media (max-width: 720px) {
        .site-shell {
          width: min(calc(100% - 20px), var(--max-width));
          margin: 12px auto 40px;
        }

        .shell-topbar,
        .shell-content {
          padding-left: 16px;
          padding-right: 16px;
        }

        .shell-topbar,
        .view-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .deck-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-facts {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="site-shell">
      <div class="shell-frame">
        <header class="shell-topbar" data-content-slides="${counts.slides}" data-content-memo-sections="${counts.memoSections}" data-content-facts="${counts.facts}">
          <div class="brand-lockup">
            <div class="brand-mark">A</div>
            <div class="brand-copy">
              <strong>Argos Founder Pricing</strong>
              <span>Founder OS view of pricing and unit economics</span>
            </div>
          </div>
          <div class="topbar-actions">
            <div class="capsule">${escapeHtml(meta.verificationDate)}</div>
            <div class="mode-switch" aria-label="Mode switch">
              <button class="mode-chip mode-button" data-mode="deck" data-active="true" type="button" aria-controls="deck-view" aria-pressed="true">Deck</button>
              <button class="mode-chip mode-button" data-mode="memo" data-active="false" type="button" aria-controls="memo-view" aria-pressed="false">Memo</button>
            </div>
          </div>
        </header>

        <div class="shell-content">
          <section class="hero-grid" aria-label="Founder pricing overview">
            <article class="hero-card">
              <div class="kicker">Founder pricing deck</div>
              <h1>${escapeHtml(meta.title)}</h1>
              <p class="hero-copy">
                The seat price is simple. The underwriting variable is live voice usage, and the HTML artifact needs to explain that in the same design language as the product.
              </p>
              <div class="hero-facts">
                ${renderFactCard(facts.verificationDate)}
                ${renderFactCard(facts.publishedPath)}
              </div>
            </article>

            <aside class="summary-card">
              <div>
                <div class="kicker">Founder controls</div>
                <p>${escapeHtml(
                  `Public packaging: ${controls.pricing.seatPrice}, ${controls.pricing.seatMinimum}, and ${controls.pricing.voiceAllowance}.`,
                )}</p>
              </div>
              <div class="fact-grid">
                ${pricingFacts.map((fact) => renderFactCard(fact)).join("")}
              </div>
            </aside>
          </section>

          <div class="view-grid">
            <section id="deck-view" class="view-card" data-mode="deck" aria-labelledby="deck-title" data-slide-count="${counts.slides}">
              <div class="view-header">
                <div>
                  <div class="kicker">Deck mode</div>
                  <h2 id="deck-title">Presentation narrative</h2>
                  <p>Slide-first framing for fundraising, pricing review, and founder discussion. This view is staged like the Argos shell rather than a detached microsite.</p>
                </div>
                <div class="slide-meta">
                  <span class="deck-pill">${counts.slides} slides</span>
                  <span class="deck-pill">${escapeHtml(vendorRateCardTitle)}</span>
                </div>
              </div>
              <div class="deck-controls">
                <button class="control-button" type="button" data-nav="prev">Previous</button>
                <p class="slide-status" data-slide-status aria-live="polite">Slide 1 of ${counts.slides}</p>
                <button class="control-button" type="button" data-nav="next">Next</button>
              </div>
              <div class="view-layout">
                ${renderDeckRail(slides)}
                <div class="slide-stack" data-slide-ids="${slides.map((slide) => slide.id).join(" ")}">
                  ${slides
                    .map(
                      (slide, index) => `
                        <article id="slide-${escapeHtml(slide.id)}" class="slide-card slide" data-slide-id="${escapeHtml(slide.id)}" data-fact-ids="${escapeHtml((slide.factIds ?? []).join(" "))}"${index === 0 ? "" : " hidden"} aria-hidden="${index === 0 ? "false" : "true"}" data-active="${index === 0 ? "true" : "false"}">
                          <div class="card-header">
                            <div class="label">${escapeHtml(deckLabelMap.get(slide.id) ?? "Slide")}</div>
                            <h3>${escapeHtml(titleCase(slide.title))}</h3>
                          </div>
                          <p>${escapeHtml(slide.summary)}</p>
                          ${(slide.factIds ?? []).length
                            ? `<div class="slide-facts">${slide.factIds
                                .map((factId) => renderFactCard(facts[factId]))
                                .join("")}</div>`
                            : ""}
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              </div>
            </section>

            <section id="memo-view" class="view-card" data-mode="memo" aria-labelledby="memo-title" data-memo-count="${counts.memoSections}" hidden aria-hidden="true">
              <div class="view-header">
                <div>
                  <div class="kicker">Memo mode</div>
                  <h2 id="memo-title">Founder documentation</h2>
                  <p>Longer-form diligence notes with the same underlying content model, vendor references, and packaging assumptions as the presentation layer.</p>
                </div>
                <div class="slide-meta">
                  <span class="deck-pill">${counts.memoSections} sections</span>
                  <span class="deck-pill">${escapeHtml(founderRecommendationsTitle)}</span>
                </div>
              </div>
              <div class="view-layout">
                ${renderMemoRail(memoSections)}
                <div class="memo-stack">
                  ${memoSections
                    .map(
                      (section) => `
                        <article id="memo-${escapeHtml(section.id)}" class="memo-card" data-section-id="${escapeHtml(section.id)}" data-fact-ids="${escapeHtml((section.factIds ?? []).join(" "))}">
                          <div class="card-header">
                            <div class="label">Section</div>
                            <h3>${escapeHtml(titleCase(section.title))}</h3>
                          </div>
                          ${(section.factIds ?? []).length
                            ? `<div class="memo-facts">${section.factIds
                                .map((factId) => renderFactCard(facts[factId]))
                                .join("")}</div>`
                            : ""}
                          ${(section.paragraphTemplates ?? [])
                            .map((paragraph) => `<p>${renderTemplate(paragraph, facts)}</p>`)
                            .join("")}
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
    ${renderControllerScript()}
  </body>
</html>`;
}

module.exports = {
  renderFounderPricingHtml,
};
module.exports.default = renderFounderPricingHtml;
