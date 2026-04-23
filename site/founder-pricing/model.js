const VERIFIED_AT = "April 23, 2026";
const ANNUAL_DISCOUNT_RATE = 0.1;
const MONTHS_PER_YEAR = 12;

const STRIPE_FEES = {
  cardPercent: 0.029,
  cardFixed: 0.3,
  billingPercent: 0.007,
};

const PLANS = {
  solo: {
    label: "Solo",
    priceMonthly: 79,
    includedVoiceMinutes: 120,
    overageRate: 0.39,
  },
  team: {
    label: "Team",
    pricePerSeatMonthly: 50,
    seatMinimum: 3,
    includedVoiceMinutesPerSeat: 120,
    overageRate: 0.29,
  },
};

const SOLO_PACK_250 = { label: "Solo 250", minutes: 250, price: 125, expiresInDays: 90 };
const TEAM_PACK_500 = { label: "Team 500", minutes: 500, price: 175, expiresInDays: 90 };
const TEAM_PACK_2000 = { label: "Team 2000", minutes: 2000, price: 600, expiresInDays: 90 };

const PACKS = {
  solo: [SOLO_PACK_250],
  team: [TEAM_PACK_500, TEAM_PACK_2000],
};

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

function discountAnnual(monthlyPrice) {
  return roundCurrency(monthlyPrice * MONTHS_PER_YEAR * (1 - ANNUAL_DISCOUNT_RATE));
}

function cardFee(amount) {
  return roundCurrency(amount * STRIPE_FEES.cardPercent + STRIPE_FEES.cardFixed);
}

function billingFee(amount) {
  return roundCurrency(amount * STRIPE_FEES.billingPercent);
}

function combinedStripeFees(amount) {
  return roundCurrency(
    amount * (STRIPE_FEES.cardPercent + STRIPE_FEES.billingPercent) + STRIPE_FEES.cardFixed,
  );
}

const USAGE_ASSUMPTIONS = {
  liveVoicePlanningCostPerMinute: 0.08,
  liveVoicePlanningCostSource:
    "Internal conversion from OpenAI GPT-realtime-1.5 audio token pricing; not an official OpenAI per-minute quote.",
  averageScoredCallMinutes: 52.5,
  transcriptionCostPerMinute: 0.006,
  scoringBufferPerCall: 0.01,
  scoredCallsPerSeatMonthly: 4,
  optionalTtsPlaybackCostPerMinute: 0.015,
};

USAGE_ASSUMPTIONS.scoredCallCostPerCall =
  Math.round(
    (USAGE_ASSUMPTIONS.averageScoredCallMinutes *
      USAGE_ASSUMPTIONS.transcriptionCostPerMinute +
      USAGE_ASSUMPTIONS.scoringBufferPerCall) *
      1000,
  ) / 1000;

const SOFTWARE_FLOOR = {
  vercelProMonthly: 20,
  supabaseProMonthly: 25,
  flyWorkerMonthly: 11.83,
  highLevelStarterMonthly: 97,
  resendProMonthly: 20,
  activePayingOrgsBaseCase: 25,
};

SOFTWARE_FLOOR.baseRecurringMonthly = roundCurrency(
  SOFTWARE_FLOOR.vercelProMonthly +
    SOFTWARE_FLOOR.supabaseProMonthly +
    SOFTWARE_FLOOR.flyWorkerMonthly +
    SOFTWARE_FLOOR.highLevelStarterMonthly +
    SOFTWARE_FLOOR.resendProMonthly,
);
SOFTWARE_FLOOR.sharedFloorPerOrgMonthly = roundCurrency(
  SOFTWARE_FLOOR.baseRecurringMonthly / SOFTWARE_FLOOR.activePayingOrgsBaseCase,
);

const VENDORS = [
  {
    name: "OpenAI",
    category: "AI runtime",
    slideText: "Realtime voice, transcription, scoring, and optional TTS",
    rateText:
      "GPT-realtime-1.5 audio $32 / 1M input tokens and $64 / 1M output tokens; gpt-4o-transcribe-diarize ~$0.006 / minute; gpt-5-mini $0.25 / 1M input and $2.00 / 1M output; gpt-4o-mini-tts ~$0.015 / minute",
    planningUse:
      "Live voice modeled at $0.08 / minute internally; scored calls modeled at ~$0.325 per 45-60 minute call.",
    sourceLabel: "openai.com/api/pricing + platform.openai.com/docs/pricing",
  },
  {
    name: "Vercel",
    category: "Web hosting",
    slideText: "Pro $20 / month with 1 deploy seat and $20 usage credit",
    rateText:
      "Pro $20 / month includes 1 deploy seat and $20 usage credit; extra deploy seats $20 / month",
    planningUse:
      "Base model uses one Pro seat and treats over-credit usage as variable, not fixed floor.",
    sourceLabel: "vercel.com/pricing + vercel.com/docs/plans/pro",
  },
  {
    name: "Supabase",
    category: "Database and auth",
    slideText: "Pro $25 / org / month with $10 compute credits",
    rateText:
      "Pro $25 / org / month includes $10 compute credits; one Micro project bills to $25 in the official example",
    planningUse: "Base model assumes one active Pro org with one Micro project.",
    sourceLabel:
      "supabase.com/docs/guides/platform/billing-on-supabase + supabase.com/docs/guides/platform/manage-your-usage/compute",
  },
  {
    name: "Fly.io",
    category: "Worker infrastructure",
    slideText: "Worker planning anchor $11.83 / month for shared-cpu-2x 2GB",
    rateText:
      "shared-cpu-2x with 2GB RAM is $11.83 / month in the published pricing table example",
    planningUse:
      "Current worker is shared / 2 CPUs / 2048 MB; model uses $11.83 / month as the planning anchor.",
    sourceLabel: "fly.io/docs/about/pricing",
  },
  {
    name: "HighLevel",
    category: "CRM software",
    slideText: "Starter $97 / month",
    rateText: "Starter $97 / month",
    planningUse: "Included in the recurring software floor.",
    sourceLabel: "gohighlevel.com/pricing",
  },
  {
    name: "Resend",
    category: "Email delivery",
    slideText: "Pro $20 / month with 50k emails included",
    rateText: "Pro $20 / month includes 50,000 emails; overage is $0.90 / 1,000 emails",
    planningUse: "Included because the current app uses Resend for invites.",
    sourceLabel: "resend.com/pricing",
  },
  {
    name: "Stripe processing",
    category: "Payments",
    slideText: "2.9% + $0.30 per card charge",
    rateText: "2.9% + $0.30 per successful card charge",
    planningUse: "Excluded from product gross margin; shown separately in collected gross margin.",
    sourceLabel: "stripe.com/us/pricing",
  },
  {
    name: "Stripe Billing",
    category: "Subscription billing",
    slideText: "0.7% recurring billing volume",
    rateText: "0.7% of billing volume on pay-as-you-go pricing",
    planningUse: "Excluded from product gross margin; included in collected gross margin.",
    sourceLabel: "stripe.com/us/billing/pricing",
  },
];

function packWithDerivedValues(pack) {
  return {
    ...pack,
    pricePerMinute: roundCurrency(pack.price / pack.minutes),
  };
}

const PACK_CATALOG = {
  solo250: packWithDerivedValues(SOLO_PACK_250),
  team500: packWithDerivedValues(TEAM_PACK_500),
  team2000: packWithDerivedValues(TEAM_PACK_2000),
};

const DERIVED_PACKS = {
  solo: [PACK_CATALOG.solo250],
  team: [PACK_CATALOG.team500, PACK_CATALOG.team2000],
};

function createTable(columns, rows) {
  return { columns, rows };
}

function buildAiRuntimeCost({ seats, totalVoiceMinutes }) {
  return roundCurrency(
    totalVoiceMinutes * USAGE_ASSUMPTIONS.liveVoicePlanningCostPerMinute +
      seats *
        USAGE_ASSUMPTIONS.scoredCallsPerSeatMonthly *
        USAGE_ASSUMPTIONS.scoredCallCostPerCall,
  );
}

function buildScenario({ label, seats, revenueMonthly, totalVoiceMinutes }) {
  const aiRuntimeCost = buildAiRuntimeCost({ seats, totalVoiceMinutes });
  const monthlyStripeFees = combinedStripeFees(revenueMonthly);
  const annualListRevenue = roundCurrency(revenueMonthly * MONTHS_PER_YEAR);
  const annualRevenue = discountAnnual(revenueMonthly);
  const annualStripeFeesAtListVolume = combinedStripeFees(annualListRevenue);
  const annualStripeFees = combinedStripeFees(annualRevenue);
  const annualizedMonthlyStripeFees = roundCurrency(monthlyStripeFees * MONTHS_PER_YEAR);

  return {
    label,
    seats,
    revenueMonthly,
    annualListRevenue,
    annualRevenue,
    totalVoiceMinutes,
    aiRuntimeCost,
    monthlyStripeFees,
    annualStripeFeesAtListVolume,
    annualStripeFees,
    annualizedMonthlyStripeFees,
    annualBillingEfficiencySavings: roundCurrency(
      annualizedMonthlyStripeFees - annualStripeFeesAtListVolume,
    ),
    productGrossMargin: formatPercent(((revenueMonthly - aiRuntimeCost) / revenueMonthly) * 100),
    collectedGrossMargin: formatPercent(
      ((revenueMonthly - aiRuntimeCost - monthlyStripeFees) / revenueMonthly) * 100,
    ),
    productGrossMarginAfterFloor: formatPercent(
      ((revenueMonthly - aiRuntimeCost - SOFTWARE_FLOOR.sharedFloorPerOrgMonthly) /
        revenueMonthly) *
        100,
    ),
    collectedGrossMarginAfterFloor: formatPercent(
      ((revenueMonthly -
        aiRuntimeCost -
        SOFTWARE_FLOOR.sharedFloorPerOrgMonthly -
        monthlyStripeFees) /
        revenueMonthly) *
        100,
    ),
  };
}

const TEAM_MINIMUM_MONTHLY = PLANS.team.pricePerSeatMonthly * PLANS.team.seatMinimum;
const TEAM_MINIMUM_INCLUDED_MINUTES =
  PLANS.team.includedVoiceMinutesPerSeat * PLANS.team.seatMinimum;

const SCENARIOS = {
  solo: buildScenario({
    label: "Solo",
    seats: 1,
    revenueMonthly: PLANS.solo.priceMonthly,
    totalVoiceMinutes: PLANS.solo.includedVoiceMinutes,
  }),
  teamMinimum: buildScenario({
    label: "Team minimum",
    seats: PLANS.team.seatMinimum,
    revenueMonthly: TEAM_MINIMUM_MONTHLY,
    totalVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES,
  }),
  teamTenSeat: buildScenario({
    label: "Team 10-seat",
    seats: 10,
    revenueMonthly: PLANS.team.pricePerSeatMonthly * 10,
    totalVoiceMinutes: PLANS.team.includedVoiceMinutesPerSeat * 10,
  }),
  teamMinimumWithGrowthPack: buildScenario({
    label: "+500 pack",
    seats: PLANS.team.seatMinimum,
    revenueMonthly: TEAM_MINIMUM_MONTHLY + PACK_CATALOG.team500.price,
    totalVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES + PACK_CATALOG.team500.minutes,
  }),
  teamMinimumWithScalePack: buildScenario({
    label: "+2,000 pack",
    seats: PLANS.team.seatMinimum,
    revenueMonthly: TEAM_MINIMUM_MONTHLY + PACK_CATALOG.team2000.price,
    totalVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES + PACK_CATALOG.team2000.minutes,
  }),
};

const vendorRateCardTable = createTable(
  [
    { key: "vendor", label: "Vendor", format: "text" },
    { key: "officialRate", label: "Official rate", format: "text" },
    { key: "planningUse", label: "Planning use", format: "text" },
    { key: "source", label: "Source", format: "text" },
  ],
  VENDORS.map((vendor) => ({
    vendor: vendor.name,
    officialRate: vendor.rateText,
    planningUse: vendor.planningUse,
    source: vendor.sourceLabel,
  })),
);

const formulaTable = createTable(
  [
    { key: "metric", label: "Metric", format: "text" },
    { key: "formula", label: "Formula", format: "text" },
    { key: "output", label: "Output", format: "text" },
  ],
  [
    {
      metric: "Live voice planning cost",
      formula: "Derived internally from GPT-realtime-1.5 token pricing",
      output: "$0.08 / minute",
    },
    {
      metric: "Scored call planning cost",
      formula: "52.5 min × $0.006 transcription + $0.01 GPT-5-mini scoring buffer",
      output: `$${USAGE_ASSUMPTIONS.scoredCallCostPerCall.toFixed(3)} / call`,
    },
    {
      metric: "Shared software floor",
      formula: "$20 Vercel + $25 Supabase + $11.83 Fly + $97 HighLevel + $20 Resend",
      output: `$${SOFTWARE_FLOOR.baseRecurringMonthly.toFixed(2)} / month`,
    },
    {
      metric: "Base-case floor allocation",
      formula: `$${SOFTWARE_FLOOR.baseRecurringMonthly.toFixed(2)} / ${SOFTWARE_FLOOR.activePayingOrgsBaseCase} active paying orgs`,
      output: `$${SOFTWARE_FLOOR.sharedFloorPerOrgMonthly.toFixed(2)} / org / month`,
    },
    {
      metric: "Collected gross margin",
      formula: "Product gross margin minus Stripe processing and Stripe Billing fees",
      output: "Stripe shown separately from product COGS",
    },
    {
      metric: "Internal underwriting rates",
      formula: "Used only for pack sizing and margin guardrails",
      output: `Solo ${PLANS.solo.overageRate.toFixed(2)} / min; Team ${PLANS.team.overageRate.toFixed(2)} / min`,
    },
  ],
);

const annualBillingTable = createTable(
  [
    { key: "label", label: "Scenario", format: "text" },
    { key: "monthlyRevenue", label: "Monthly list", format: "currency" },
    { key: "annualRevenue", label: "Annual prepay", format: "currency" },
    {
      key: "annualizedMonthlyStripeFees",
      label: "Stripe if billed monthly",
      format: "currency",
    },
    {
      key: "annualStripeFeesAtListVolume",
      label: "Stripe once at list volume",
      format: "currency",
    },
    { key: "annualStripeFees", label: "Stripe on annual prepay", format: "currency" },
    {
      key: "annualBillingEfficiencySavings",
      label: "Billing frequency savings",
      format: "currency",
    },
  ],
  [SCENARIOS.solo, SCENARIOS.teamMinimum, SCENARIOS.teamTenSeat].map((scenario) => ({
    label: scenario.label,
    monthlyRevenue: scenario.revenueMonthly,
    annualRevenue: scenario.annualRevenue,
    annualizedMonthlyStripeFees: scenario.annualizedMonthlyStripeFees,
    annualStripeFeesAtListVolume: scenario.annualStripeFeesAtListVolume,
    annualStripeFees: scenario.annualStripeFees,
    annualBillingEfficiencySavings: scenario.annualBillingEfficiencySavings,
  })),
);

const seatEconomicsTable = createTable(
  [
    { key: "label", label: "Scenario", format: "text" },
    { key: "monthlyRevenue", label: "Monthly list", format: "currency" },
    { key: "totalVoiceMinutes", label: "Included voice", format: "number" },
    { key: "aiRuntimeCost", label: "AI/runtime COGS", format: "currency" },
    { key: "productGrossMargin", label: "Product GM", format: "text" },
    { key: "collectedGrossMargin", label: "Collected GM", format: "text" },
  ],
  [SCENARIOS.solo, SCENARIOS.teamMinimum, SCENARIOS.teamTenSeat].map((scenario) => ({
    label: scenario.label,
    monthlyRevenue: scenario.revenueMonthly,
    totalVoiceMinutes: scenario.totalVoiceMinutes,
    aiRuntimeCost: scenario.aiRuntimeCost,
    productGrossMargin: scenario.productGrossMargin,
    collectedGrossMargin: scenario.collectedGrossMargin,
  })),
);

const voiceSensitivityTable = createTable(
  [
    { key: "label", label: "Scenario", format: "text" },
    { key: "monthlyRevenue", label: "Monthly revenue", format: "currency" },
    { key: "totalVoiceMinutes", label: "Total voice minutes", format: "number" },
    { key: "aiRuntimeCost", label: "AI/runtime COGS", format: "currency" },
    { key: "productGrossMargin", label: "Product GM", format: "text" },
    { key: "collectedGrossMargin", label: "Collected GM", format: "text" },
  ],
  [
    {
      label: "Included only",
      monthlyRevenue: SCENARIOS.teamMinimum.revenueMonthly,
      totalVoiceMinutes: SCENARIOS.teamMinimum.totalVoiceMinutes,
      aiRuntimeCost: SCENARIOS.teamMinimum.aiRuntimeCost,
      productGrossMargin: SCENARIOS.teamMinimum.productGrossMargin,
      collectedGrossMargin: SCENARIOS.teamMinimum.collectedGrossMargin,
    },
    {
      label: SCENARIOS.teamMinimumWithGrowthPack.label,
      monthlyRevenue: SCENARIOS.teamMinimumWithGrowthPack.revenueMonthly,
      totalVoiceMinutes: SCENARIOS.teamMinimumWithGrowthPack.totalVoiceMinutes,
      aiRuntimeCost: SCENARIOS.teamMinimumWithGrowthPack.aiRuntimeCost,
      productGrossMargin: SCENARIOS.teamMinimumWithGrowthPack.productGrossMargin,
      collectedGrossMargin: SCENARIOS.teamMinimumWithGrowthPack.collectedGrossMargin,
    },
    {
      label: SCENARIOS.teamMinimumWithScalePack.label,
      monthlyRevenue: SCENARIOS.teamMinimumWithScalePack.revenueMonthly,
      totalVoiceMinutes: SCENARIOS.teamMinimumWithScalePack.totalVoiceMinutes,
      aiRuntimeCost: SCENARIOS.teamMinimumWithScalePack.aiRuntimeCost,
      productGrossMargin: SCENARIOS.teamMinimumWithScalePack.productGrossMargin,
      collectedGrossMargin: SCENARIOS.teamMinimumWithScalePack.collectedGrossMargin,
    },
  ],
);

const orgMarginTable = createTable(
  [
    { key: "label", label: "Scenario", format: "text" },
    { key: "monthlyRevenue", label: "Monthly list", format: "currency" },
    { key: "aiRuntimeCost", label: "AI/runtime COGS", format: "currency" },
    { key: "sharedSoftwareFloor", label: "Shared floor", format: "currency" },
    { key: "productGrossMarginAfterFloor", label: "Product GM after floor", format: "text" },
    {
      key: "collectedGrossMarginAfterFloor",
      label: "Collected GM after floor",
      format: "text",
    },
  ],
  [SCENARIOS.solo, SCENARIOS.teamMinimum, SCENARIOS.teamTenSeat].map((scenario) => ({
    label: scenario.label,
    monthlyRevenue: scenario.revenueMonthly,
    aiRuntimeCost: scenario.aiRuntimeCost,
    sharedSoftwareFloor: SOFTWARE_FLOOR.sharedFloorPerOrgMonthly,
    productGrossMarginAfterFloor: scenario.productGrossMarginAfterFloor,
    collectedGrossMarginAfterFloor: scenario.collectedGrossMarginAfterFloor,
  })),
);

const founderPricingModel = {
  verifiedAt: VERIFIED_AT,
  annualDiscountRate: ANNUAL_DISCOUNT_RATE,
  stripeFees: STRIPE_FEES,
  plans: PLANS,
  packs: PACKS,
  vendors: VENDORS,
  assumptions: {
    usage: USAGE_ASSUMPTIONS,
    softwareFloor: SOFTWARE_FLOOR,
  },
  derived: {
    solo: {
      priceAnnual: SCENARIOS.solo.annualRevenue,
      includedVoiceMinutesAnnual: PLANS.solo.includedVoiceMinutes * MONTHS_PER_YEAR,
      cardFeeMonthly: cardFee(PLANS.solo.priceMonthly),
      billingFeeMonthly: billingFee(PLANS.solo.priceMonthly),
      totalStripeFeesMonthly: SCENARIOS.solo.monthlyStripeFees,
      annualListRevenue: SCENARIOS.solo.annualListRevenue,
      annualizedMonthlyStripeFees: SCENARIOS.solo.annualizedMonthlyStripeFees,
      annualListStripeFee: SCENARIOS.solo.annualStripeFeesAtListVolume,
      annualPrepayStripeFee: SCENARIOS.solo.annualStripeFees,
      annualBillingEfficiencySavings: SCENARIOS.solo.annualBillingEfficiencySavings,
      baseAiRuntimeCost: SCENARIOS.solo.aiRuntimeCost,
      productGrossMargin: SCENARIOS.solo.productGrossMargin,
      collectedGrossMargin: SCENARIOS.solo.collectedGrossMargin,
      productGrossMarginAfterFloor: SCENARIOS.solo.productGrossMarginAfterFloor,
      collectedGrossMarginAfterFloor: SCENARIOS.solo.collectedGrossMarginAfterFloor,
    },
    team: {
      seatAnnual: discountAnnual(PLANS.team.pricePerSeatMonthly),
      minimumMonthly: TEAM_MINIMUM_MONTHLY,
      minimumAnnual: SCENARIOS.teamMinimum.annualRevenue,
      minimumIncludedVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES,
      minimumIncludedVoiceMinutesAnnual: TEAM_MINIMUM_INCLUDED_MINUTES * MONTHS_PER_YEAR,
      minimumCardFeeMonthly: cardFee(TEAM_MINIMUM_MONTHLY),
      minimumBillingFeeMonthly: billingFee(TEAM_MINIMUM_MONTHLY),
      minimumTotalStripeFeesMonthly: SCENARIOS.teamMinimum.monthlyStripeFees,
      annualizedMinimumRevenueAtList: SCENARIOS.teamMinimum.annualListRevenue,
      annualizedMinimumStripeFees: SCENARIOS.teamMinimum.annualizedMonthlyStripeFees,
      annualizedMinimumStripeFeesAtListVolume: SCENARIOS.teamMinimum.annualStripeFeesAtListVolume,
      annualMinimumStripeFees: SCENARIOS.teamMinimum.annualStripeFees,
      annualMinimumBillingEfficiencySavings: SCENARIOS.teamMinimum.annualBillingEfficiencySavings,
      baseAiRuntimeCost: SCENARIOS.teamMinimum.aiRuntimeCost,
      productGrossMargin: SCENARIOS.teamMinimum.productGrossMargin,
      collectedGrossMargin: SCENARIOS.teamMinimum.collectedGrossMargin,
      productGrossMarginAfterFloor: SCENARIOS.teamMinimum.productGrossMarginAfterFloor,
      collectedGrossMarginAfterFloor: SCENARIOS.teamMinimum.collectedGrossMarginAfterFloor,
    },
    packCatalog: PACK_CATALOG,
    packs: DERIVED_PACKS,
    scenarios: SCENARIOS,
    vendorRateCardTable,
    formulaTable,
    annualBillingTable,
    seatEconomicsTable,
    voiceSensitivityTable,
    orgMarginTable,
  },
};

module.exports = founderPricingModel;
module.exports.default = founderPricingModel;
module.exports.roundCurrency = roundCurrency;
module.exports.discountAnnual = discountAnnual;
module.exports.cardFee = cardFee;
module.exports.billingFee = billingFee;
module.exports.combinedStripeFees = combinedStripeFees;
