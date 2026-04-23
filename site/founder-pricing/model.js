const VERIFIED_AT = "April 23, 2026";
const ANNUAL_DISCOUNT_RATE = 0.1;
const HIGHLEVEL_MONTHLY_COST = 97;

const STRIPE_FEES = {
  cardPercent: 0.029,
  cardFixed: 0.3,
  billingPercent: 0.007,
};

const PLANS = {
  solo: {
    priceMonthly: 79,
    includedVoiceMinutes: 120,
    overageRate: 0.39,
  },
  team: {
    pricePerSeatMonthly: 50,
    seatMinimum: 3,
    includedVoiceMinutesPerSeat: 120,
    overageRate: 0.29,
  },
};

const PACKS = {
  solo: [{ minutes: 250, price: 125, expiresInDays: 90 }],
  team: [
    { minutes: 500, price: 175, expiresInDays: 90 },
    { minutes: 2000, price: 600, expiresInDays: 90 },
  ],
};

const VENDORS = [
  {
    name: "OpenAI",
    category: "AI runtime",
    sourceLabel: "OpenAI pricing",
  },
  {
    name: "Vercel",
    category: "Web hosting",
    sourceLabel: "Vercel pricing",
  },
  {
    name: "Supabase",
    category: "Database and auth",
    sourceLabel: "Supabase pricing",
  },
  {
    name: "Fly.io",
    category: "Realtime and worker infrastructure",
    sourceLabel: "Fly.io pricing",
  },
  {
    name: "HighLevel",
    category: "CRM",
    monthlyCost: HIGHLEVEL_MONTHLY_COST,
    sourceLabel: "HighLevel $97/month",
  },
  {
    name: "Stripe processing",
    category: "Payments",
    percentRate: STRIPE_FEES.cardPercent,
    fixedFee: STRIPE_FEES.cardFixed,
    sourceLabel: "Stripe card 2.9% + $0.30",
  },
  {
    name: "Stripe Billing",
    category: "Subscription billing",
    percentRate: STRIPE_FEES.billingPercent,
    sourceLabel: "Stripe Billing 0.7%",
  },
];

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function discountAnnual(monthlyPrice) {
  return roundCurrency(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_RATE));
}

function cardFee(amount) {
  return roundCurrency(amount * STRIPE_FEES.cardPercent + STRIPE_FEES.cardFixed);
}

function billingFee(amount) {
  return roundCurrency(amount * STRIPE_FEES.billingPercent);
}

function combinedStripeFees(amount) {
  return roundCurrency(cardFee(amount) + billingFee(amount));
}

function packWithDerivedValues(pack) {
  return {
    ...pack,
    pricePerMinute: roundCurrency(pack.price / pack.minutes),
  };
}

function netAfterStripe(amount) {
  return roundCurrency(amount - combinedStripeFees(amount));
}

function marginAfterSoftware(amount, softwareCost) {
  return roundCurrency(netAfterStripe(amount) - softwareCost);
}

const TEAM_MINIMUM_MONTHLY = PLANS.team.pricePerSeatMonthly * PLANS.team.seatMinimum;
const TEAM_MINIMUM_INCLUDED_MINUTES =
  PLANS.team.includedVoiceMinutesPerSeat * PLANS.team.seatMinimum;
const SOLO_ANNUAL = discountAnnual(PLANS.solo.priceMonthly);
const TEAM_MINIMUM_ANNUAL = discountAnnual(TEAM_MINIMUM_MONTHLY);
const SOLO_STRIPE_FEES = combinedStripeFees(PLANS.solo.priceMonthly);
const TEAM_MINIMUM_STRIPE_FEES = combinedStripeFees(TEAM_MINIMUM_MONTHLY);

const founderPricingModel = {
  verifiedAt: VERIFIED_AT,
  annualDiscountRate: ANNUAL_DISCOUNT_RATE,
  stripeFees: STRIPE_FEES,
  plans: PLANS,
  packs: PACKS,
  vendors: VENDORS,
  derived: {
    solo: {
      priceAnnual: SOLO_ANNUAL,
      includedVoiceMinutesAnnual: PLANS.solo.includedVoiceMinutes * 12,
      cardFeeMonthly: cardFee(PLANS.solo.priceMonthly),
      billingFeeMonthly: billingFee(PLANS.solo.priceMonthly),
      totalStripeFeesMonthly: SOLO_STRIPE_FEES,
      pricePerIncludedMinuteMonthly: roundCurrency(
        PLANS.solo.priceMonthly / PLANS.solo.includedVoiceMinutes,
      ),
    },
    team: {
      minimumMonthly: TEAM_MINIMUM_MONTHLY,
      minimumAnnual: TEAM_MINIMUM_ANNUAL,
      minimumIncludedVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES,
      minimumIncludedVoiceMinutesAnnual: TEAM_MINIMUM_INCLUDED_MINUTES * 12,
      minimumCardFeeMonthly: cardFee(TEAM_MINIMUM_MONTHLY),
      minimumBillingFeeMonthly: billingFee(TEAM_MINIMUM_MONTHLY),
      minimumTotalStripeFeesMonthly: TEAM_MINIMUM_STRIPE_FEES,
      pricePerIncludedMinuteMonthly: roundCurrency(
        TEAM_MINIMUM_MONTHLY / TEAM_MINIMUM_INCLUDED_MINUTES,
      ),
    },
    packs: {
      solo: PACKS.solo.map(packWithDerivedValues),
      team: PACKS.team.map(packWithDerivedValues),
    },
    seatEconomicsRows: [
      {
        label: "Solo",
        monthlyRevenue: PLANS.solo.priceMonthly,
        annualRevenue: SOLO_ANNUAL,
        includedVoiceMinutes: PLANS.solo.includedVoiceMinutes,
        overageRate: PLANS.solo.overageRate,
      },
      {
        label: "Team minimum",
        monthlyRevenue: TEAM_MINIMUM_MONTHLY,
        annualRevenue: TEAM_MINIMUM_ANNUAL,
        includedVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES,
        overageRate: PLANS.team.overageRate,
      },
    ],
    marginRows: [
      {
        label: "Solo monthly",
        revenue: PLANS.solo.priceMonthly,
        stripeFees: SOLO_STRIPE_FEES,
        netAfterStripe: netAfterStripe(PLANS.solo.priceMonthly),
      },
      {
        label: "Team minimum monthly",
        revenue: TEAM_MINIMUM_MONTHLY,
        stripeFees: TEAM_MINIMUM_STRIPE_FEES,
        netAfterStripe: netAfterStripe(TEAM_MINIMUM_MONTHLY),
      },
    ],
    voiceSensitivityRows: [
      {
        label: "Solo included",
        voiceMinutes: PLANS.solo.includedVoiceMinutes,
        incrementalRevenue: 0,
      },
      {
        label: "Solo +250 pack",
        voiceMinutes: PLANS.solo.includedVoiceMinutes + PACKS.solo[0].minutes,
        incrementalRevenue: PACKS.solo[0].price,
      },
      {
        label: "Team minimum included",
        voiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES,
        incrementalRevenue: 0,
      },
      {
        label: "Team +500 pack",
        voiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES + PACKS.team[0].minutes,
        incrementalRevenue: PACKS.team[0].price,
      },
    ],
    orgMarginRows: [
      {
        label: "Solo",
        revenue: PLANS.solo.priceMonthly,
        stripeFees: SOLO_STRIPE_FEES,
        softwareCost: HIGHLEVEL_MONTHLY_COST,
        marginAfterSoftware: marginAfterSoftware(
          PLANS.solo.priceMonthly,
          HIGHLEVEL_MONTHLY_COST,
        ),
      },
      {
        label: "Team minimum",
        revenue: TEAM_MINIMUM_MONTHLY,
        stripeFees: TEAM_MINIMUM_STRIPE_FEES,
        softwareCost: HIGHLEVEL_MONTHLY_COST,
        marginAfterSoftware: marginAfterSoftware(
          TEAM_MINIMUM_MONTHLY,
          HIGHLEVEL_MONTHLY_COST,
        ),
      },
    ],
  },
};

module.exports = founderPricingModel;
module.exports.default = founderPricingModel;
