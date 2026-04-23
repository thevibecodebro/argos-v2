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

  assertDeclarativeTable(founderPricingModel.derived.seatEconomicsTable, {
    columns: [
      { key: "label", label: "Scenario", format: "text" },
      { key: "monthlyRevenue", label: "Monthly list", format: "currency" },
      { key: "totalVoiceMinutes", label: "Included voice", format: "number" },
      { key: "aiRuntimeCost", label: "AI/runtime COGS", format: "currency" },
      { key: "productGrossMargin", label: "Product GM", format: "text" },
      { key: "collectedGrossMargin", label: "Collected GM", format: "text" },
    ],
    rows: [
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
    ],
  });
  assertDeclarativeTable(founderPricingModel.derived.orgMarginTable, {
    columns: [
      { key: "label", label: "Scenario", format: "text" },
      { key: "monthlyRevenue", label: "Monthly list", format: "currency" },
      { key: "aiRuntimeCost", label: "AI/runtime COGS", format: "currency" },
      { key: "sharedSoftwareFloor", label: "Shared floor", format: "currency" },
      { key: "productGrossMarginAfterFloor", label: "Product GM after floor", format: "text" },
      { key: "collectedGrossMarginAfterFloor", label: "Collected GM after floor", format: "text" },
    ],
    rows: [
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
    ],
  });
  assertDeclarativeTable(founderPricingModel.derived.annualBillingTable, {
    columns: [
      { key: "label", label: "Scenario", format: "text" },
      { key: "monthlyRevenue", label: "Monthly list", format: "currency" },
      { key: "annualRevenue", label: "Annual prepay", format: "currency" },
      { key: "annualizedMonthlyStripeFees", label: "Stripe if billed monthly", format: "currency" },
      { key: "annualStripeFeesAtListVolume", label: "Stripe once at list volume", format: "currency" },
      { key: "annualStripeFees", label: "Stripe on annual prepay", format: "currency" },
      { key: "annualBillingEfficiencySavings", label: "Billing frequency savings", format: "currency" },
    ],
    rows: [
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
    ],
  });
  assertDeclarativeTable(founderPricingModel.derived.voiceSensitivityTable, {
    columns: [
      { key: "label", label: "Scenario", format: "text" },
      { key: "monthlyRevenue", label: "Monthly revenue", format: "currency" },
      { key: "totalVoiceMinutes", label: "Total voice minutes", format: "number" },
      { key: "aiRuntimeCost", label: "AI/runtime COGS", format: "currency" },
      { key: "productGrossMargin", label: "Product GM", format: "text" },
      { key: "collectedGrossMargin", label: "Collected GM", format: "text" },
    ],
    rows: [
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
    ],
  });
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
  assert.equal("facts" in founderPricingContent, false);
  assert.equal("memoSections" in founderPricingContent, false);
  assert.equal("controls" in founderPricingContent, false);
});

test("renderer produces an answerworthy-style full viewport slide deck shell", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(html, /class="deck-brand"/);
  assert.match(html, /class="deck-status"/);
  assert.match(html, /class="progress-track"/);
  assert.match(html, /data-progress-bar/);
  assert.match(html, /id="deck-track"/);
  assert.match(html, /data-content-main-slides="9"/);
  assert.match(html, /data-content-appendix-slides="5"/);
  assert.match(html, /data-content-total-slides="14"/);
  assert.equal(html.includes("Slide rail"), false);
  assert.equal(html.includes("Appendix rail"), false);
  assert.equal(html.includes("memo-view"), false);
  assert.equal(html.includes('data-nav="prev"'), false);
  assert.equal(html.includes('data-nav="next"'), false);
  assert.equal(countMatches(html, /class="slide kind-/g), 14);
  assert.match(html, /class="slide-mark"/);
  assert.match(html, /class="section-kicker"/);
  assert.match(html, /data-slide-kind="hero-metrics"/);
  assert.match(html, /data-slide-kind="policy-grid"/);
  assert.match(html, /data-slide-kind="rate-stack"/);
  assert.match(html, /data-slide-kind="assumption-list"/);
  assert.match(html, /data-slide-kind="comparison-table"/);
  assert.match(html, /data-slide-kind="thesis"/);
  assert.match(html, /data-slide-kind="appendix-table"/);
});

test("renderer outputs verified pricing, vendor, and appendix detail in HTML", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(html, /Argos Pricing &amp; Unit Economics/);
  assert.match(html, /Official Vendor Cost Stack/);
  assert.match(html, /Seat Economics: Solo vs Team/);
  assert.match(html, /Monthly vs Annual Billing Economics/);
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
});

test("payload builders read named pack catalog entries instead of fragile positional arrays", () => {
  const { PAYLOAD_BUILDERS } = renderTestExports;
  const coverPayload = PAYLOAD_BUILDERS.coverMetrics(
    founderPricingContent.slides[0],
    founderPricingModel,
  );
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
  assert.deepEqual(
    sensitivityPayload.table.rows,
    founderPricingModel.derived.voiceSensitivityTable.rows,
  );
  assert.deepEqual(
    PAYLOAD_BUILDERS.voiceExpansionPacks(founderPricingContent.slides[7], founderPricingModel).items,
    [
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
    ],
  );
});

test("responsive CSS preserves viewport-lock slide behavior", () => {
  const html = renderFounderPricingHtml(founderPricingContent);

  assert.match(html, /html\s*\{[\s\S]*scroll-snap-type:\s*y mandatory;/);
  assert.match(
    html,
    /\.slide\s*\{[\s\S]*width:\s*100vw;[\s\S]*height:\s*100vh;[\s\S]*height:\s*100dvh;[\s\S]*overflow:\s*hidden;[\s\S]*scroll-snap-align:\s*start;/,
  );
  assert.match(
    html,
    /\.slide-content\s*\{[\s\S]*max-height:\s*100%;[\s\S]*overflow:\s*hidden;/,
  );
  assert.match(html, /\.slide-body\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*0;/);
  assert.match(
    html,
    /\.table-shell\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow:\s*auto;[\s\S]*overscroll-behavior-x:\s*contain;/,
  );
  assert.match(
    html,
    /\.comparison-table\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*100%;/,
  );
  assert.doesNotMatch(html, /\.rail-card/);
  assert.doesNotMatch(html, /\.deck-layout/);
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
});

test("controller updates active slide status, progress, and hash sync", () => {
  const controller = createControllerHarness();
  const { window, document, slides, statusNode, groupNode, titleNode, progressNode } = controller;

  runController(window, document);

  const instance = window.__founderPricingController;
  assert.ok(instance);
  assert.equal(statusNode.textContent, "Slide 1 of 2");
  assert.equal(groupNode.textContent, "Main deck");
  assert.equal(titleNode.textContent, "Argos Pricing & Unit Economics");
  assert.ok(progressNode.style.width.startsWith("33"));
  assert.equal(window.location.hash, "");
  assert.equal(slides[0].dataset.active, "true");
  assert.equal(slides[1].dataset.active, "false");
  assert.equal(slides[2].dataset.active, "false");

  window.emit("keydown", {
    key: "ArrowRight",
    preventDefault() {},
  });
  assert.equal(statusNode.textContent, "Slide 2 of 2");
  assert.equal(window.location.hash, "#slide-pricing-architecture");
  assert.equal(slides[1].dataset.active, "true");
  assert.ok(progressNode.style.width.startsWith("66"));

  window.emit("keydown", {
    key: "ArrowRight",
    preventDefault() {},
  });
  assert.equal(statusNode.textContent, "Appendix 1 of 1");
  assert.equal(groupNode.textContent, "Appendix");
  assert.equal(window.location.hash, "#slide-appendix-rate-card");
  assert.equal(slides[2].dataset.active, "true");
  assert.ok(progressNode.style.width.startsWith("100"));

  window.location.hash = "#slide-cover";
  window.emit("hashchange");
  assert.equal(statusNode.textContent, "Slide 1 of 2");
  assert.equal(groupNode.textContent, "Main deck");
  assert.equal(titleNode.textContent, "Argos Pricing & Unit Economics");
  assert.equal(slides[0].scrollIntoViewCalls > 0, true);
});

test("controller reacts to IntersectionObserver updates during scroll navigation", () => {
  const controller = createControllerHarness();
  const {
    window,
    document,
    slides,
    statusNode,
    groupNode,
    titleNode,
    progressNode,
    intersectionObserver,
  } = controller;

  runController(window, document);

  assert.ok(intersectionObserver.instance);
  assert.equal(intersectionObserver.observedTargets.length, slides.length);

  intersectionObserver.instance.trigger([
    {
      target: slides[1],
      isIntersecting: true,
      intersectionRatio: 0.81,
    },
  ]);

  assert.equal(statusNode.textContent, "Slide 2 of 2");
  assert.equal(groupNode.textContent, "Main deck");
  assert.equal(titleNode.textContent, "Included Usage & Voice Policy");
  assert.ok(progressNode.style.width.startsWith("66"));
  assert.equal(window.location.hash, "#slide-pricing-architecture");
  assert.equal(slides[1].dataset.active, "true");
  assert.equal(slides[1].scrollIntoViewCalls, 0);
});

function assertDeclarativeTable(table, expected) {
  assert.equal(typeof table, "object");
  assert.notEqual(table, null);
  assert.equal(Array.isArray(table.columns), true);
  assert.equal(Array.isArray(table.rows), true);
  assert.ok(table.columns.length > 0);

  if (expected) {
    assert.deepEqual(table.columns, expected.columns);
    assert.deepEqual(table.rows, expected.rows);
  }
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function getSlideMarkup(html, slideId) {
  const startToken = `id="slide-${slideId}"`;
  const startIndex = html.indexOf(startToken);

  assert.notEqual(startIndex, -1, `Expected markup for slide ${slideId}`);

  const sectionStart = html.lastIndexOf("<section", startIndex);
  const nextSlideMarker = '\n    <section\n      id="slide-';
  const nextSectionStart = html.indexOf(nextSlideMarker, startIndex + startToken.length);
  const sectionEnd = nextSectionStart === -1 ? html.length : nextSectionStart;

  return html.slice(sectionStart, sectionEnd);
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
    constructor({ dataset = {}, textContent = "" } = {}) {
      this.dataset = { ...dataset };
      this.textContent = textContent;
      this.attributes = new Map();
      this.listeners = new Map();
      this.scrollIntoViewCalls = 0;
      this.style = {};
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

  function createSlide({ id, group, ordinal, title }) {
    const slide = new FakeNode({
      dataset: {
        slideId: id,
        slideGroup: group,
        slideOrdinal: String(ordinal),
        active: "false",
      },
    });
    slide.heading = { textContent: title };
    return slide;
  }

  const slides = [
    createSlide({
      id: "cover",
      group: "main",
      ordinal: 0,
      title: "Argos Pricing & Unit Economics",
    }),
    createSlide({
      id: "pricing-architecture",
      group: "main",
      ordinal: 1,
      title: "Included Usage & Voice Policy",
    }),
    createSlide({
      id: "appendix-rate-card",
      group: "appendix",
      ordinal: 0,
      title: "Appendix: Vendor Rate Card",
    }),
  ];

  const statusNode = new FakeNode();
  const groupNode = new FakeNode({ textContent: "Main deck" });
  const titleNode = new FakeNode({ textContent: "Argos Pricing & Unit Economics" });
  const progressNode = new FakeNode();

  const document = {
    querySelectorAll(selector) {
      if (selector === ".slide") {
        return slides;
      }

      return [];
    },
    querySelector(selector) {
      if (selector === "[data-slide-status]") {
        return statusNode;
      }

      if (selector === "[data-active-group]") {
        return groupNode;
      }

      if (selector === "[data-active-title]") {
        return titleNode;
      }

      if (selector === "[data-progress-bar]") {
        return progressNode;
      }

      if (selector === ".slide") {
        return slides[0];
      }

      return null;
    },
  };

  const listeners = new Map();
  const intersectionObserver = {
    instance: null,
    observedTargets: [],
  };
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
    IntersectionObserver: class FakeIntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        intersectionObserver.instance = this;
      }

      observe(target) {
        intersectionObserver.observedTargets.push(target);
      }

      disconnect() {}

      trigger(entries) {
        this.callback(entries);
      }
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
  };

  return {
    window,
    document,
    slides,
    statusNode,
    groupNode,
    titleNode,
    progressNode,
    intersectionObserver,
  };
}
