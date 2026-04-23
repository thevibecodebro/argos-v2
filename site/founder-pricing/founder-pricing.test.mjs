import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { createRequire } from "node:module";
import founderPricingContent from "./content.js";
import founderPricingModel from "./model.js";

const require = createRequire(import.meta.url);
const renderModule = require("./render.js");
const { renderFounderPricingHtml, __test: renderTestExports } = renderModule;

test("canonical founder pricing model encodes approved assumptions, verified rates, and derived economics", () => {
  assert.equal(founderPricingModel.verifiedAt, "April 23, 2026");

  assert.deepEqual(founderPricingModel.plans.solo, {
    label: "Solo",
    priceMonthly: 79,
    includedVoiceMinutes: 120,
    overageRate: 0.39,
  });
  assert.deepEqual(founderPricingModel.plans.team, {
    label: "Team",
    pricePerSeatMonthly: 50,
    seatMinimum: 3,
    includedVoiceMinutesPerSeat: 120,
    overageRate: 0.29,
  });
  assert.equal(founderPricingModel.annualDiscountRate, 0.1);

  assert.deepEqual(founderPricingModel.packs, {
    solo: [{ label: "Solo 250", minutes: 250, price: 125, expiresInDays: 90 }],
    team: [
      { label: "Team 500", minutes: 500, price: 175, expiresInDays: 90 },
      { label: "Team 2000", minutes: 2000, price: 600, expiresInDays: 90 },
    ],
  });
  assert.deepEqual(founderPricingModel.derived.packCatalog, {
    solo250: {
      label: "Solo 250",
      minutes: 250,
      price: 125,
      expiresInDays: 90,
      pricePerMinute: 0.5,
    },
    team500: {
      label: "Team 500",
      minutes: 500,
      price: 175,
      expiresInDays: 90,
      pricePerMinute: 0.35,
    },
    team2000: {
      label: "Team 2000",
      minutes: 2000,
      price: 600,
      expiresInDays: 90,
      pricePerMinute: 0.3,
    },
  });

  assert.deepEqual(founderPricingModel.stripeFees, {
    cardPercent: 0.029,
    cardFixed: 0.3,
    billingPercent: 0.007,
  });

  assert.deepEqual(
    founderPricingModel.vendors.map(({ name }) => name),
    [
      "OpenAI",
      "Vercel",
      "Supabase",
      "Fly.io",
      "HighLevel",
      "Resend",
      "Stripe processing",
      "Stripe Billing",
    ],
  );
  assert.match(
    founderPricingModel.vendors.find((vendor) => vendor.name === "OpenAI")?.rateText ?? "",
    /GPT-realtime-1\.5 audio \$32 \/ 1M input tokens and \$64 \/ 1M output tokens/,
  );
  assert.match(
    founderPricingModel.vendors.find((vendor) => vendor.name === "Vercel")?.rateText ?? "",
    /Pro \$20 \/ month includes 1 deploy seat and \$20 usage credit/,
  );
  assert.match(
    founderPricingModel.vendors.find((vendor) => vendor.name === "Supabase")?.rateText ?? "",
    /Pro \$25 \/ org \/ month includes \$10 compute credits/,
  );
  assert.match(
    founderPricingModel.vendors.find((vendor) => vendor.name === "Resend")?.rateText ?? "",
    /Pro \$20 \/ month includes 50,000 emails/,
  );

  assert.equal(founderPricingModel.assumptions.usage.liveVoicePlanningCostPerMinute, 0.08);
  assert.equal(founderPricingModel.assumptions.usage.scoredCallCostPerCall, 0.325);
  assert.equal(founderPricingModel.assumptions.softwareFloor.baseRecurringMonthly, 173.83);
  assert.equal(founderPricingModel.assumptions.softwareFloor.sharedFloorPerOrgMonthly, 6.95);

  assert.equal(founderPricingModel.derived.solo.priceAnnual, 853.2);
  assert.equal(founderPricingModel.derived.solo.annualListRevenue, 948);
  assert.equal(founderPricingModel.derived.solo.annualListStripeFee, 34.43);
  assert.equal(founderPricingModel.derived.solo.annualPrepayStripeFee, 31.02);
  assert.equal(founderPricingModel.derived.solo.annualBillingEfficiencySavings, 3.25);
  assert.equal(founderPricingModel.derived.team.seatAnnual, 540);
  assert.equal(founderPricingModel.derived.team.minimumMonthly, 150);
  assert.equal(founderPricingModel.derived.team.minimumAnnual, 1620);
  assert.equal(founderPricingModel.derived.team.minimumIncludedVoiceMinutes, 360);
  assert.equal(founderPricingModel.derived.team.minimumCardFeeMonthly, 4.65);
  assert.equal(founderPricingModel.derived.team.minimumBillingFeeMonthly, 1.05);
  assert.equal(founderPricingModel.derived.team.annualizedMinimumRevenueAtList, 1800);
  assert.equal(founderPricingModel.derived.team.annualizedMinimumStripeFeesAtListVolume, 65.1);
  assert.equal(founderPricingModel.derived.team.annualMinimumBillingEfficiencySavings, 3.3);

  assert.equal(founderPricingModel.derived.scenarios.solo.aiRuntimeCost, 10.9);
  assert.equal(founderPricingModel.derived.scenarios.solo.productGrossMargin, "86.20%");
  assert.equal(founderPricingModel.derived.scenarios.solo.collectedGrossMargin, "82.23%");
  assert.equal(
    founderPricingModel.derived.scenarios.teamMinimum.productGrossMarginAfterFloor,
    "73.57%",
  );
  assert.equal(
    founderPricingModel.derived.scenarios.teamTenSeat.collectedGrossMarginAfterFloor,
    "73.15%",
  );

  assertDeclarativeTable(founderPricingModel.derived.vendorRateCardTable);
  assertDeclarativeTable(founderPricingModel.derived.formulaTable);
  assertDeclarativeTable(founderPricingModel.derived.annualBillingTable);
  assertDeclarativeTable(founderPricingModel.derived.seatEconomicsTable);
  assertDeclarativeTable(founderPricingModel.derived.voiceSensitivityTable);
  assertDeclarativeTable(founderPricingModel.derived.orgMarginTable);

  assert.deepEqual(founderPricingModel.derived.annualBillingTable.rows, [
    {
      label: "Solo",
      monthlyRevenue: 79,
      annualRevenue: 853.2,
      annualizedMonthlyStripeFees: 37.68,
      annualStripeFeesAtListVolume: 34.43,
      annualStripeFees: 31.02,
      annualBillingEfficiencySavings: 3.25,
    },
    {
      label: "Team minimum",
      monthlyRevenue: 150,
      annualRevenue: 1620,
      annualizedMonthlyStripeFees: 68.4,
      annualStripeFeesAtListVolume: 65.1,
      annualStripeFees: 58.62,
      annualBillingEfficiencySavings: 3.3,
    },
    {
      label: "Team 10-seat",
      monthlyRevenue: 500,
      annualRevenue: 5400,
      annualizedMonthlyStripeFees: 219.6,
      annualStripeFeesAtListVolume: 216.3,
      annualStripeFees: 194.7,
      annualBillingEfficiencySavings: 3.3,
    },
  ]);
  assert.deepEqual(founderPricingModel.derived.seatEconomicsTable.rows, [
    {
      label: "Solo",
      monthlyRevenue: 79,
      totalVoiceMinutes: 120,
      aiRuntimeCost: 10.9,
      productGrossMargin: "86.20%",
      collectedGrossMargin: "82.23%",
    },
    {
      label: "Team minimum",
      monthlyRevenue: 150,
      totalVoiceMinutes: 360,
      aiRuntimeCost: 32.7,
      productGrossMargin: "78.20%",
      collectedGrossMargin: "74.40%",
    },
    {
      label: "Team 10-seat",
      monthlyRevenue: 500,
      totalVoiceMinutes: 1200,
      aiRuntimeCost: 109,
      productGrossMargin: "78.20%",
      collectedGrossMargin: "74.54%",
    },
  ]);
  assert.deepEqual(founderPricingModel.derived.orgMarginTable.rows, [
    {
      label: "Solo",
      monthlyRevenue: 79,
      aiRuntimeCost: 10.9,
      sharedSoftwareFloor: 6.95,
      productGrossMarginAfterFloor: "77.41%",
      collectedGrossMarginAfterFloor: "73.43%",
    },
    {
      label: "Team minimum",
      monthlyRevenue: 150,
      aiRuntimeCost: 32.7,
      sharedSoftwareFloor: 6.95,
      productGrossMarginAfterFloor: "73.57%",
      collectedGrossMarginAfterFloor: "69.77%",
    },
    {
      label: "Team 10-seat",
      monthlyRevenue: 500,
      aiRuntimeCost: 109,
      sharedSoftwareFloor: 6.95,
      productGrossMarginAfterFloor: "76.81%",
      collectedGrossMarginAfterFloor: "73.15%",
    },
  ]);
  assert.deepEqual(founderPricingModel.derived.voiceSensitivityTable.rows, [
    {
      label: "Included only",
      monthlyRevenue: 150,
      totalVoiceMinutes: 360,
      aiRuntimeCost: 32.7,
      productGrossMargin: "78.20%",
      collectedGrossMargin: "74.40%",
    },
    {
      label: "+500 pack",
      monthlyRevenue: 325,
      totalVoiceMinutes: 860,
      aiRuntimeCost: 72.7,
      productGrossMargin: "77.63%",
      collectedGrossMargin: "73.94%",
    },
    {
      label: "+2,000 pack",
      monthlyRevenue: 750,
      totalVoiceMinutes: 2360,
      aiRuntimeCost: 192.7,
      productGrossMargin: "74.31%",
      collectedGrossMargin: "70.67%",
    },
  ]);
});

test("founder pricing content exports the pricing-only investor deck contract", () => {
  assert.equal(founderPricingContent.meta.title, "Argos Pricing & Unit Economics");
  assert.equal(founderPricingContent.meta.verificationDate, "April 23, 2026");
  assert.equal(founderPricingContent.meta.publishedPath, "/argos-v2/founder-pricing/");

  assert.equal(founderPricingContent.theme.typography.display, "Space Grotesk");
  assert.equal(founderPricingContent.theme.typography.body, "Source Sans 3");
  assert.equal(founderPricingContent.theme.colors.background, "#0b0e14");

  assert.equal(founderPricingContent.model, founderPricingModel);
  assert.deepEqual(founderPricingContent.counts, {
    mainSlides: 9,
    appendixSlides: 5,
  });

  assert.equal(founderPricingContent.slides.length, 9);
  assert.equal(founderPricingContent.appendix.length, 5);
  assert.deepEqual(
    founderPricingContent.slides.map((slide) => slide.title),
    [
      "Argos Pricing & Unit Economics",
      "Included Usage & Voice Policy",
      "Base Usage Assumptions",
      "Official Vendor Cost Stack",
      "Seat Economics: Solo vs Team",
      "Org-Level Margin Outcomes",
      "Monthly vs Annual Billing Economics",
      "Voice Sensitivity & Downside Control",
      "Closing Thesis",
    ],
  );
  assert.equal("facts" in founderPricingContent, false);
  assert.equal("memoSections" in founderPricingContent, false);
  assert.equal("controls" in founderPricingContent, false);

  const appendixTables = founderPricingContent.appendix
    .flatMap((entry) => entry.sections)
    .map((section) => section.table)
    .filter(Boolean);

  for (const table of appendixTables) {
    assertDeclarativeTable(table);
  }
});

test("renderer produces a continuous investor deck shell with main and appendix rails", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(html, /class="deck-shell"/);
  assert.match(html, /aria-label="Slide rail"/);
  assert.match(html, /aria-label="Appendix rail"/);
  assert.match(html, /id="deck-track"/);
  assert.match(html, /data-content-main-slides="9"/);
  assert.match(html, /data-content-appendix-slides="5"/);
  assert.match(html, /data-content-total-slides="14"/);
  assert.equal(html.includes("memo-view"), false);
  assert.equal(html.includes("mode-button"), false);
  assert.equal(html.includes("Memo mode"), false);
  assert.equal(countMatches(html, /class="deck-slide /g), 14);
  assert.match(html, /data-slide-kind="hero-metrics"/);
  assert.match(html, /data-slide-kind="policy-grid"/);
  assert.match(html, /data-slide-kind="rate-stack"/);
  assert.match(html, /data-slide-kind="assumption-list"/);
  assert.match(html, /data-slide-kind="comparison-table"/);
  assert.match(html, /data-slide-kind="thesis"/);
  assert.match(html, /data-slide-kind="appendix-table"/);
  assert.match(html, /data-slide-kind="sensitivity-table"/);
});

test("renderer outputs verified pricing, vendor, and appendix detail in HTML", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(html, /Argos Pricing &amp; Unit Economics/);
  assert.match(html, /Official Vendor Cost Stack/);
  assert.match(html, /Resend/);
  assert.match(html, /GPT-realtime-1\.5 audio \$32 \/ 1M input tokens and \$64 \/ 1M output tokens/);
  assert.match(html, /Pro \$20 \/ month includes 1 deploy seat and \$20 usage credit/);
  assert.match(html, /shared-cpu-2x with 2GB RAM is \$11\.83 \/ month/);
  assert.match(html, /Starter \$97 \/ month/);
  assert.match(html, /2\.9% \+ \$0\.30 per successful card charge/);
  assert.match(html, /0\.7% of billing volume on pay-as-you-go pricing/);
  assert.match(html, /Zoom is excluded from the base recurring model\./);
  assert.match(
    html,
    /Internal underwriting rates remain \$0\.39\/minute for Solo and \$0\.29\/minute for Team/,
  );
  assert.match(html, /Team 10-seat/);
  assert.match(html, /Verified vendor rates/);
  assert.match(html, /Key formulas/);
});

test("pricing policy slide no longer exposes raw public per-minute overage copy", () => {
  const html = renderFounderPricingHtml(founderPricingContent);
  const policySlide = getSlideMarkup(html, "pricing-architecture");
  const assumptionsSlide = getSlideMarkup(html, "included-usage");

  assert.match(policySlide, /prepaid pack/i);
  assert.doesNotMatch(policySlide, /\$0\.39\/minute overage pricing/);
  assert.doesNotMatch(policySlide, /\$0\.29\/minute overage pricing/);
  assert.match(assumptionsSlide, /\$0\.08 \/ min/);
  assert.match(assumptionsSlide, /\$173\.83 \/ mo/);
});

test("renderer preserves declared bullets for the updated deck narrative", () => {
  const html = renderFounderPricingHtml(founderPricingContent);
  const assumptionsSlide = getSlideMarkup(html, "included-usage");
  const vendorSlide = getSlideMarkup(html, "vendor-cost-stack");
  const voiceSlide = getSlideMarkup(html, "voice-expansion-packs");

  for (const bullet of founderPricingContent.slides.find((slide) => slide.id === "included-usage").bullets) {
    assert.match(assumptionsSlide, new RegExp(escapeRegExp(bullet)));
  }

  for (const bullet of founderPricingContent.slides.find((slide) => slide.id === "vendor-cost-stack").bullets) {
    assert.match(vendorSlide, new RegExp(escapeRegExp(bullet)));
  }

  for (const bullet of founderPricingContent.slides.find((slide) => slide.id === "voice-expansion-packs").bullets) {
    assert.match(voiceSlide, new RegExp(escapeRegExp(bullet)));
  }

  assert.match(voiceSlide, /Included only/);
  assert.match(voiceSlide, /\+500 pack/);
  assert.match(voiceSlide, /70\.67%/);
});

test("renderer uses explicit slide definitions for kinds and payload sources", () => {
  const { resolveSlideDefinition } = renderTestExports;

  assert.deepEqual(resolveSlideDefinition("included-usage", "main"), {
    kind: "rate-stack",
    payloadKey: "includedUsageRates",
  });
  assert.deepEqual(resolveSlideDefinition("vendor-cost-stack", "main"), {
    kind: "assumption-list",
    payloadKey: "vendorAssumptions",
  });
  assert.deepEqual(resolveSlideDefinition("solo-unit-economics", "main"), {
    kind: "comparison-table",
    payloadKey: "seatEconomicsTable",
  });
  assert.deepEqual(resolveSlideDefinition("team-unit-economics", "main"), {
    kind: "comparison-table",
    payloadKey: "orgMarginTable",
  });
  assert.deepEqual(resolveSlideDefinition("annual-vs-monthly", "main"), {
    kind: "comparison-table",
    payloadKey: "annualBillingTable",
  });
  assert.deepEqual(resolveSlideDefinition("voice-expansion-packs", "main"), {
    kind: "comparison-table",
    payloadKey: "voiceSensitivityTable",
  });
  assert.deepEqual(resolveSlideDefinition("appendix-rate-card", "appendix"), {
    kind: "appendix-table",
    payloadKey: "sections",
  });
  assert.deepEqual(resolveSlideDefinition("appendix-voice-sensitivity", "appendix"), {
    kind: "sensitivity-table",
    payloadKey: "sections",
  });
});

test("payload builders read named pack catalog entries instead of fragile positional arrays", () => {
  const { PAYLOAD_BUILDERS } = renderTestExports;
  const coverPayload = PAYLOAD_BUILDERS.coverMetrics(founderPricingContent.slides[0], founderPricingModel);
  const policyPayload = PAYLOAD_BUILDERS.pricingArchitecturePolicies(
    founderPricingContent.slides[1],
    founderPricingModel,
  );
  const sensitivityPayload = PAYLOAD_BUILDERS.voiceSensitivityTable(
    founderPricingContent.slides[7],
    founderPricingModel,
  );

  assert.deepEqual(coverPayload.metrics[3], {
    label: "Voice expansion",
    value: "$175",
    detail: "500-minute team growth pack",
  });
  assert.match(policyPayload.cards[0].body, /250-minute prepaid pack/);
  assert.match(policyPayload.cards[1].body, /prepaid team packs/);
  assert.deepEqual(sensitivityPayload.table.rows, founderPricingModel.derived.voiceSensitivityTable.rows);
  assert.deepEqual(PAYLOAD_BUILDERS.voiceExpansionPacks(founderPricingContent.slides[7], founderPricingModel).items, [
    {
      label: "Solo pack",
      value: "250 min / $125",
      detail: "Public overage pack valid for 90 days.",
    },
    {
      label: "Team growth pack",
      value: "500 min / $175",
      detail: "Public overage pack valid for 90 days.",
    },
    {
      label: "Team scale pack",
      value: "2,000 min / $600",
      detail: "Public overage pack valid for 90 days.",
    },
  ]);
});

test("responsive CSS preserves viewport lock without internal scrolling", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(
    html,
    /\.deck-slide\s*\{\s*min-height:\s*var\(--slide-height\);\s*max-height:\s*var\(--slide-height\);/s,
  );
  assert.doesNotMatch(
    html,
    /@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.deck-slide\s*\{[\s\S]*?min-height:\s*auto;[\s\S]*?max-height:\s*none;/,
  );
  assert.doesNotMatch(
    html,
    /@media[\s\S]*?\.slide-body\s*\{[\s\S]*?overflow:\s*(auto|scroll)/,
  );
});

test("slide kind inference supports the required investor deck slide types", () => {
  const { inferSlideKind } = renderTestExports;

  assert.equal(inferSlideKind({ id: "cover" }, "main"), "hero-metrics");
  assert.equal(inferSlideKind({ id: "pricing-architecture" }, "main"), "policy-grid");
  assert.equal(inferSlideKind({ id: "included-usage" }, "main"), "rate-stack");
  assert.equal(inferSlideKind({ id: "vendor-cost-stack" }, "main"), "assumption-list");
  assert.equal(inferSlideKind({ id: "solo-unit-economics" }, "main"), "comparison-table");
  assert.equal(inferSlideKind({ id: "founder-close" }, "main"), "thesis");
  assert.equal(inferSlideKind({ id: "appendix-rate-card" }, "appendix"), "appendix-table");
  assert.equal(
    inferSlideKind({ id: "appendix-voice-sensitivity" }, "appendix"),
    "sensitivity-table",
  );
});

test("controller navigates only slides and appendix slides with status and hash sync", () => {
  const controller = createControllerHarness();
  const { window, document, slides, slideLinks, prevButton, nextButton, statusNode } =
    controller;

  runController(window, document);

  const instance = window.__founderPricingController;
  assert.ok(instance);
  assert.equal(statusNode.textContent, "Slide 1 of 2");
  assert.equal(prevButton.disabled, true);
  assert.equal(nextButton.disabled, false);
  assert.equal(window.location.hash, "#slide-cover");
  assert.equal(slides[0].dataset.active, "true");
  assert.equal(slides[1].dataset.active, "false");
  assert.equal(slides[2].dataset.active, "false");

  slideLinks[1].emit("click", { preventDefault() {} });
  assert.equal(statusNode.textContent, "Slide 2 of 2");
  assert.equal(window.location.hash, "#slide-pricing-architecture");
  assert.equal(slides[1].dataset.active, "true");

  window.emit("keydown", {
    key: "ArrowRight",
    preventDefault() {},
  });
  assert.equal(statusNode.textContent, "Appendix 1 of 1");
  assert.equal(window.location.hash, "#slide-appendix-rate-card");
  assert.equal(nextButton.disabled, true);

  window.emit("wheel", { deltaY: -40 });
  assert.equal(statusNode.textContent, "Slide 2 of 2");

  window.emit("touchstart", {
    changedTouches: [{ clientX: 200, clientY: 40 }],
  });
  window.emit("touchend", {
    changedTouches: [{ clientX: 40, clientY: 46 }],
  });
  assert.equal(statusNode.textContent, "Appendix 1 of 1");

  window.location.hash = "#slide-cover";
  window.emit("hashchange");
  assert.equal(statusNode.textContent, "Slide 1 of 2");
  assert.equal(prevButton.disabled, true);
  assert.equal(slides[0].scrollIntoViewCalls > 0, true);
});

function assertDeclarativeTable(table) {
  assert.equal(typeof table, "object");
  assert.notEqual(table, null);
  assert.equal(Array.isArray(table.columns), true);
  assert.equal(Array.isArray(table.rows), true);
  assert.ok(table.columns.length > 0);
  for (const column of table.columns) {
    assert.equal(typeof column.key, "string");
    assert.equal(typeof column.label, "string");
    assert.equal(typeof column.format, "string");
  }
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function getSlideMarkup(html, slideId) {
  const startToken = `id="slide-${slideId}"`;
  const startIndex = html.indexOf(startToken);

  assert.notEqual(startIndex, -1, `Expected markup for slide ${slideId}`);

  const articleStart = html.lastIndexOf("<article", startIndex);
  const nextSlideMarker = '\n    <article\n      id="slide-';
  const nextArticleStart = html.indexOf(nextSlideMarker, startIndex + startToken.length);
  const articleEnd = nextArticleStart === -1 ? html.length : nextArticleStart;

  return html.slice(articleStart, articleEnd);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runController(window, document) {
  vm.runInNewContext(renderTestExports.CONTROLLER_SOURCE, {
    window,
    document,
  });
  window.emit("DOMContentLoaded");
}

function createControllerHarness() {
  class FakeNode {
    constructor({ dataset = {}, hidden = false, textContent = "" } = {}) {
      this.dataset = { ...dataset };
      this.hidden = hidden;
      this.textContent = textContent;
      this.disabled = false;
      this.attributes = new Map();
      this.listeners = new Map();
      this.scrollIntoViewCalls = 0;
      this.heading = null;
    }

    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    }

    emit(type, event = {}) {
      const handler = this.listeners.get(type);
      if (handler) {
        handler(event);
      }
    }

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }

    querySelector(selector) {
      if (selector === "h1") {
        return this.heading;
      }

      return null;
    }

    scrollIntoView() {
      this.scrollIntoViewCalls += 1;
    }
  }

  function createSlide({ id, group, ordinal, hidden, title }) {
    const slide = new FakeNode({
      dataset: {
        slideId: id,
        slideGroup: group,
        slideOrdinal: String(ordinal),
      },
      hidden,
    });
    slide.heading = { textContent: title };
    return slide;
  }

  const slides = [
    createSlide({
      id: "cover",
      group: "main",
      ordinal: 0,
      hidden: false,
      title: "Argos Pricing & Unit Economics",
    }),
    createSlide({
      id: "pricing-architecture",
      group: "main",
      ordinal: 1,
      hidden: true,
      title: "Included Usage & Voice Policy",
    }),
    createSlide({
      id: "appendix-rate-card",
      group: "appendix",
      ordinal: 0,
      hidden: true,
      title: "Appendix: Vendor Rate Card",
    }),
  ];

  const slideLinks = slides.map(
    (slide) =>
      new FakeNode({
        dataset: { slideTarget: slide.dataset.slideId },
      }),
  );
  const prevButton = new FakeNode();
  const nextButton = new FakeNode();
  const statusNode = new FakeNode();
  const groupNode = new FakeNode({ textContent: "Main deck" });
  const titleNode = new FakeNode({ textContent: "Argos Pricing & Unit Economics" });

  const document = {
    querySelectorAll(selector) {
      if (selector === ".deck-slide") {
        return slides;
      }

      if (selector === "[data-slide-target]") {
        return slideLinks;
      }

      return [];
    },
    querySelector(selector) {
      if (selector === '[data-nav="prev"]') {
        return prevButton;
      }

      if (selector === '[data-nav="next"]') {
        return nextButton;
      }

      if (selector === "[data-slide-status]") {
        return statusNode;
      }

      if (selector === "[data-active-group]") {
        return groupNode;
      }

      if (selector === "[data-active-title]") {
        return titleNode;
      }

      if (selector === ".deck-slide") {
        return slides[0];
      }

      return null;
    },
  };

  const listeners = new Map();
  const window = {
    location: { hash: "" },
    history: {
      replaceState(_state, _title, hash) {
        window.location.hash = hash;
      },
    },
    matchMedia() {
      return { matches: false };
    },
    setTimeout(callback) {
      if (typeof callback === "function") {
        callback();
      }
      return 1;
    },
    clearTimeout() {},
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    emit(type, event = {}) {
      const handler = listeners.get(type);
      if (handler) {
        handler(event);
      }
    },
  };

  return {
    window,
    document,
    slides,
    slideLinks,
    prevButton,
    nextButton,
    statusNode,
    groupNode,
    titleNode,
  };
}
