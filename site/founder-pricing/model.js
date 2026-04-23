const VERIFIED_AT = "April 23, 2026";
const ANNUAL_DISCOUNT_RATE = 0.1;

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
  { name: "OpenAI", category: "AI runtime" },
  { name: "Vercel", category: "Web hosting" },
  { name: "Supabase", category: "Database and auth" },
  { name: "Fly.io", category: "Realtime and worker infrastructure" },
  { name: "HighLevel", category: "CRM", monthlyCost: 97 },
  { name: "Stripe processing", category: "Payments", percentRate: STRIPE_FEES.cardPercent, fixedFee: STRIPE_FEES.cardFixed },
  { name: "Stripe Billing", category: "Subscription billing", percentRate: STRIPE_FEES.billingPercent },
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

function packWithDerivedValues(pack) {
  return {
    ...pack,
    pricePerMinute: roundCurrency(pack.price / pack.minutes),
  };
}

const TEAM_MINIMUM_MONTHLY = PLANS.team.pricePerSeatMonthly * PLANS.team.seatMinimum;
const TEAM_MINIMUM_INCLUDED_MINUTES =
  PLANS.team.includedVoiceMinutesPerSeat * PLANS.team.seatMinimum;

const founderPricingModel = {
  verifiedAt: VERIFIED_AT,
  annualDiscountRate: ANNUAL_DISCOUNT_RATE,
  stripeFees: STRIPE_FEES,
  plans: PLANS,
  packs: PACKS,
  vendors: VENDORS,
  derived: {
    solo: {
      priceAnnual: discountAnnual(PLANS.solo.priceMonthly),
      includedVoiceMinutesAnnual: PLANS.solo.includedVoiceMinutes * 12,
      cardFeeMonthly: cardFee(PLANS.solo.priceMonthly),
      billingFeeMonthly: billingFee(PLANS.solo.priceMonthly),
      pricePerIncludedMinuteMonthly: roundCurrency(
        PLANS.solo.priceMonthly / PLANS.solo.includedVoiceMinutes,
      ),
    },
    team: {
      minimumMonthly: TEAM_MINIMUM_MONTHLY,
      minimumAnnual: discountAnnual(TEAM_MINIMUM_MONTHLY),
      minimumIncludedVoiceMinutes: TEAM_MINIMUM_INCLUDED_MINUTES,
      minimumIncludedVoiceMinutesAnnual: TEAM_MINIMUM_INCLUDED_MINUTES * 12,
      minimumCardFeeMonthly: cardFee(TEAM_MINIMUM_MONTHLY),
      minimumBillingFeeMonthly: billingFee(TEAM_MINIMUM_MONTHLY),
      pricePerIncludedMinuteMonthly: roundCurrency(
        TEAM_MINIMUM_MONTHLY / TEAM_MINIMUM_INCLUDED_MINUTES,
      ),
    },
    packs: {
      solo: PACKS.solo.map(packWithDerivedValues),
      team: PACKS.team.map(packWithDerivedValues),
    },
  },
};

module.exports = founderPricingModel;
module.exports.default = founderPricingModel;
