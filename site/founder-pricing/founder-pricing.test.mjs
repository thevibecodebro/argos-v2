import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

  assert.equal(founderPricingModel.derived.solo.priceAnnual, 853.2);
  assert.equal(founderPricingModel.derived.team.minimumMonthly, 150);
  assert.equal(founderPricingModel.derived.team.minimumAnnual, 1620);
  assert.equal(founderPricingModel.derived.team.minimumIncludedVoiceMinutes, 360);
  assert.equal(founderPricingModel.derived.team.minimumBillingFeeMonthly, 1.05);
  assert.equal(founderPricingModel.derived.team.minimumCardFeeMonthly, 4.65);
});

test("founder pricing content exports the new deck and appendix contract", () => {
  assert.equal(founderPricingContent.meta.title, "Founder Pricing & COGS");
  assert.equal(founderPricingContent.meta.verifiedAt, "April 23, 2026");
  assert.equal(founderPricingContent.meta.publishedPath, "/argos-v2/founder-pricing/");

  assert.equal(founderPricingContent.theme.typography.display, "Space Grotesk");
  assert.equal(founderPricingContent.theme.typography.body, "Source Sans 3");
  assert.equal(founderPricingContent.theme.colors.background, "#0b0e14");

  assert.equal(founderPricingContent.model, founderPricingModel);
  assert.deepEqual(founderPricingContent.counts, {
    mainSlides: founderPricingContent.slides.length,
    appendixSlides: founderPricingContent.appendix.length,
  });

  assert.equal(Array.isArray(founderPricingContent.slides), true);
  assert.equal(Array.isArray(founderPricingContent.appendix), true);
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
    ["appendix-rate-card", "appendix-formulas"],
  );
});

test("build currently fails on renderer/controller gaps, not missing model or content exports", () => {
  assert.throws(
    () =>
      execFileSync("npm", ["run", "build:founder-pricing"], {
        cwd: new URL("../..", import.meta.url),
        stdio: "pipe",
      }),
    (error) => {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;

      assert.match(output, /render|memo|facts|slides|appendix|controller/i);
      assert.doesNotMatch(output, /Cannot find module ['"].*model\.js['"]/);
      assert.doesNotMatch(output, /content\.js.*does not provide an export/i);

      return true;
    },
  );
});
