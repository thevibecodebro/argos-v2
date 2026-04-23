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
            <article class="metric-card panel">
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
            <article class="policy-card panel">
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
            <article class="rate-card panel">
              <div class="rate-head">
                <div class="eyebrow">${escapeHtml(item.label)}</div>
                <strong>${escapeHtml(item.value)}</strong>
              </div>
              <p>${escapeHtml(item.detail)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAssumptionList(items = []) {
  return `
    <div class="assumption-grid">
      ${items
        .map(
          (item) => `
            <article class="assumption-card panel">
              <div class="eyebrow">${escapeHtml(item.label)}</div>
              <strong>${escapeHtml(item.value)}</strong>
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
    <div class="table-shell panel">
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
    <article class="appendix-section panel">
      <div class="eyebrow">${escapeHtml(section.label)}</div>
      ${section.items?.length ? renderList(section.items, "appendix-list") : ""}
      ${section.table ? renderComparisonTable(section.table) : ""}
    </article>
  `;
}

const MAIN_SLIDE_DEFINITIONS = {
  cover: { kind: "hero-metrics", payloadKey: "coverMetrics" },
  "pricing-architecture": { kind: "policy-grid", payloadKey: "pricingArchitecturePolicies" },
  "included-usage": { kind: "rate-stack", payloadKey: "includedUsageRates" },
  "vendor-cost-stack": { kind: "assumption-list", payloadKey: "vendorAssumptions" },
  "solo-unit-economics": { kind: "comparison-table", payloadKey: "seatEconomicsTable" },
  "team-unit-economics": { kind: "comparison-table", payloadKey: "orgMarginTable" },
  "annual-vs-monthly": { kind: "comparison-table", payloadKey: "annualBillingTable" },
  "voice-expansion-packs": { kind: "comparison-table", payloadKey: "voiceSensitivityTable" },
  "founder-close": { kind: "thesis", payloadKey: "thesisBullets" },
};

const APPENDIX_SLIDE_DEFINITIONS = {
  "appendix-rate-card": { kind: "appendix-table", payloadKey: "sections" },
  "appendix-formulas": { kind: "appendix-table", payloadKey: "sections" },
  "appendix-seat-economics": { kind: "appendix-table", payloadKey: "sections" },
  "appendix-margin-bridge": { kind: "appendix-table", payloadKey: "sections" },
  "appendix-voice-sensitivity": { kind: "appendix-table", payloadKey: "sections" },
};

function resolveSlideDefinition(slideId, group = "main") {
  const definitionMap =
    group === "appendix" ? APPENDIX_SLIDE_DEFINITIONS : MAIN_SLIDE_DEFINITIONS;
  const definition = definitionMap[slideId];

  if (!definition) {
    throw new Error(`Missing slide definition for ${group} slide: ${slideId}`);
  }

  return definition;
}

function inferSlideKind(entry, group = "main") {
  if (entry.kind) {
    return entry.kind;
  }

  return resolveSlideDefinition(entry.id, group).kind;
}

const PAYLOAD_BUILDERS = {
  coverMetrics(entry, model) {
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
          value: formatCurrency(model.derived.packCatalog.team500.price),
          detail: `${model.derived.packCatalog.team500.minutes}-minute team growth pack`,
        },
      ],
      bullets: entry.bullets ?? [],
    };
  },
  pricingArchitecturePolicies(entry, model) {
    return {
      cards: [
        {
          label: "Solo",
          title: `${formatCurrency(model.plans.solo.priceMonthly)} / month`,
          body: `${model.plans.solo.includedVoiceMinutes} included live voice minutes, then expansion through the ${model.derived.packCatalog.solo250.minutes}-minute prepaid pack.`,
        },
        {
          label: "Team",
          title: `${formatCurrency(model.plans.team.pricePerSeatMonthly)} / seat / month`,
          body: `${model.plans.team.seatMinimum}-seat minimum with ${model.plans.team.includedVoiceMinutesPerSeat} pooled live voice minutes per seat and prepaid team packs for overage.`,
        },
        {
          label: "Annual",
          title: "10% prepaid discount",
          body: "Annual billing improves cash collection and fee efficiency without changing the public menu.",
        },
      ],
      bullets: entry.bullets ?? [],
    };
  },
  includedUsageRates(entry, model) {
    return {
      items: [
        {
          label: "Live voice model",
          value: `${formatCurrency(model.assumptions.usage.liveVoicePlanningCostPerMinute)} / min`,
          detail:
            "Internal planning conversion from OpenAI realtime token pricing, not an official vendor minute quote.",
        },
        {
          label: "Scored call model",
          value: `$${model.assumptions.usage.scoredCallCostPerCall.toFixed(3)} / call`,
          detail: `${model.assumptions.usage.averageScoredCallMinutes} transcription minutes plus a small GPT-5 mini buffer. Solo models ${model.assumptions.usage.soloScoredCallsMonthly} calls monthly; Team minimum ${model.assumptions.usage.teamMinimumScoredCallsMonthly}; Team 10-seat ${model.assumptions.usage.teamTenSeatScoredCallsMonthly}.`,
        },
        {
          label: "Shared software floor",
          value: `${formatCurrency(model.assumptions.softwareFloor.baseRecurringMonthly)} / mo`,
          detail: `Vercel, Supabase, Fly, HighLevel, and Resend spread across ${model.assumptions.softwareFloor.activePayingOrgsBaseCase} active paying orgs in the base case.`,
        },
      ],
      bullets: entry.bullets ?? [],
    };
  },
  voiceExpansionPacks(_entry, model) {
    return {
      items: [
        {
          label: "Solo pack",
          value: `${formatNumber(model.derived.packCatalog.solo250.minutes)} min / ${formatCurrency(model.derived.packCatalog.solo250.price)}`,
          detail: `Public overage pack valid for ${model.derived.packCatalog.solo250.expiresInDays} days.`,
        },
        {
          label: "Team growth pack",
          value: `${formatNumber(model.derived.packCatalog.team500.minutes)} min / ${formatCurrency(model.derived.packCatalog.team500.price)}`,
          detail: `Public overage pack valid for ${model.derived.packCatalog.team500.expiresInDays} days.`,
        },
        {
          label: "Team scale pack",
          value: `${formatNumber(model.derived.packCatalog.team2000.minutes)} min / ${formatCurrency(model.derived.packCatalog.team2000.price)}`,
          detail: `Public overage pack valid for ${model.derived.packCatalog.team2000.expiresInDays} days.`,
        },
      ],
    };
  },
  vendorAssumptions(entry, model) {
    return {
      items: model.vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.slideText ?? vendor.rateText ?? vendor.sourceLabel,
      })),
      bullets: entry.bullets ?? [],
    };
  },
  orgMarginTable(entry, model) {
    return {
      table: model.derived.orgMarginTable,
      bullets: entry.bullets ?? [],
    };
  },
  annualBillingTable(entry, model) {
    return {
      table: model.derived.annualBillingTable,
      bullets: entry.bullets ?? [],
    };
  },
  voiceSensitivityTable(entry, model) {
    return {
      table: model.derived.voiceSensitivityTable,
      bullets: entry.bullets ?? [],
    };
  },
  seatEconomicsTable(entry, model) {
    return {
      table: model.derived.seatEconomicsTable,
      bullets: entry.bullets ?? [],
    };
  },
  thesisBullets(entry) {
    return {
      bullets: entry.bullets ?? [],
    };
  },
  sections(entry) {
    return {
      sections: entry.sections ?? [],
      bullets: entry.bullets ?? [],
    };
  },
};

function buildSlidePayload(entry, group, model) {
  const definition = resolveSlideDefinition(entry.id, group);
  const payloadBuilder = PAYLOAD_BUILDERS[definition.payloadKey];

  if (!payloadBuilder) {
    throw new Error(
      `Missing payload builder for ${group} slide: ${entry.id} (${definition.payloadKey})`,
    );
  }

  return payloadBuilder(entry, model);
}

function buildMarkerLabel(group, index) {
  if (group === "appendix") {
    return `A${String(index + 1).padStart(2, "0")}`;
  }

  return String(index + 1).padStart(2, "0");
}

function shouldTopAlign(slide) {
  return (
    slide.group === "appendix" ||
    slide.kind === "comparison-table" ||
    slide.kind === "assumption-list" ||
    slide.kind === "rate-stack"
  );
}

function normalizeEntry(entry, group, index, counts, model) {
  const definition = resolveSlideDefinition(entry.id, group);
  const kind = entry.kind ?? definition.kind;

  return {
    ...entry,
    group,
    kind,
    title: entry.title,
    orderLabel:
      group === "appendix"
        ? `Appendix ${String(index + 1).padStart(2, "0")}`
        : `Slide ${String(index + 1).padStart(2, "0")}`,
    countLabel:
      group === "appendix"
        ? `${index + 1} / ${counts.appendixSlides}`
        : `${index + 1} / ${counts.mainSlides}`,
    markerLabel: buildMarkerLabel(group, index),
    ordinal: index,
    payload: buildSlidePayload(entry, group, model),
  };
}

function renderSlideBody(slide) {
  switch (slide.kind) {
    case "hero-metrics":
      return `
        <div class="hero-layout">
          <div class="hero-notes panel">
            ${renderList(slide.payload.bullets)}
          </div>
          ${renderMetricCards(slide.payload.metrics)}
        </div>
      `;
    case "policy-grid":
      return `
        ${renderPolicyGrid(slide.payload.cards)}
        ${renderList(slide.payload.bullets)}
      `;
    case "rate-stack":
      return `
        ${renderRateStack(slide.payload.items)}
        ${renderList(slide.payload.bullets)}
      `;
    case "assumption-list":
      return `
        ${renderAssumptionList(slide.payload.items)}
        ${renderList(slide.payload.bullets)}
      `;
    case "comparison-table":
      return `
        ${renderComparisonTable(slide.payload.table)}
        ${renderList(slide.payload.bullets)}
      `;
    case "appendix-table":
    default:
      return `
        <div class="appendix-grid">
          ${slide.payload.sections.map((section) => renderAppendixSection(section)).join("")}
        </div>
      `;
    case "thesis":
      return `
        <div class="thesis-panel panel">
          <p class="thesis-summary">${escapeHtml(slide.summary)}</p>
          ${renderList(slide.payload.bullets)}
        </div>
      `;
  }
}

function renderSlide(slide, active = false) {
  return `
    <section
      id="slide-${escapeHtml(slide.id)}"
      class="slide kind-${escapeHtml(slide.kind)}"
      data-slide-id="${escapeHtml(slide.id)}"
      data-slide-group="${escapeHtml(slide.group)}"
      data-slide-kind="${escapeHtml(slide.kind)}"
      data-slide-ordinal="${slide.ordinal}"
      data-active="${active ? "true" : "false"}"
      aria-current="${active ? "true" : "false"}"
    >
      <div class="slide-mark" aria-hidden="true">${escapeHtml(slide.markerLabel)}</div>
      <div class="slide-content ${shouldTopAlign(slide) ? "top" : ""}">
        <div class="section-kicker">
          ${escapeHtml(slide.group === "appendix" ? "Appendix" : "Main deck")} · ${escapeHtml(slide.orderLabel)}
        </div>
        <div class="slide-copy">
          <h1>${escapeHtml(slide.title)}</h1>
          <p class="lede">${escapeHtml(slide.summary)}</p>
        </div>
        <div class="slide-body">
          ${renderSlideBody(slide)}
        </div>
      </div>
    </section>
  `;
}

const CONTROLLER_SOURCE = `
class FounderPricingController {
  constructor() {
    this.slideNodes = Array.from(document.querySelectorAll(".slide"));
    this.statusNode = document.querySelector("[data-slide-status]");
    this.groupNode = document.querySelector("[data-active-group]");
    this.titleNode = document.querySelector("[data-active-title]");
    this.progressNode = document.querySelector("[data-progress-bar]");
    this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.initialHash = window.location?.hash?.replace(/^#/, "") ?? "";
    this.index = 0;
    this.mainSlideCount = this.slideNodes.filter((slide) => slide.dataset.slideGroup === "main").length;
    this.appendixSlideCount = this.slideNodes.filter((slide) => slide.dataset.slideGroup === "appendix").length;

    this.bind();
    this.observe();
    this.syncFromHash(this.initialHash);
    this.update();
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === "ArrowDown") {
        event.preventDefault();
        this.go(1);
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "ArrowUp") {
        event.preventDefault();
        this.go(-1);
      }
    });

    window.addEventListener("hashchange", () => {
      this.syncFromHash();
    });
  }

  observe() {
    if (!window.IntersectionObserver) {
      return;
    }

    this.observer = new window.IntersectionObserver(
      (entries) => {
        const nextEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!nextEntry) {
          return;
        }

        const nextIndex = this.slideNodes.indexOf(nextEntry.target);
        if (nextIndex === -1 || nextIndex === this.index) {
          return;
        }

        this.index = nextIndex;
        this.update({ syncHash: true, scroll: false });
      },
      {
        threshold: [0.35, 0.55, 0.75],
      },
    );

    this.slideNodes.forEach((slide) => this.observer.observe(slide));
  }

  showSlideById(slideId, options = {}) {
    const nextIndex = this.slideNodes.findIndex((slide) => slide.dataset.slideId === slideId);
    if (nextIndex < 0) {
      return;
    }

    this.index = nextIndex;
    this.update({
      syncHash: true,
      scroll: options.scroll !== false,
    });
  }

  go(direction) {
    const nextIndex = Math.max(0, Math.min(this.slideNodes.length - 1, this.index + direction));
    if (nextIndex === this.index) {
      return;
    }

    this.index = nextIndex;
    this.update({ syncHash: true, scroll: true });
  }

  syncHash(nextHash) {
    if (!window.location || !nextHash) {
      return;
    }

    const hashValue = "#" + nextHash;
    if (window.history?.replaceState) {
      window.history.replaceState(null, "", hashValue);
      return;
    }

    window.location.hash = hashValue;
  }

  syncFromHash(hash = window.location?.hash?.replace(/^#/, "") ?? "") {
    if (!hash || !hash.startsWith("slide-")) {
      return;
    }

    this.showSlideById(hash.replace(/^slide-/, ""), {
      scroll: true,
    });
  }

  update(options = {}) {
    const activeSlide = this.slideNodes[this.index];
    if (!activeSlide) {
      return;
    }

    this.slideNodes.forEach((slide, index) => {
      const isActive = index === this.index;
      slide.dataset.active = String(isActive);
      slide.setAttribute("aria-current", String(isActive));
    });

    const isAppendix = activeSlide.dataset.slideGroup === "appendix";
    const ordinal = Number(activeSlide.dataset.slideOrdinal) + 1;
    const total = isAppendix ? this.appendixSlideCount : this.mainSlideCount;
    const overallProgress = ((this.index + 1) / this.slideNodes.length) * 100;

    if (this.statusNode) {
      this.statusNode.textContent = (isAppendix ? "Appendix " : "Slide ") + ordinal + " of " + total;
    }

    if (this.groupNode) {
      this.groupNode.textContent = isAppendix ? "Appendix" : "Main deck";
    }

    if (this.titleNode) {
      this.titleNode.textContent = activeSlide.querySelector("h1")?.textContent ?? "";
    }

    if (this.progressNode) {
      this.progressNode.style.width = overallProgress + "%";
    }

    if (options.syncHash) {
      this.syncHash("slide-" + activeSlide.dataset.slideId);
    }

    if (options.scroll) {
      activeSlide.scrollIntoView({
        behavior: this.motionQuery.matches ? "auto" : "smooth",
        block: "start",
      });
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".slide")) {
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
        --bg: ${theme.colors.background};
        --bg-2: ${theme.colors.primarySurface};
        --panel: rgba(255, 255, 255, 0.08);
        --panel-strong: rgba(255, 255, 255, 0.16);
        --text: ${theme.colors.primaryText};
        --muted: color-mix(in srgb, ${theme.colors.secondaryText} 90%, white 8%);
        --soft: color-mix(in srgb, ${theme.colors.secondaryText} 80%, transparent);
        --line: rgba(116, 177, 255, 0.18);
        --accent: ${theme.colors.primaryAccent};
        --accent-2: ${theme.colors.tertiaryAccent};
        --warning: #ffd37a;
        --success: #97e28b;
        --shadow: 0 32px 80px rgba(0, 0, 0, 0.36);
        --display-font: "${escapeHtml(theme.typography.display)}", sans-serif;
        --body-font: "${escapeHtml(theme.typography.body)}", sans-serif;
        --title-size: clamp(2rem, 5.4vw, 4.8rem);
        --h2-size: clamp(1.25rem, 3.4vw, 2.35rem);
        --h3-size: clamp(1.02rem, 2.15vw, 1.5rem);
        --body-size: clamp(0.82rem, 1.28vw, 1.05rem);
        --small-size: clamp(0.68rem, 1vw, 0.9rem);
        --tiny-size: clamp(0.62rem, 0.88vw, 0.78rem);
        --slide-padding: clamp(1.15rem, 4vw, 4rem);
        --content-gap: clamp(0.75rem, 1.9vw, 1.75rem);
        --element-gap: clamp(0.5rem, 1.15vw, 0.95rem);
      }

      html,
      body {
        height: 100%;
        overflow-x: hidden;
      }

      html {
        scroll-snap-type: y mandatory;
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        font-family: var(--body-font);
        background:
          radial-gradient(circle at 18% 12%, rgba(116, 177, 255, 0.16), transparent 24%),
          radial-gradient(circle at 84% 18%, rgba(109, 221, 255, 0.12), transparent 20%),
          linear-gradient(180deg, color-mix(in srgb, var(--bg-2) 90%, black 10%) 0%, #06080d 100%);
        color: var(--text);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        background-size: 34px 34px;
        mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.75), transparent 88%);
        pointer-events: none;
        opacity: 0.42;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      h1,
      h2,
      h3,
      p,
      ul,
      ol {
        margin: 0;
      }

      .deck-brand {
        position: fixed;
        top: clamp(0.6rem, 1.8vw, 1rem);
        left: clamp(0.7rem, 2vw, 1.4rem);
        z-index: 50;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.72rem 0.92rem;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: rgba(12, 14, 20, 0.78);
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
      }

      .brand-mark {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(116, 177, 255, 0.22), rgba(109, 221, 255, 0.08));
        border: 1px solid rgba(116, 177, 255, 0.32);
        color: var(--text);
        font-family: var(--display-font);
        letter-spacing: 0.08em;
      }

      .brand-copy {
        display: grid;
        gap: 0.14rem;
      }

      .brand-copy strong,
      h1,
      h2 {
        font-family: var(--display-font);
      }

      .brand-copy span,
      .section-kicker,
      .slide-counter {
        font-size: var(--tiny-size);
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .deck-status {
        position: fixed;
        top: clamp(0.6rem, 1.8vw, 1rem);
        right: clamp(0.7rem, 2vw, 1.4rem);
        z-index: 50;
        width: min(300px, calc(100vw - 1.4rem));
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        padding: 0.78rem 0.9rem;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: rgba(12, 14, 20, 0.78);
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
      }

      .progress-track {
        height: 6px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }

      .progress-bar {
        width: 0;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent), var(--accent-2));
        transition: width 280ms ease;
      }

      .status-row {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        align-items: center;
      }

      .status-title {
        font-size: var(--small-size);
        color: var(--text);
        line-height: 1.25;
      }

      .deck {
        position: relative;
      }

      .slide {
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .slide::after {
        content: "";
        position: absolute;
        inset: auto auto 0 0;
        width: min(30vw, 360px);
        height: min(24vw, 280px);
        background: radial-gradient(circle, rgba(116, 177, 255, 0.16), transparent 70%);
        pointer-events: none;
      }

      .slide-mark {
        position: absolute;
        top: clamp(0.9rem, 2.4vw, 1.8rem);
        left: clamp(0.95rem, 2.4vw, 1.8rem);
        font-family: var(--display-font);
        font-size: clamp(3rem, 11vw, 8.8rem);
        line-height: 0.9;
        letter-spacing: -0.08em;
        color: rgba(116, 177, 255, 0.12);
        pointer-events: none;
        z-index: 0;
      }

      .slide-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        max-height: 100%;
        overflow: hidden;
        padding: var(--slide-padding);
        gap: var(--content-gap);
        position: relative;
        z-index: 1;
      }

      .slide-content.top {
        justify-content: flex-start;
      }

      .section-kicker {
        position: relative;
        z-index: 1;
        color: color-mix(in srgb, var(--accent-2) 72%, white 10%);
      }

      .slide-copy {
        display: grid;
        gap: var(--element-gap);
        max-width: 64rem;
      }

      h1 {
        font-size: var(--title-size);
        line-height: 0.95;
        max-width: 11ch;
        letter-spacing: -0.05em;
      }

      .lede {
        max-width: 46rem;
        font-size: clamp(0.9rem, 1.4vw, 1.14rem);
        line-height: 1.52;
        color: var(--muted);
      }

      .slide-body {
        display: grid;
        flex: 1 1 auto;
        gap: var(--content-gap);
        min-height: 0;
      }

      .panel {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03)),
          var(--panel);
        border: 1px solid rgba(116, 177, 255, 0.24);
        border-radius: clamp(16px, 2vw, 26px);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .eyebrow {
        font-size: var(--tiny-size);
        line-height: 1.2;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--accent-2) 75%, white 12%);
      }

      .hero-layout {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr);
        gap: clamp(0.7rem, 1.4vw, 1rem);
        align-items: stretch;
      }

      .hero-notes {
        padding: clamp(0.85rem, 1.8vw, 1.2rem);
      }

      .metric-grid,
      .policy-grid,
      .assumption-grid {
        display: grid;
        gap: clamp(0.65rem, 1.25vw, 1rem);
      }

      .metric-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .policy-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .assumption-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .metric-card,
      .policy-card,
      .rate-card,
      .assumption-card,
      .appendix-section,
      .thesis-panel,
      .table-shell {
        padding: clamp(0.95rem, 2vw, 1.35rem);
      }

      .metric-card strong,
      .policy-card h3,
      .rate-card strong,
      .assumption-card strong {
        display: block;
        margin-top: 0.35rem;
      }

      .metric-card strong,
      .rate-card strong,
      .assumption-card strong {
        font-size: clamp(1.08rem, 2.05vw, 1.56rem);
        line-height: 1.12;
      }

      .policy-card h3 {
        font-size: var(--h3-size);
        line-height: 1.08;
      }

      .metric-card p,
      .policy-card p,
      .rate-card p,
      .thesis-summary,
      .comparison-table td,
      .comparison-table th,
      .bullet-list li,
      .appendix-list li {
        font-size: var(--body-size);
        line-height: 1.44;
      }

      .metric-card p,
      .policy-card p,
      .rate-card p,
      .appendix-list li,
      .bullet-list li,
      .thesis-summary {
        color: var(--muted);
      }

      .rate-stack {
        display: grid;
        gap: clamp(0.65rem, 1vw, 0.9rem);
      }

      .rate-card {
        display: grid;
        gap: 0.5rem;
      }

      .rate-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .bullet-list,
      .appendix-list {
        padding-left: 1.15rem;
        display: grid;
        gap: 0.55rem;
        max-width: 56rem;
      }

      .table-shell {
        max-width: 100%;
        min-height: 0;
        overflow: auto;
        overscroll-behavior-x: contain;
        overscroll-behavior-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .comparison-table {
        width: max-content;
        min-width: 100%;
        border-collapse: collapse;
      }

      .comparison-table th,
      .comparison-table td {
        padding: 0.78rem 0.84rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        text-align: left;
        vertical-align: top;
      }

      .comparison-table th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: color-mix(in srgb, var(--bg-2) 92%, black 8%);
        color: color-mix(in srgb, var(--accent-2) 72%, white 12%);
        font-size: var(--tiny-size);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .comparison-table th:first-child,
      .comparison-table td:first-child {
        position: sticky;
        left: 0;
        z-index: 1;
        background: color-mix(in srgb, var(--bg-2) 90%, black 10%);
      }

      .comparison-table th:first-child {
        z-index: 3;
      }

      .comparison-table tbody tr:nth-child(odd) td {
        background: rgba(255, 255, 255, 0.025);
      }

      .comparison-table tbody tr:last-child td {
        border-bottom: 0;
      }

      .appendix-grid {
        display: grid;
        gap: clamp(0.65rem, 1vw, 0.9rem);
        grid-template-columns: 1fr;
      }

      .thesis-panel {
        max-width: 54rem;
        display: grid;
        gap: 0.85rem;
        background: rgba(255, 255, 255, 0.05);
      }

      .slide[data-active="true"] .slide-mark {
        color: rgba(109, 221, 255, 0.18);
      }

      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }

        .progress-bar {
          transition: none;
        }
      }

      @media (max-width: 1180px) {
        .hero-layout,
        .policy-grid,
        .metric-grid,
        .assumption-grid {
          grid-template-columns: 1fr;
        }

        .slide-copy h1 {
          max-width: 15ch;
        }
      }

      @media (max-width: 760px) {
        .deck-brand {
          top: auto;
          bottom: 0.8rem;
        }

        .deck-status {
          width: min(320px, calc(100vw - 1.2rem));
        }

        .slide-copy h1 {
          font-size: clamp(1.7rem, 10vw, 2.9rem);
        }

        .comparison-table th,
        .comparison-table td {
          padding: 0.5rem 0.45rem;
        }
      }
    </style>
  </head>
  <body>
    <div class="deck-brand">
      <div class="brand-mark">A</div>
      <div class="brand-copy">
        <strong>Argos Founder Pricing</strong>
        <span>Investor deck · ${escapeHtml(meta.verificationDate)}</span>
      </div>
    </div>

    <div class="deck-status" aria-label="Deck status">
      <div class="progress-track">
        <div class="progress-bar" data-progress-bar></div>
      </div>
      <div class="status-row slide-counter">
        <span data-active-group>Main deck</span>
        <span data-slide-status>Slide 1 of ${mainSlides.length}</span>
      </div>
      <strong class="status-title" data-active-title>${escapeHtml(mainSlides[0]?.title ?? meta.title)}</strong>
    </div>

    <main
      id="deck-track"
      class="deck"
      data-content-main-slides="${counts.mainSlides}"
      data-content-appendix-slides="${counts.appendixSlides}"
      data-content-total-slides="${allSlides.length}"
    >
      ${allSlides.map((slide, index) => renderSlide(slide, index === 0)).join("")}
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
    PAYLOAD_BUILDERS,
    resolveSlideDefinition,
  },
};
module.exports.default = renderFounderPricingHtml;
