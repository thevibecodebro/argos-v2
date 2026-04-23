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
      "Simple subscription pricing, bounded live voice exposure, and a named vendor stack.",
    bullets: [
      `Verified: ${model.verifiedAt}.`,
      "This deck is pricing and unit economics only. Stripe stays separate from product COGS.",
    ],
  },
  {
    id: "pricing-architecture",
    title: "Included Usage & Voice Policy",
    summary:
      "The commercial promise is subscriptions plus prepaid voice packs, not open-ended public metering.",
    bullets: [
      `Solo includes ${model.plans.solo.includedVoiceMinutes} live voice minutes each month and expands through a ${soloPack.minutes}-minute pack.`,
      `Team includes ${model.plans.team.includedVoiceMinutesPerSeat} live minutes per seat, pooled at the org level, with ${teamGrowthPack.minutes}- and ${teamScalePack.minutes}-minute packs for overage.`,
      "Internal per-minute underwriting rates stay in the appendix; the public packaging stays on subscriptions and packs.",
    ],
  },
  {
    id: "included-usage",
    title: "Base Usage Assumptions",
    summary:
      "The model uses explicit inputs for voice, scored calls, and shared software floor rather than hidden averages.",
    bullets: [
      `Live voice is modeled at ${money(model.assumptions.usage.liveVoicePlanningCostPerMinute)} per minute; this is an internal conversion from OpenAI realtime token pricing, not an official minute quote.`,
      `Scored calls are modeled at $${model.assumptions.usage.scoredCallCostPerCall.toFixed(3)} per 45-60 minute call, using ${model.assumptions.usage.averageScoredCallMinutes} minutes of transcription plus a small GPT-5 mini scoring buffer.`,
      `Base usage assumes ${model.assumptions.usage.scoredCallsPerSeatMonthly} scored calls per seat per month and spreads the ${money(model.assumptions.softwareFloor.baseRecurringMonthly)} software floor across ${model.assumptions.softwareFloor.activePayingOrgsBaseCase} active paying orgs.`,
      `Optional gpt-4o-mini-tts playback is ~$${model.assumptions.usage.optionalTtsPlaybackCostPerMinute.toFixed(3)} per minute and is excluded from base live voice metering.`,
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
      "Unit economics assume full included live voice usage and four scored calls per seat per month.",
    bullets: [
      "The seat view is intentionally hard-nosed: it uses the full included voice allowance instead of optimistic utilization.",
      "The comparison keeps the three-seat minimum and a representative ten-seat team in the same frame.",
    ],
  },
  {
    id: "team-unit-economics",
    title: "Org-Level Margin Outcomes",
    summary:
      "A small shared software floor is layered on top of AI/runtime cost to show real delivered margin.",
    bullets: [
      `The base case allocates ${money(model.assumptions.softwareFloor.sharedFloorPerOrgMonthly)} per org from the ${money(model.assumptions.softwareFloor.baseRecurringMonthly)} recurring software floor.`,
      "The three-seat minimum protects the weakest team cohort, while larger teams widen the margin cushion.",
    ],
  },
  {
    id: "annual-vs-monthly",
    title: "Monthly vs Annual Billing Economics",
    summary:
      "Annual prepay is a cash collection tool with modest but real payment-fee efficiency.",
    bullets: [
      `Annual pricing is a ${percent(model.annualDiscountRate)} concession, not a separate tier.`,
      "The fee improvement comes from charging once instead of repeating the fixed 30-cent card component twelve times.",
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
      "The shown pack cases keep collected margin above 70% in the modeled three-seat team scenarios.",
    ],
  },
  {
    id: "founder-close",
    title: "Closing Thesis",
    summary:
      "The pricing system stays simple, the margin structure is readable, and live voice is monetized rather than subsidized.",
    bullets: [
      "Two subscription plans cover the menu: Solo for individuals and Team with a hard three-seat floor.",
      "Product gross margins remain strong under full included voice assumptions.",
      "Stripe drag is visible and manageable rather than hidden.",
      "Voice expansion is bounded, pooled, and monetized through prepaid packs.",
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
