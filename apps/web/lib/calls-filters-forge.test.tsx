import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CallsFilters } from "../app/(authenticated)/calls/calls-filters";

const { replaceMock, useSearchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: useSearchParamsMock,
}));

describe("CallsFilters forge treatment", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("status=processing&sort=overallScore%3Adesc&minScore=70"),
    );
  });

  it("renders a compact operational filter bar without the old blue glass treatment", () => {
    const html = renderToStaticMarkup(
      createElement(CallsFilters, { initialSearch: "pricing" }),
    );

    expect(html).toContain('data-calls-filter-bar="operational"');
    expect(html).toContain('id="status"');
    expect(html).toContain(">Processing</option>");
    expect(html).toContain(">Status</p>");
    expect(html).toContain(">Clear</span>");
    expect(html).not.toContain(">Clear filters</button>");
    expect(html).toContain('placeholder="Search calls, reps, topics..."');
    expect(html).not.toContain('data-forge-action-bar="true"');
    expect(html).not.toContain("Active filters");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("backdrop-blur-md");
    expect(html).not.toContain("border-b-2");
    expect(html).not.toContain(">search</span>");
    expect(html).not.toContain(">filter_list</span>");
  });
});
