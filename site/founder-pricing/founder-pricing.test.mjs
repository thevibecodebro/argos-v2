import test from "node:test";
import assert from "node:assert/strict";
import founderPricingContent from "./content.js";
import founderPricingModel from "./model.js";

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
  assert.deepEqual(founderPricingModel.derived.seatEconomicsTable.columns, [
    { key: "label", label: "Plan", format: "text" },
    { key: "monthlyRevenue", label: "Monthly revenue", format: "currency" },
    { key: "annualRevenue", label: "Annual revenue", format: "currency" },
    { key: "includedVoiceMinutes", label: "Included voice minutes", format: "number" },
    { key: "overageRate", label: "Overage rate", format: "currency" },
  ]);
  assert.deepEqual(founderPricingModel.derived.seatEconomicsTable.rows[0], {
    label: "Solo",
    monthlyRevenue: 79,
    annualRevenue: 853.2,
    includedVoiceMinutes: 120,
    overageRate: 0.39,
  });
  assert.deepEqual(founderPricingModel.derived.seatEconomicsTable.rows[1], {
    label: "Team minimum",
    monthlyRevenue: 150,
    annualRevenue: 1620,
    includedVoiceMinutes: 360,
    overageRate: 0.29,
  });
  assert.deepEqual(founderPricingModel.derived.marginTable.rows[0], {
    label: "Solo monthly",
    revenue: 79,
    stripeFees: 3.14,
    netAfterStripe: 75.86,
  });
  assert.deepEqual(founderPricingModel.derived.voiceSensitivityTable.rows[0], {
    label: "Solo included",
    voiceMinutes: 120,
    incrementalRevenue: 0,
  });
  assert.deepEqual(founderPricingModel.derived.voiceSensitivityTable.rows[1], {
    label: "Solo +250 pack",
    voiceMinutes: 370,
    incrementalRevenue: 125,
  });
  assert.deepEqual(founderPricingModel.derived.orgMarginTable.rows[0], {
    label: "Solo",
    revenue: 79,
    stripeFees: 3.14,
    softwareCost: 97,
    marginAfterSoftware: -21.14,
  });
});

test("founder pricing content exports the new deck and appendix contract", () => {
  assert.equal(founderPricingContent.meta.title, "Founder Pricing & COGS");
  assert.equal(founderPricingContent.meta.verificationDate, "April 23, 2026");
  assert.equal(founderPricingContent.meta.publishedPath, "/argos-v2/founder-pricing/");
  assert.deepEqual(Object.keys(founderPricingContent.meta).sort(), [
    "publishedPath",
    "title",
    "verificationDate",
  ]);

  assert.equal(founderPricingContent.theme.typography.display, "Space Grotesk");
  assert.equal(founderPricingContent.theme.typography.body, "Source Sans 3");
  assert.equal(founderPricingContent.theme.colors.background, "#0b0e14");

  assert.equal(founderPricingContent.model, founderPricingModel);
  assert.deepEqual(founderPricingContent.counts, {
    mainSlides: 9,
    appendixSlides: 5,
  });

  assert.equal(Array.isArray(founderPricingContent.slides), true);
  assert.equal(Array.isArray(founderPricingContent.appendix), true);
  assert.equal(founderPricingContent.slides.length, 9);
  assert.equal(founderPricingContent.appendix.length, 5);
  assert.equal("facts" in founderPricingContent, false);
  assert.equal("memoSections" in founderPricingContent, false);
  assert.equal("controls" in founderPricingContent, false);

  assert.deepEqual(
    founderPricingContent.slides.map(({ id }) => id),
    [
      "cover",
      "pricing-architecture",
      "included-usage",
      "vendor-cost-stack",
      "solo-unit-economics",
      "team-unit-economics",
      "annual-vs-monthly",
      "voice-expansion-packs",
      "founder-close",
    ],
  );
  assert.deepEqual(
    founderPricingContent.appendix.map(({ id }) => id),
    [
      "appendix-rate-card",
      "appendix-formulas",
      "appendix-seat-economics",
      "appendix-margin-bridge",
      "appendix-voice-sensitivity",
    ],
  );
  assert.equal(
    founderPricingContent.appendix.find((entry) => entry.id === "appendix-seat-economics")
      ?.sections[0]?.table,
    founderPricingModel.derived.seatEconomicsTable,
  );
  assert.equal(
    founderPricingContent.appendix.find((entry) => entry.id === "appendix-margin-bridge")
      ?.sections[0]?.table,
    founderPricingModel.derived.marginTable,
  );
  assert.equal(
    founderPricingContent.appendix.find((entry) => entry.id === "appendix-margin-bridge")
      ?.sections[1]?.table,
    founderPricingModel.derived.orgMarginTable,
  );
  assert.equal(
    founderPricingContent.appendix.find((entry) => entry.id === "appendix-voice-sensitivity")
      ?.sections[0]?.table,
    founderPricingModel.derived.voiceSensitivityTable,
  );
  const appendixTables = founderPricingContent.appendix
    .flatMap((entry) => entry.sections)
    .map((section) => section.table)
    .filter(Boolean);
  for (const table of appendixTables) {
    assertDeclarativeTable(table);
  }
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
