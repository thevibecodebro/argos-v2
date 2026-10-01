import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CrossCallFocusCard } from "@/components/cross-call-focus-card";

const recommendation = {
  categorySlug: "discovery",
  categoryName: "Discovery",
  averageScore: 63,
  scoredCallCount: 3,
  weakCallCount: 2,
  practiceCallId: "call-1",
  sourceCalls: [
    { id: "call-1", callTopic: "Discovery with Maya", createdAt: "2026-09-25T12:00:00.000Z", score: 52 },
    { id: "call-2", callTopic: "Discovery with Lee", createdAt: "2026-09-24T12:00:00.000Z", score: 60 },
  ],
};

describe("CrossCallFocusCard", () => {
  it("shows the evidence and a preselected roleplay link when practice is available", () => {
    const html = renderToStaticMarkup(<CrossCallFocusCard recommendation={recommendation} canPractice />);

    expect(html).toContain("Practice focus");
    expect(html).toContain("Discovery");
    expect(html).toContain("Discovery with Maya");
    expect(html).toContain("2 of 3");
    expect(html).toContain("confirm the rubric fits each conversation");
    expect(html).toContain("/calls/call-1?focus=discovery");
  });

  it("offers review without promising practice when the capability is unavailable", () => {
    const html = renderToStaticMarkup(<CrossCallFocusCard recommendation={recommendation} canPractice={false} />);

    expect(html).toContain("Review source call");
    expect(html).not.toContain("?focus=discovery");
  });
});
