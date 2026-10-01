import { describe, expect, it } from "vitest";
import { buildCrossCallFocusRecommendation } from "./cross-call-focus";

const now = new Date("2026-09-28T12:00:00.000Z");

function scoredCall(
  id: string,
  score: number,
  options: { rubricId?: string; daysAgo?: number; buyerProfileStatus?: string; slug?: string } = {},
) {
  return {
    id,
    callTopic: `Call ${id}`,
    createdAt: new Date(now.getTime() - (options.daysAgo ?? 1) * 86_400_000),
    rubricId: options.rubricId ?? "active-rubric",
    buyerProfileStatus: options.buyerProfileStatus ?? "ready",
    categoryScores: [{ slug: options.slug ?? "discovery", name: "Discovery", score }],
  };
}

describe("buildCrossCallFocusRecommendation", () => {
  it("selects a recurring weak skill from comparable recent calls and a ready practice call", () => {
    const recommendation = buildCrossCallFocusRecommendation([
      scoredCall("recent-low", 52, { daysAgo: 1 }),
      scoredCall("older-low", 60, { daysAgo: 3, buyerProfileStatus: "processing" }),
      scoredCall("higher", 76, { daysAgo: 5 }),
      scoredCall("other-rubric", 10, { rubricId: "old-rubric" }),
      scoredCall("too-old", 10, { daysAgo: 45 }),
    ], "active-rubric", now);

    expect(recommendation).toMatchObject({
      categorySlug: "discovery",
      categoryName: "Discovery",
      averageScore: 63,
      scoredCallCount: 3,
      weakCallCount: 2,
      practiceCallId: "recent-low",
    });
    expect(recommendation?.sourceCalls.map((call) => call.id)).toEqual(["recent-low", "older-low"]);
  });

  it("does not recommend a category from one weak call or mismatched rubric versions", () => {
    expect(buildCrossCallFocusRecommendation([
      scoredCall("one-low", 50),
      scoredCall("one-good", 80),
      scoredCall("another-good", 90),
    ], "active-rubric", now)).toBeNull();

    expect(buildCrossCallFocusRecommendation([
      scoredCall("one", 40, { rubricId: "old-rubric" }),
      scoredCall("two", 45, { rubricId: "old-rubric" }),
      scoredCall("three", 50, { rubricId: "old-rubric" }),
    ], "active-rubric", now)).toBeNull();
  });

  it("keeps evidence visible but offers no practice link until a weak call has a ready buyer profile", () => {
    const recommendation = buildCrossCallFocusRecommendation([
      scoredCall("one", 50, { buyerProfileStatus: "processing" }),
      scoredCall("two", 55, { buyerProfileStatus: "needs_review" }),
      scoredCall("three", 72),
    ], "active-rubric", now);

    expect(recommendation?.practiceCallId).toBeNull();
    expect(recommendation?.sourceCalls).toHaveLength(2);
  });
});
