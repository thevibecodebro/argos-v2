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

const soloPack = model.derived.packs.solo[0];
const teamGrowthPack = model.derived.packs.team[0];
const teamScalePack = model.derived.packs.team[1];
const slides = [
  {
    id: "cover",
    title: "Founder Pricing & COGS",
    summary:
      "A two-plan pricing system built around predictable subscription revenue and explicit voice expansion levers.",
    bullets: [
      `Verified against the approved assumption set on ${model.verifiedAt}.`,
      "Deck structure is now driven by a canonical pricing model rather than ad hoc facts and memo sections.",
    ],
  },
  {
    id: "pricing-architecture",
    title: "Pricing Architecture",
    summary:
      "Argos keeps the menu simple: a solo subscription for individual operators and a team subscription with a hard seat floor.",
    bullets: [
      `Solo is ${money(model.plans.solo.priceMonthly)} per month with ${model.plans.solo.includedVoiceMinutes} included voice minutes.`,
      `Team is ${money(model.plans.team.pricePerSeatMonthly)} per seat per month with a ${model.plans.team.seatMinimum}-seat minimum.`,
      `Annual billing carries a ${percent(model.annualDiscountRate)} discount across both plans.`,
    ],
  },
  {
    id: "included-usage",
    title: "Included Usage Guardrails",
    summary:
      "Included minutes define the baseline value envelope and make overage policy legible to investors and operators.",
    bullets: [
      `Solo includes ${model.plans.solo.includedVoiceMinutes} voice minutes each month before internal overage billing starts at ${money(model.plans.solo.overageRate)}/minute.`,
      `Team includes ${model.plans.team.includedVoiceMinutesPerSeat} voice minutes per seat, or ${model.derived.team.minimumIncludedVoiceMinutes} minutes per month at the 3-seat floor.`,
      "Voice packs extend usage without changing the core subscription architecture.",
    ],
  },
  {
    id: "vendor-cost-stack",
    title: "Vendor Cost Stack",
    summary:
      "The operating stack is intentionally narrow and named directly so the model can be audited without hidden infrastructure assumptions.",
    bullets: model.vendors.map((vendor) =>
      vendor.monthlyCost
        ? `${vendor.name}: ${money(vendor.monthlyCost)}/month base subscription`
        : vendor.percentRate
          ? `${vendor.name}: ${percent(vendor.percentRate)}${vendor.fixedFee ? ` + ${money(vendor.fixedFee)}` : ""}`
          : vendor.name,
    ),
  },
  {
    id: "solo-unit-economics",
    title: "Solo Unit Economics",
    summary:
      "The solo plan is priced for easy founder adoption while preserving room for software and payment overhead.",
    bullets: [
      `Monthly gross revenue per solo customer is ${money(model.plans.solo.priceMonthly)}.`,
      `Annual prepay lands at ${money(model.derived.solo.priceAnnual)} after discount.`,
      `Stripe processing on the monthly solo charge is ${money(model.derived.solo.cardFeeMonthly)} plus ${money(model.derived.solo.billingFeeMonthly)} for Stripe Billing.`,
    ],
  },
  {
    id: "team-unit-economics",
    title: "Team Minimum Economics",
    summary:
      "The 3-seat floor does most of the margin protection work because it locks in baseline revenue and baseline included usage.",
    bullets: [
      `Minimum team MRR is ${money(model.derived.team.minimumMonthly)} at ${model.plans.team.seatMinimum} seats.`,
      `Minimum annual team contract value is ${money(model.derived.team.minimumAnnual)} after discount.`,
      `Minimum monthly payment overhead is ${money(model.derived.team.minimumCardFeeMonthly)} for card processing and ${money(model.derived.team.minimumBillingFeeMonthly)} for billing.`,
    ],
  },
  {
    id: "annual-vs-monthly",
    title: "Annual vs Monthly",
    summary:
      "Annual billing trades a modest discount for stronger cash collection and lower churn risk on the first cohorts.",
    bullets: [
      `Solo monthly vs annual: ${money(model.plans.solo.priceMonthly)} monthly or ${money(model.derived.solo.priceAnnual)} annual.`,
      `Team floor monthly vs annual: ${money(model.derived.team.minimumMonthly)} monthly or ${money(model.derived.team.minimumAnnual)} annual.`,
      "The annual discount is a packaging incentive, not a separate pricing tier.",
    ],
  },
  {
    id: "voice-expansion-packs",
    title: "Voice Expansion Packs",
    summary:
      "Expansion packs absorb usage spikes without forcing a plan migration and create a second monetization lane for heavy voice accounts.",
    bullets: [
      `Solo pack: ${soloPack.minutes} minutes for ${money(soloPack.price)} valid for ${soloPack.expiresInDays} days.`,
      `Team growth pack: ${teamGrowthPack.minutes} minutes for ${money(teamGrowthPack.price)} valid for ${teamGrowthPack.expiresInDays} days.`,
      `Team scale pack: ${teamScalePack.minutes} minutes for ${money(teamScalePack.price)} valid for ${teamScalePack.expiresInDays} days.`,
    ],
  },
  {
    id: "founder-close",
    title: "Founder Close",
    summary:
      "The recommended investor story is disciplined packaging, transparent payment economics, and a clean voice monetization rule.",
    bullets: [
      "Keep the initial deck centered on the two-plan architecture rather than proliferating packages.",
      "Use the appendix to show that every number comes from a single canonical pricing model.",
    ],
  },
];
const appendix = [
  {
    id: "appendix-rate-card",
    title: "Appendix: Rate Card",
    summary: "Approved founder pricing assumptions with direct rates and plan boundaries.",
    sections: [
      {
        label: "Subscriptions",
        items: [
          `Solo: ${money(model.plans.solo.priceMonthly)}/month`,
          `Team: ${money(model.plans.team.pricePerSeatMonthly)}/seat/month, ${model.plans.team.seatMinimum}-seat minimum`,
          `Annual discount: ${percent(model.annualDiscountRate)}`,
        ],
      },
      {
        label: "Included minutes and overages",
        items: [
          `Solo included minutes: ${model.plans.solo.includedVoiceMinutes}`,
          `Team included minutes per seat: ${model.plans.team.includedVoiceMinutesPerSeat}`,
          `Internal overage rates: solo ${money(model.plans.solo.overageRate)}/minute, team ${money(model.plans.team.overageRate)}/minute`,
        ],
      },
      {
        label: "Expansion packs",
        items: [
          `Solo: ${soloPack.minutes} / ${money(soloPack.price)} / ${soloPack.expiresInDays} days`,
          `Team: ${teamGrowthPack.minutes} / ${money(teamGrowthPack.price)} / ${teamGrowthPack.expiresInDays} days`,
          `Team: ${teamScalePack.minutes} / ${money(teamScalePack.price)} / ${teamScalePack.expiresInDays} days`,
        ],
      },
    ],
  },
  {
    id: "appendix-formulas",
    title: "Appendix: Formulas",
    summary: "Derived values used across the deck so later renderer work can stay declarative.",
    sections: [
      {
        label: "Subscription formulas",
        items: [
          `Solo annual = ${money(model.plans.solo.priceMonthly)} × 12 × (1 - ${model.annualDiscountRate}) = ${money(model.derived.solo.priceAnnual)}`,
          `Team annual floor = ${money(model.derived.team.minimumMonthly)} × 12 × (1 - ${model.annualDiscountRate}) = ${money(model.derived.team.minimumAnnual)}`,
          `Team included minutes floor = ${model.plans.team.includedVoiceMinutesPerSeat} × ${model.plans.team.seatMinimum} = ${model.derived.team.minimumIncludedVoiceMinutes}`,
        ],
      },
      {
        label: "Payment formulas",
        items: [
          `Stripe card fee = gross × ${model.stripeFees.cardPercent} + ${money(model.stripeFees.cardFixed)}`,
          `Stripe Billing fee = gross × ${model.stripeFees.billingPercent}`,
          `Team floor billing overhead = ${money(model.derived.team.minimumCardFeeMonthly)} card + ${money(model.derived.team.minimumBillingFeeMonthly)} billing per month`,
        ],
      },
    ],
  },
];

const founderPricingContent = {
  meta: {
    title: "Founder Pricing & COGS",
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
  appendix: [
    ...appendix,
    {
      id: "appendix-seat-economics",
      title: "Appendix: Seat Economics",
      summary: "Direct comparison rows for solo versus minimum-team packaging.",
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
      summary: "Render-ready rows for Stripe overhead and simple org margin framing.",
      sections: [
        {
          label: "Margin rows",
          table: model.derived.marginTable,
        },
        {
          label: "Org margin rows",
          table: model.derived.orgMarginTable,
        },
      ],
    },
    {
      id: "appendix-voice-sensitivity",
      title: "Appendix: Voice Sensitivity",
      summary: "Usage expansion cases for included minutes and add-on packs.",
      sections: [
        {
          label: "Voice sensitivity rows",
          table: model.derived.voiceSensitivityTable,
        },
      ],
    },
  ],
};

module.exports = founderPricingContent;
module.exports.default = founderPricingContent;
