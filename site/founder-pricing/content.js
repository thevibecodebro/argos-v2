const model = require("./model.js");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function money(value) {
  return currency.format(value);
}

function percent(value) {
  return `${Number((value * 100).toFixed(2))}%`;
}

const soloPack = model.derived.packCatalog.solo250;
const teamGrowthPack = model.derived.packCatalog.team500;
const teamScalePack = model.derived.packCatalog.team2000;

const slides = [
  {
    id: "cover",
    title: "Argos Pricing & Unit Economics",
    summary:
      "Simple subscription pricing, bounded voice exposure, and a named vendor stack.",
    bullets: [
      `Verified: ${model.verifiedAt}.`,
      "This deck is pricing and unit economics only. Stripe stays separate from product COGS.",
    ],
  },
  {
    id: "pricing-architecture",
    title: "Included Usage & Voice Policy",
    summary:
      "The public menu is subscriptions plus prepaid voice packs, not open-ended metering.",
    bullets: [
      `Solo: ${model.plans.solo.includedVoiceMinutes} live minutes, then a ${soloPack.minutes}-minute prepaid pack.`,
      `Team: ${model.plans.team.includedVoiceMinutesPerSeat} pooled live minutes per seat, then ${teamGrowthPack.minutes}- and ${teamScalePack.minutes}-minute packs.`,
      "Internal per-minute underwriting stays in the appendix.",
    ],
  },
  {
    id: "included-usage",
    title: "Base Usage Assumptions",
    summary:
      "The model uses explicit voice, scored-call, and software-floor inputs rather than hidden averages.",
    bullets: [
      `Solo is modeled at ${model.assumptions.usage.soloScoredCallsMonthly} scored calls per month.`,
      `Team minimum is modeled at ${model.assumptions.usage.teamMinimumScoredCallsMonthly} scored calls per month; the 10-seat reference case uses ${model.assumptions.usage.teamTenSeatScoredCallsMonthly}.`,
      `Optional gpt-4o-mini-tts playback is ~$${model.assumptions.usage.optionalTtsPlaybackCostPerMinute.toFixed(3)} per minute and excluded from base live voice metering.`,
    ],
  },
  {
    id: "vendor-cost-stack",
    title: "Official Vendor Cost Stack",
    summary:
      "The recurring stack is narrow, named directly, and tied back to official vendor rate cards.",
    bullets: [
      "OpenAI, Vercel, Supabase, Fly.io, HighLevel, and Resend make up the base software and API stack.",
      "Zoom is excluded from the base recurring model.",
      "Stripe processing and Stripe Billing are shown as collection drag, not buried inside product gross margin.",
    ],
  },
  {
    id: "solo-unit-economics",
    title: "Seat Economics: Solo vs Team",
    summary:
      "Unit economics assume full included voice usage plus plan-specific scored-call volume.",
    bullets: [
      `Solo: ${model.plans.solo.includedVoiceMinutes} voice minutes and ${model.assumptions.usage.soloScoredCallsMonthly} scored calls.`,
      `Team minimum: ${model.derived.team.minimumIncludedVoiceMinutes} voice minutes and ${model.assumptions.usage.teamMinimumScoredCallsMonthly} scored calls.`,
      `Team 10-seat: ${model.plans.team.includedVoiceMinutesPerSeat * 10} voice minutes and ${model.assumptions.usage.teamTenSeatScoredCallsMonthly} scored calls.`,
    ],
  },
  {
    id: "team-unit-economics",
    title: "Org-Level Margin Outcomes",
    summary:
      "A small shared software floor is layered on top of AI/runtime cost to show real delivered margin.",
    bullets: [
      `The base case allocates ${money(model.assumptions.softwareFloor.sharedFloorPerOrgMonthly)} per org from the ${money(model.assumptions.softwareFloor.baseRecurringMonthly)} recurring floor.`,
      "The 3-seat minimum remains the weakest margin cohort under a 100-call team floor.",
      "Scaled teams still widen the margin cushion.",
    ],
  },
  {
    id: "annual-vs-monthly",
    title: "Monthly vs Annual Billing Economics",
    summary:
      "Annual prepay is a cash collection tool with modest but real payment-fee efficiency.",
    bullets: [
      `Annual pricing is a ${percent(model.annualDiscountRate)} concession, not a separate tier.`,
      "The gain comes from charging once instead of repeating the fixed 30-cent card component twelve times.",
    ],
  },
  {
    id: "voice-expansion-packs",
    title: "Voice Sensitivity & Downside Control",
    summary:
      "Live voice is the main variable, but the downside is bounded because usage is pooled and overage is prepaid.",
    bullets: [
      "Included minutes are bounded and team usage is pooled at the org level.",
      "Heavy voice usage monetizes through prepaid packs rather than unlimited live access.",
      "The pack cases keep collected margin in the mid-60s even on the three-seat team floor.",
    ],
  },
  {
    id: "founder-close",
    title: "Closing Thesis",
    summary:
      "The pricing stays simple, the cost stack is explicit, and live voice is monetized rather than subsidized.",
    bullets: [
      "Solo is straightforward.",
      "Team is viable, but the three-seat floor is the least efficient cohort.",
      "Scaled team margins remain healthy even under heavier scoring assumptions.",
      "Voice expansion is bounded, pooled, and prepaid.",
    ],
  },
];

const appendix = [
  {
    id: "appendix-rate-card",
    title: "Appendix: Vendor Rate Card",
    summary: "Exact vendor rates, planning uses, and source labels used in the deck.",
    sections: [
      {
        label: "Verified vendor rates",
        table: model.derived.vendorRateCardTable,
      },
    ],
  },
  {
    id: "appendix-formulas",
    title: "Appendix: Formula Detail",
    summary: "The core formulas and planning conversions behind the seat model.",
    sections: [
      {
        label: "Key formulas",
        table: model.derived.formulaTable,
      },
      {
        label: "Modeling notes",
        items: [
          "Live voice planning cost is derived from official OpenAI token pricing and presented as an internal minute conversion.",
          "Product gross margin excludes Stripe. Collected gross margin subtracts Stripe processing and Stripe Billing fees.",
          `Solo is modeled at ${model.assumptions.usage.soloScoredCallsMonthly} scored calls per month; Team minimum at ${model.assumptions.usage.teamMinimumScoredCallsMonthly}; Team 10-seat at ${model.assumptions.usage.teamTenSeatScoredCallsMonthly}.`,
          `Internal underwriting rates remain ${money(model.plans.solo.overageRate)}/minute for Solo and ${money(model.plans.team.overageRate)}/minute for Team, but public overage is sold through prepaid packs.`,
          "Purchased voice packs are modeled with 90-day validity in the current implementation plan.",
        ],
      },
    ],
  },
  {
    id: "appendix-seat-economics",
    title: "Appendix: Seat Economics",
    summary: "Detailed seat-level comparison across Solo, Team minimum, and Team 10-seat.",
    sections: [
      {
        label: "Seat economics rows",
        table: model.derived.seatEconomicsTable,
      },
    ],
  },
  {
    id: "appendix-margin-bridge",
    title: "Appendix: Margin Bridge",
    summary: "How shared software floor and Stripe turn product margin into collected margin.",
    sections: [
      {
        label: "Org-level margin rows",
        table: model.derived.orgMarginTable,
      },
      {
        label: "Annual billing rows",
        table: model.derived.annualBillingTable,
      },
    ],
  },
  {
    id: "appendix-voice-sensitivity",
    title: "Appendix: Voice Sensitivity",
    summary: "Team minimum scenarios showing how pack revenue absorbs heavier voice usage.",
    sections: [
      {
        label: "Voice sensitivity rows",
        table: model.derived.voiceSensitivityTable,
      },
      {
        label: "Pack policy",
        items: [
          `Solo pack: ${soloPack.minutes} minutes for ${money(soloPack.price)} valid for ${soloPack.expiresInDays} days.`,
          `Team growth pack: ${teamGrowthPack.minutes} minutes for ${money(teamGrowthPack.price)} valid for ${teamGrowthPack.expiresInDays} days.`,
          `Team scale pack: ${teamScalePack.minutes} minutes for ${money(teamScalePack.price)} valid for ${teamScalePack.expiresInDays} days.`,
        ],
      },
    ],
  },
];

const founderPricingContent = {
  meta: {
    title: "Argos Pricing & Unit Economics",
    verificationDate: model.verifiedAt,
    publishedPath: "/argos-v2/founder-pricing/",
  },
  theme: {
    colors: {
      background: "#0b0e14",
      primarySurface: "#10131a",
      secondarySurface: "#161a21",
      elevatedSurface: "#1c2028",
      elevatedSurfaceAlt: "#22262f",
      primaryText: "#ecedf6",
      secondaryText: "#a9abb3",
      primaryAccent: "#74b1ff",
      tertiaryAccent: "#6dddff",
      outline: "#45484f",
    },
    typography: {
      display: "Space Grotesk",
      body: "Source Sans 3",
    },
  },
  model,
  counts: {
    mainSlides: 9,
    appendixSlides: 5,
  },
  slides,
  appendix,
};

module.exports = founderPricingContent;
module.exports.default = founderPricingContent;
