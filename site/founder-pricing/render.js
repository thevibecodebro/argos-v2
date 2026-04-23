const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleCase(value) {
  return String(value ?? "")
    .split(/(\s+|[-/&:])/)
    .map((token) => {
      if (!token.trim() || /[-/&:]/.test(token)) {
        return token;
      }

      if (token === token.toUpperCase()) {
        return token;
      }

      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
    })
    .join("");
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function formatTableValue(value, format) {
  if (value == null) {
    return "—";
  }

  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "number":
      return formatNumber(value);
    default:
      return String(value);
  }
}

function renderList(items = [], className = "bullet-list") {
  if (!items.length) {
    return "";
  }

  return `
    <ul class="${className}">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderMetricCards(metrics = []) {
  return `
    <div class="metric-grid">
      ${metrics
        .map(
          (metric) => `
            <article class="metric-card">
              <div class="eyebrow">${escapeHtml(metric.label)}</div>
              <strong>${escapeHtml(metric.value)}</strong>
              <p>${escapeHtml(metric.detail)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderPolicyGrid(cards = []) {
  return `
    <div class="policy-grid">
      ${cards
        .map(
          (card) => `
            <article class="policy-card">
              <div class="eyebrow">${escapeHtml(card.label)}</div>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRateStack(items = []) {
  return `
    <div class="rate-stack">
      ${items
        .map(
          (item) => `
            <article class="rate-card">
              <div class="rate-row">
                <div>
                  <div class="eyebrow">${escapeHtml(item.label)}</div>
                  <strong>${escapeHtml(item.value)}</strong>
                </div>
                <p>${escapeHtml(item.detail)}</p>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAssumptionList(items = []) {
  return `
    <div class="assumption-list">
      ${items
        .map(
          (item) => `
            <article class="assumption-row">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.value)}</span>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderComparisonTable(table) {
  if (!table?.columns?.length || !table?.rows?.length) {
    return "";
  }

  return `
    <div class="table-shell">
      <table class="comparison-table">
        <thead>
          <tr>
            ${table.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              (row) => `
                <tr>
                  ${table.columns
                    .map(
                      (column) =>
                        `<td>${escapeHtml(
                          formatTableValue(row[column.key], column.format),
                        )}</td>`,
                    )
                    .join("")}
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAppendixSection(section) {
  return `
    <article class="appendix-section">
      <div class="eyebrow">${escapeHtml(section.label)}</div>
      ${section.items?.length ? renderList(section.items, "appendix-list") : ""}
      ${section.table ? renderComparisonTable(section.table) : ""}
    </article>
  `;
}

function inferSlideKind(entry, group = "main") {
  if (entry.kind) {
    return entry.kind;
  }

  if (group === "appendix") {
    if (entry.id === "appendix-voice-sensitivity") {
      return "sensitivity-table";
    }

    return "appendix-table";
  }

  return (
    {
      cover: "hero-metrics",
      "pricing-architecture": "policy-grid",
      "included-usage": "rate-stack",
      "vendor-cost-stack": "assumption-list",
      "solo-unit-economics": "comparison-table",
      "team-unit-economics": "comparison-table",
      "annual-vs-monthly": "comparison-table",
      "voice-expansion-packs": "rate-stack",
      "founder-close": "thesis",
    }[entry.id] ?? "thesis"
  );
}

function buildSlidePayload(entry, kind, group, model) {
  if (group === "appendix") {
    return {
      sections: entry.sections ?? [],
      table: entry.sections?.find((section) => section.table)?.table ?? null,
      bullets: entry.bullets ?? [],
    };
  }

  switch (kind) {
    case "hero-metrics":
      return {
        metrics: [
          {
            label: "Solo subscription",
            value: formatCurrency(model.plans.solo.priceMonthly),
            detail: `${model.plans.solo.includedVoiceMinutes} included voice minutes per month`,
          },
          {
            label: "Team floor",
            value: formatCurrency(model.derived.team.minimumMonthly),
            detail: `${model.plans.team.seatMinimum} seats minimum at ${formatCurrency(model.plans.team.pricePerSeatMonthly)}/seat`,
          },
          {
            label: "Annual discount",
            value: "10%",
            detail: "Applies to both plans without adding another packaging tier",
          },
          {
            label: "Voice expansion",
            value: formatCurrency(model.packs.team[0].price),
            detail: `${model.packs.team[0].minutes}-minute team growth pack`,
          },
        ],
        bullets: entry.bullets ?? [],
      };
    case "policy-grid":
      return {
        cards: [
          {
            label: "Solo",
            title: `${formatCurrency(model.plans.solo.priceMonthly)} / month`,
            body: `${model.plans.solo.includedVoiceMinutes} included voice minutes before ${formatCurrency(model.plans.solo.overageRate)}/minute overage pricing.`,
          },
          {
            label: "Team",
            title: `${formatCurrency(model.plans.team.pricePerSeatMonthly)} / seat / month`,
            body: `${model.plans.team.seatMinimum}-seat minimum with ${model.plans.team.includedVoiceMinutesPerSeat} included voice minutes per seat.`,
          },
          {
            label: "Annual",
            title: "Prepaid incentive",
            body: "Annual billing gives a 10% discount while keeping the public menu simple.",
          },
        ],
        bullets: entry.bullets ?? [],
      };
    case "rate-stack":
      if (entry.id === "voice-expansion-packs") {
        return {
          items: [
            {
              label: "Solo pack",
              value: `${model.packs.solo[0].minutes} min / ${formatCurrency(model.packs.solo[0].price)}`,
              detail: `Valid for ${model.packs.solo[0].expiresInDays} days.`,
            },
            {
              label: "Team growth pack",
              value: `${model.packs.team[0].minutes} min / ${formatCurrency(model.packs.team[0].price)}`,
              detail: `Valid for ${model.packs.team[0].expiresInDays} days.`,
            },
            {
              label: "Team scale pack",
              value: `${model.packs.team[1].minutes} min / ${formatCurrency(model.packs.team[1].price)}`,
              detail: `Valid for ${model.packs.team[1].expiresInDays} days.`,
            },
          ],
        };
      }

      return {
        items: [
          {
            label: "Solo allowance",
            value: `${model.plans.solo.includedVoiceMinutes} min`,
            detail: `Internal overage starts at ${formatCurrency(model.plans.solo.overageRate)}/minute.`,
          },
          {
            label: "Team allowance",
            value: `${model.derived.team.minimumIncludedVoiceMinutes} min`,
            detail: "Three-seat minimum defines the baseline usage envelope.",
          },
          {
            label: "Monetization lever",
            value: "Expansion packs",
            detail: "Usage spikes monetize cleanly without forcing plan migration.",
          },
        ],
      };
    case "assumption-list":
      return {
        items: model.vendors.map((vendor) => ({
          label: vendor.name,
          value: vendor.monthlyCost
            ? `${formatCurrency(vendor.monthlyCost)} / month`
            : vendor.percentRate
              ? `${vendor.percentRate * 100}%${vendor.fixedFee ? ` + ${formatCurrency(vendor.fixedFee)}` : ""}`
              : vendor.sourceLabel,
        })),
      };
    case "comparison-table":
      if (entry.id === "solo-unit-economics") {
        return { table: model.derived.marginTable };
      }

      if (entry.id === "team-unit-economics") {
        return { table: model.derived.orgMarginTable };
      }

      return { table: model.derived.seatEconomicsTable };
    case "thesis":
    default:
      return {
        bullets: entry.bullets ?? [],
      };
  }
}

function normalizeEntry(entry, group, index, counts, model) {
  const kind = inferSlideKind(entry, group);
  return {
    ...entry,
    group,
    kind,
    title: titleCase(entry.title),
    orderLabel:
      group === "appendix"
        ? `Appendix ${String(index + 1).padStart(2, "0")}`
        : `Slide ${String(index + 1).padStart(2, "0")}`,
    countLabel:
      group === "appendix"
        ? `${index + 1} / ${counts.appendixSlides}`
        : `${index + 1} / ${counts.mainSlides}`,
    ordinal: index,
    payload: buildSlidePayload(entry, kind, group, model),
  };
}

function renderRail(items, label) {
  return `
    <nav class="rail-card" aria-label="${escapeHtml(label)}">
      <div class="rail-title">${escapeHtml(label)}</div>
      <ol class="rail-list">
        ${items
          .map(
            (item) => `
              <li>
                <a href="#slide-${escapeHtml(item.id)}" data-slide-target="${escapeHtml(item.id)}">
                  <span class="rail-index">${escapeHtml(item.orderLabel.replace(/^[^0-9]+/, ""))}</span>
                  <span class="rail-copy">
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.summary)}</small>
                  </span>
                </a>
              </li>
            `,
          )
          .join("")}
      </ol>
    </nav>
  `;
}

function renderSlideBody(slide) {
  switch (slide.kind) {
    case "hero-metrics":
      return `
        ${renderMetricCards(slide.payload.metrics)}
        ${renderList(slide.payload.bullets)}
      `;
    case "policy-grid":
      return `
        ${renderPolicyGrid(slide.payload.cards)}
        ${renderList(slide.payload.bullets)}
      `;
    case "rate-stack":
      return renderRateStack(slide.payload.items);
    case "assumption-list":
      return renderAssumptionList(slide.payload.items);
    case "comparison-table":
      return renderComparisonTable(slide.payload.table);
    case "sensitivity-table":
      return `
        <div class="appendix-grid">
          ${slide.payload.sections.map((section) => renderAppendixSection(section)).join("")}
        </div>
      `;
    case "appendix-table":
      return `
        <div class="appendix-grid">
          ${slide.payload.sections.map((section) => renderAppendixSection(section)).join("")}
        </div>
      `;
    case "thesis":
    default:
      return `
        <div class="thesis-panel">
          <p class="thesis-summary">${escapeHtml(slide.summary)}</p>
          ${renderList(slide.payload.bullets)}
        </div>
      `;
  }
}

function renderSlide(slide, active = false) {
  return `
    <article
      id="slide-${escapeHtml(slide.id)}"
      class="deck-slide kind-${escapeHtml(slide.kind)}"
      data-slide-id="${escapeHtml(slide.id)}"
      data-slide-group="${escapeHtml(slide.group)}"
      data-slide-kind="${escapeHtml(slide.kind)}"
      data-slide-ordinal="${slide.ordinal}"
      ${active ? "" : "hidden"}
      aria-hidden="${active ? "false" : "true"}"
      data-active="${active ? "true" : "false"}"
    >
      <div class="slide-shell">
        <header class="slide-header">
          <div>
            <div class="eyebrow">${escapeHtml(slide.group === "appendix" ? "Appendix" : "Main deck")}</div>
            <div class="slide-order">${escapeHtml(slide.orderLabel)}</div>
          </div>
          <div class="slide-counter">${escapeHtml(slide.countLabel)}</div>
        </header>
        <div class="slide-copy">
          <h1>${escapeHtml(slide.title)}</h1>
          <p>${escapeHtml(slide.summary)}</p>
        </div>
        <div class="slide-body">
          ${renderSlideBody(slide)}
        </div>
      </div>
    </article>
  `;
}

const CONTROLLER_SOURCE = `
class FounderPricingController {
  constructor() {
    this.slideNodes = Array.from(document.querySelectorAll(".deck-slide"));
    this.slideLinks = Array.from(document.querySelectorAll("[data-slide-target]"));
    this.prevButton = document.querySelector('[data-nav="prev"]');
    this.nextButton = document.querySelector('[data-nav="next"]');
    this.statusNode = document.querySelector("[data-slide-status]");
    this.groupNode = document.querySelector("[data-active-group]");
    this.titleNode = document.querySelector("[data-active-title]");
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.wheelLocked = false;
    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.initialHash = window.location?.hash?.replace(/^#/, "") ?? "";
    this.index = Math.max(0, this.slideNodes.findIndex((slide) => !slide.hidden));

    this.mainSlideCount = this.slideNodes.filter(
      (slide) => slide.dataset.slideGroup === "main",
    ).length;
    this.appendixSlideCount = this.slideNodes.filter(
      (slide) => slide.dataset.slideGroup === "appendix",
    ).length;

    this.bind();
    this.syncFromHash(this.initialHash);
    this.update();
  }

  bind() {
    this.prevButton?.addEventListener("click", () => this.go(-1));
    this.nextButton?.addEventListener("click", () => this.go(1));

    this.slideLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.showSlideById(link.dataset.slideTarget);
      });
    });

    window.addEventListener("keydown", (event) => {
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
        if (this.wheelLocked || Math.abs(event.deltaY) < 28) {
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

  showSlideById(slideId) {
    const nextIndex = this.slideNodes.findIndex((slide) => slide.dataset.slideId === slideId);

    if (nextIndex < 0) {
      return;
    }

    this.index = nextIndex;
    this.update();
  }

  go(direction) {
    const nextIndex = Math.max(0, Math.min(this.slideNodes.length - 1, this.index + direction));

    if (nextIndex === this.index) {
      return;
    }

    this.index = nextIndex;
    this.update();
  }

  syncHash(nextHash) {
    if (!window.location || !nextHash) {
      return;
    }

    const hashValue = '#' + nextHash;
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
      this.showSlideById(hash.replace(/^slide-/, ""));
    }
  }

  update() {
    const activeSlide = this.slideNodes[this.index];

    this.slideNodes.forEach((slide, index) => {
      const isActive = index === this.index;
      slide.hidden = !isActive;
      slide.dataset.active = String(isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    this.slideLinks.forEach((link) => {
      const isActive = link.dataset.slideTarget === activeSlide?.dataset.slideId;
      link.dataset.active = String(isActive);
      link.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (this.prevButton) {
      this.prevButton.disabled = this.index === 0;
    }

    if (this.nextButton) {
      this.nextButton.disabled = this.index === this.slideNodes.length - 1;
    }

    if (activeSlide && this.statusNode) {
      const isAppendix = activeSlide.dataset.slideGroup === "appendix";
      const ordinal = Number(activeSlide.dataset.slideOrdinal) + 1;
      this.statusNode.textContent = isAppendix
        ? 'Appendix ' + ordinal + ' of ' + this.appendixSlideCount
        : 'Slide ' + ordinal + ' of ' + this.mainSlideCount;
    }

    if (activeSlide && this.groupNode) {
      this.groupNode.textContent =
        activeSlide.dataset.slideGroup === "appendix" ? "Appendix" : "Main deck";
    }

    if (activeSlide && this.titleNode) {
      this.titleNode.textContent = activeSlide.querySelector("h1")?.textContent ?? "";
    }

    if (activeSlide) {
      this.syncHash('slide-' + activeSlide.dataset.slideId);

      if (!this.motionQuery.matches) {
        activeSlide.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".deck-slide")) {
    window.__founderPricingController = new FounderPricingController();
  }
});
`;

function renderControllerScript() {
  return `
    <script>
      ${CONTROLLER_SOURCE}
    </script>
  `;
}

function renderFounderPricingHtml(content) {
  const { appendix = [], counts, meta, model, slides = [], theme } = content;
  const mainSlides = slides.map((slide, index) =>
    normalizeEntry(slide, "main", index, counts, model),
  );
  const appendixSlides = appendix.map((slide, index) =>
    normalizeEntry(slide, "appendix", index, counts, model),
  );
  const allSlides = [...mainSlides, ...appendixSlides];

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
        --shell-width: 1440px;
        --slide-height: min(calc(100vh - 250px), 760px);
      }

      * {
        box-sizing: border-box;
      }

      html {
        background: var(--background);
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 0% 0%, rgba(116, 177, 255, 0.18), transparent 22%),
          radial-gradient(circle at 100% 0%, rgba(109, 221, 255, 0.14), transparent 18%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 28%),
          var(--background);
        color: var(--primary-text);
        font-family: var(--body-font);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .deck-shell {
        width: min(calc(100% - 36px), var(--shell-width));
        margin: 20px auto;
        padding: 22px;
        border: 1px solid color-mix(in srgb, var(--outline) 86%, transparent);
        border-radius: 30px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 18%),
          color-mix(in srgb, var(--primary-surface) 94%, transparent);
        box-shadow:
          0 32px 82px rgba(0, 0, 0, 0.34),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .deck-header,
      .status-footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
      }

      .deck-header {
        padding-bottom: 18px;
        border-bottom: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
      }

      .brand-lockup {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .brand-mark {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(116, 177, 255, 0.22), rgba(109, 221, 255, 0.1));
        border: 1px solid rgba(116, 177, 255, 0.34);
        font-family: var(--display-font);
        letter-spacing: 0.08em;
      }

      .brand-copy {
        display: grid;
        gap: 4px;
      }

      .brand-copy strong,
      .slide-copy h1,
      .policy-card h3 {
        font-family: var(--display-font);
      }

      .brand-copy span,
      .meta-pill,
      .eyebrow,
      .rail-title,
      .slide-order {
        color: var(--secondary-text);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-size: 0.72rem;
      }

      .header-meta,
      .control-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
      }

      .meta-pill,
      .control-button {
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--outline) 82%, transparent);
        background: color-mix(in srgb, var(--secondary-surface) 88%, transparent);
      }

      .meta-pill {
        padding: 10px 14px;
      }

      .deck-layout {
        display: grid;
        grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.8fr) minmax(220px, 0.8fr);
        gap: 18px;
        padding: 20px 0;
        align-items: stretch;
      }

      .rail-card,
      .slide-shell,
      .metric-card,
      .policy-card,
      .rate-card,
      .appendix-section {
        border: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
        border-radius: 24px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 20%),
          color-mix(in srgb, var(--elevated-surface) 94%, transparent);
      }

      .rail-card {
        padding: 18px;
      }

      .rail-list {
        list-style: none;
        margin: 14px 0 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .rail-list a {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        padding: 12px;
        border-radius: 16px;
        border: 1px solid transparent;
        color: var(--secondary-text);
        transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
      }

      .rail-list a:hover,
      .rail-list a[data-active="true"] {
        color: var(--primary-text);
        border-color: rgba(116, 177, 255, 0.34);
        background: color-mix(in srgb, var(--secondary-surface) 84%, transparent);
      }

      .rail-index {
        min-width: 2ch;
        color: var(--primary-accent);
        font-family: var(--display-font);
      }

      .rail-copy {
        display: grid;
        gap: 4px;
      }

      .rail-copy small {
        color: var(--secondary-text);
        line-height: 1.35;
      }

      .deck-track {
        position: relative;
      }

      .deck-slide {
        min-height: var(--slide-height);
        max-height: var(--slide-height);
      }

      .slide-shell {
        height: 100%;
        padding: 24px;
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        gap: 18px;
        overflow: hidden;
      }

      .slide-header,
      .status-summary,
      .assumption-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .slide-counter {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(116, 177, 255, 0.26);
        color: var(--primary-accent);
        font-size: 0.82rem;
      }

      .slide-copy {
        display: grid;
        gap: 10px;
        max-width: 72ch;
      }

      .slide-copy h1 {
        margin: 0;
        font-size: clamp(2rem, 3.6vw, 3.7rem);
        line-height: 0.96;
      }

      .slide-copy p,
      .metric-card p,
      .policy-card p,
      .rate-card p,
      .thesis-summary,
      .comparison-table td,
      .comparison-table th,
      .appendix-list li,
      .bullet-list li {
        margin: 0;
        color: var(--secondary-text);
        line-height: 1.45;
      }

      .slide-body {
        min-height: 0;
        overflow: hidden;
      }

      .metric-grid,
      .policy-grid,
      .appendix-grid {
        display: grid;
        gap: 16px;
      }

      .metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .policy-grid,
      .appendix-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .metric-card,
      .policy-card,
      .rate-card,
      .appendix-section {
        padding: 18px;
      }

      .metric-card strong,
      .rate-card strong {
        display: block;
        margin: 6px 0 10px;
        font-size: clamp(1.3rem, 2.1vw, 2rem);
      }

      .policy-card h3 {
        margin: 8px 0;
        font-size: 1.15rem;
      }

      .rate-stack,
      .assumption-list {
        display: grid;
        gap: 12px;
      }

      .rate-row {
        display: grid;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        gap: 18px;
        align-items: center;
      }

      .assumption-row {
        padding: 14px 0;
        border-bottom: 1px solid color-mix(in srgb, var(--outline) 72%, transparent);
      }

      .assumption-row:last-child {
        border-bottom: 0;
      }

      .assumption-row span {
        text-align: right;
        color: var(--secondary-text);
      }

      .bullet-list,
      .appendix-list {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 10px;
      }

      .table-shell {
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid color-mix(in srgb, var(--outline) 78%, transparent);
        background: color-mix(in srgb, var(--elevated-surface-alt) 94%, transparent);
      }

      .comparison-table {
        width: 100%;
        border-collapse: collapse;
      }

      .comparison-table th,
      .comparison-table td {
        padding: 13px 15px;
        text-align: left;
        border-bottom: 1px solid color-mix(in srgb, var(--outline) 72%, transparent);
      }

      .comparison-table tr:last-child td {
        border-bottom: 0;
      }

      .comparison-table th {
        color: var(--primary-text);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .thesis-panel {
        display: grid;
        gap: 18px;
        align-content: start;
      }

      .thesis-summary {
        font-size: 1.08rem;
        max-width: 60ch;
      }

      .status-footer {
        padding-top: 18px;
        border-top: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
      }

      .status-summary {
        padding: 12px 16px;
        border-radius: 18px;
        border: 1px solid color-mix(in srgb, var(--outline) 80%, transparent);
        background: color-mix(in srgb, var(--secondary-surface) 86%, transparent);
      }

      .status-summary strong {
        font-size: 1rem;
      }

      .control-button {
        appearance: none;
        padding: 11px 16px;
        color: var(--primary-text);
        font: inherit;
        cursor: pointer;
      }

      .control-button[disabled] {
        opacity: 0.44;
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        .rail-list a {
          transition: none;
        }
      }

      @media (max-width: 1180px) {
        .deck-layout {
          grid-template-columns: 1fr;
        }

        .deck-shell {
          padding: 18px;
        }

        .slide-shell {
          padding: 20px;
          gap: 16px;
        }

        .slide-copy h1 {
          font-size: clamp(1.8rem, 3vw, 3rem);
        }

        .slide-copy {
          gap: 8px;
        }

        .metric-card,
        .policy-card,
        .rate-card,
        .appendix-section {
          padding: 14px;
        }

        .metric-grid,
        .policy-grid,
        .appendix-grid {
          gap: 12px;
        }

        .comparison-table th,
        .comparison-table td {
          padding: 10px 12px;
        }

        .policy-grid,
        .appendix-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .deck-shell {
          width: min(calc(100% - 20px), var(--shell-width));
          padding: 16px;
        }

        .deck-header,
        .status-footer {
          grid-template-columns: 1fr;
        }

        .header-meta,
        .control-row {
          justify-content: flex-start;
        }

        .metric-grid,
        .policy-grid,
        .appendix-grid,
        .rate-row {
          grid-template-columns: 1fr;
        }

        .slide-header,
        .status-summary,
        .assumption-row {
          align-items: flex-start;
          flex-direction: column;
        }

        .slide-shell {
          padding: 18px;
        }
      }
    </style>
  </head>
  <body>
    <main
      class="deck-shell"
      data-content-main-slides="${counts.mainSlides}"
      data-content-appendix-slides="${counts.appendixSlides}"
      data-content-total-slides="${allSlides.length}"
    >
      <header class="deck-header">
        <div class="brand-lockup">
          <div class="brand-mark">A</div>
          <div class="brand-copy">
            <strong>Argos Founder Pricing</strong>
            <span>Continuous investor deck for pricing and unit economics</span>
          </div>
        </div>
        <div class="header-meta">
          <div class="meta-pill">${escapeHtml(meta.verificationDate)}</div>
          <div class="meta-pill">${escapeHtml(meta.publishedPath)}</div>
        </div>
      </header>

      <div class="deck-layout">
        ${renderRail(mainSlides, "Slide rail")}
        <section id="deck-track" class="deck-track" aria-live="polite">
          ${allSlides.map((slide, index) => renderSlide(slide, index === 0)).join("")}
        </section>
        ${renderRail(appendixSlides, "Appendix rail")}
      </div>

      <footer class="status-footer">
        <div class="status-summary">
          <div>
            <div class="eyebrow" data-active-group>Main deck</div>
            <strong data-active-title>${escapeHtml(allSlides[0]?.title ?? meta.title)}</strong>
          </div>
          <span data-slide-status>Slide 1 of ${counts.mainSlides}</span>
        </div>
        <div class="control-row">
          <button class="control-button" type="button" data-nav="prev" disabled>Previous</button>
          <button class="control-button" type="button" data-nav="next">Next</button>
        </div>
      </footer>
    </main>
    ${renderControllerScript()}
  </body>
</html>`;
}

module.exports = {
  renderFounderPricingHtml,
  __test: {
    CONTROLLER_SOURCE,
    inferSlideKind,
  },
};
module.exports.default = renderFounderPricingHtml;
