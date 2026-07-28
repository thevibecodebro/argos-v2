import { describe, expect, it } from "vitest";
import {
  getCoachingVoiceGrantSourceId,
  getCoachingVoicePeriod,
  normalizeStripePackage,
} from "./software-access";

describe("coaching software access periods", () => {
  it("anchors monthly grants to the contract start day and clamps short months", () => {
    const startsAt = new Date("2028-01-31T15:30:00.000Z");
    const endsAt = new Date("2028-06-15T15:30:00.000Z");

    expect(
      getCoachingVoicePeriod(
        startsAt,
        endsAt,
        new Date("2028-03-15T12:00:00.000Z"),
      ),
    ).toEqual({
      periodStart: new Date("2028-02-29T15:30:00.000Z"),
      periodEnd: new Date("2028-03-31T15:30:00.000Z"),
    });
  });

  it("clips the final voice period to the contract end and rejects inactive access", () => {
    const startsAt = new Date("2026-01-10T00:00:00.000Z");
    const endsAt = new Date("2026-03-05T00:00:00.000Z");

    expect(
      getCoachingVoicePeriod(
        startsAt,
        endsAt,
        new Date("2026-03-01T00:00:00.000Z"),
      ),
    ).toEqual({
      periodStart: new Date("2026-02-10T00:00:00.000Z"),
      periodEnd: endsAt,
    });
    expect(getCoachingVoicePeriod(startsAt, endsAt, endsAt)).toBeNull();
  });

  it("creates deterministic grant ids and normalizes Stripe packages", () => {
    expect(
      getCoachingVoiceGrantSourceId(
        "grant-1",
        new Date("2026-07-01T00:00:00.000Z"),
      ),
    ).toBe("coaching:grant-1:2026-07-01T00:00:00.000Z");
    expect(normalizeStripePackage("team-annual")).toBe("team");
    expect(normalizeStripePackage("solo")).toBe("solo");
  });
});
