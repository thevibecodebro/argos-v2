import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { createRequire } from "node:module";
import founderPricingContent from "./content.js";
import founderPricingModel from "./model.js";

const require = createRequire(import.meta.url);
const renderModule = require("./render.js");
const { renderFounderPricingHtml, __test: renderTestExports } = renderModule;

test("canonical founder pricing model encodes approved assumptions and derived values", () => {
  assert.equal(founderPricingModel.verifiedAt, "April 23, 2026");

  assert.deepEqual(founderPricingModel.plans.solo, {
    priceMonthly: 79,
    includedVoiceMinutes: 120,
    overageRate: 0.39,
  });
  assert.deepEqual(founderPricingModel.plans.team, {
    pricePerSeatMonthly: 50,
    seatMinimum: 3,
    includedVoiceMinutesPerSeat: 120,
    overageRate: 0.29,
  });

  assert.equal(founderPricingModel.annualDiscountRate, 0.1);
  assert.deepEqual(founderPricingModel.packs, {
    solo: [{ minutes: 250, price: 125, expiresInDays: 90 }],
    team: [
      { minutes: 500, price: 175, expiresInDays: 90 },
      { minutes: 2000, price: 600, expiresInDays: 90 },
    ],
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
      "Stripe processing",
      "Stripe Billing",
    ],
  );
  assert.equal(
    founderPricingModel.vendors.find((vendor) => vendor.name === "HighLevel")?.monthlyCost,
    97,
  );
  for (const vendor of founderPricingModel.vendors) {
    assert.equal(typeof vendor.sourceLabel, "string");
    assert.notEqual(vendor.sourceLabel.length, 0);
  }

  assert.equal(founderPricingModel.derived.solo.priceAnnual, 853.2);
  assert.equal(founderPricingModel.derived.team.minimumMonthly, 150);
  assert.equal(founderPricingModel.derived.team.minimumAnnual, 1620);
  assert.equal(founderPricingModel.derived.team.minimumIncludedVoiceMinutes, 360);
  assert.equal(founderPricingModel.derived.team.minimumBillingFeeMonthly, 1.05);
  assert.equal(founderPricingModel.derived.team.minimumCardFeeMonthly, 4.65);

  assertDeclarativeTable(founderPricingModel.derived.seatEconomicsTable);
  assertDeclarativeTable(founderPricingModel.derived.marginTable);
  assertDeclarativeTable(founderPricingModel.derived.voiceSensitivityTable);
  assertDeclarativeTable(founderPricingModel.derived.orgMarginTable);
});

test("founder pricing content exports the new deck and appendix contract", () => {
  assert.equal(founderPricingContent.meta.title, "Founder Pricing & COGS");
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
  assert.match(html, /data-nav="prev"/);
  assert.match(html, /data-nav="next"/);
  assert.match(html, /data-slide-status/);
});

test("renderer outputs investor deck primitives for tables and appendix sections", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(html, /class="metric-grid"/);
  assert.match(html, /class="policy-grid"/);
  assert.match(html, /class="rate-stack"/);
  assert.match(html, /class="assumption-list"/);
  assert.match(html, /class="comparison-table"/);
  assert.match(html, /class="appendix-grid"/);
  assert.match(html, /class="appendix-section"/);
  assert.match(html, /Solo subscription/);
  assert.match(html, /Team minimum/);
  assert.match(html, /Voice sensitivity rows/);
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
  assert.equal(
    inferSlideKind({ id: "explicit-kind", kind: "comparison-table" }, "main"),
    "comparison-table",
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
      title: "Founder Pricing & Cogs",
    }),
    createSlide({
      id: "pricing-architecture",
      group: "main",
      ordinal: 1,
      hidden: true,
      title: "Pricing Architecture",
    }),
    createSlide({
      id: "appendix-rate-card",
      group: "appendix",
      ordinal: 0,
      hidden: true,
      title: "Appendix: Rate Card",
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
  const titleNode = new FakeNode({ textContent: "Founder Pricing & Cogs" });

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
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    emit(type, event = {}) {
      const handler = listeners.get(type);
      if (handler) {
        handler(event);
      }
    },
    setTimeout(handler) {
      handler();
      return 0;
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
