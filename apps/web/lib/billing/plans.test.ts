import { describe, expect, it } from "vitest";
import { billingPlans, getBillingCheckoutHref, getBillingPlan } from "./plans";

describe("billing plans", () => {
  it("exposes Stripe lookup keys for the public Argos pricing model", () => {
    expect(billingPlans.solo.lookupKey).toBe("argos_solo_monthly");
    expect(billingPlans["solo-annual"].lookupKey).toBe("argos_solo_annual");
    expect(billingPlans.team.lookupKey).toBe("argos_paid_seat_monthly");
    expect(billingPlans["team-annual"].lookupKey).toBe("argos_paid_seat_annual");
    expect(billingPlans["extra-250"].lookupKey).toBe("argos_extra_minutes_250");
    expect(billingPlans["extra-500"].lookupKey).toBe("argos_extra_minutes_500");
    expect(billingPlans["extra-2000"].lookupKey).toBe("argos_extra_minutes_2000");
  });

  it("keeps team checkout at the public 3-seat minimum", () => {
    expect(billingPlans.team.defaultQuantity).toBe(3);
    expect(billingPlans.team.adjustableQuantity?.minimum).toBe(3);
    expect(billingPlans["team-annual"].defaultQuantity).toBe(3);
    expect(billingPlans["team-annual"].adjustableQuantity?.minimum).toBe(3);
  });

  it("documents the expected Stripe price amounts and intervals", () => {
    expect(billingPlans.solo.price).toEqual({
      currency: "usd",
      recurring: { interval: "month", intervalCount: 1 },
      unitAmountCents: 7900,
    });
    expect(billingPlans["solo-annual"].price).toEqual({
      currency: "usd",
      recurring: { interval: "year", intervalCount: 1 },
      unitAmountCents: 85320,
    });
    expect(billingPlans.team.price).toEqual({
      currency: "usd",
      recurring: { interval: "month", intervalCount: 1 },
      unitAmountCents: 5000,
    });
    expect(billingPlans["team-annual"].price).toEqual({
      currency: "usd",
      recurring: { interval: "year", intervalCount: 1 },
      unitAmountCents: 54000,
    });
  });

  it("builds stable public checkout links", () => {
    expect(getBillingCheckoutHref("solo")).toBe("/billing/checkout?plan=solo");
    expect(getBillingCheckoutHref("team", { seats: 8 })).toBe(
      "/billing/checkout?plan=team&seats=8",
    );
    expect(getBillingPlan("extra-500")?.lookupKey).toBe("argos_extra_minutes_500");
    expect(getBillingPlan("unknown")).toBeNull();
  });
});
