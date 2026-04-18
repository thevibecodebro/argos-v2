import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthenticatedSupabaseUserMock,
  createCallsRepositoryMock,
  listHighlightsMock,
} = vi.hoisted(() => ({
  getAuthenticatedSupabaseUserMock: vi.fn(),
  createCallsRepositoryMock: vi.fn(),
  listHighlightsMock: vi.fn(),
}));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser: getAuthenticatedSupabaseUserMock,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository: createCallsRepositoryMock,
}));

vi.mock("@/lib/calls/service", () => ({
  listHighlights: listHighlightsMock,
}));

import HighlightsPage from "../app/(authenticated)/highlights/page";

describe("HighlightsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCallsRepositoryMock.mockReturnValue({});
  });

  it("uses the shared highlight note presentation when a note exists", async () => {
    getAuthenticatedSupabaseUserMock.mockResolvedValue({ id: "auth-user-1" });
    listHighlightsMock.mockResolvedValue({
      ok: true,
      data: {
        highlights: [
          {
            id: "moment-1",
            callId: "call-1",
            timestampSeconds: 132,
            category: "Discovery",
            observation: "The rep uncovered a deeper workflow bottleneck.",
            recommendation: "Anchor the next question to the reporting delay.",
            severity: "strength",
            highlightNote: "Use this in the next team coaching review.",
            createdAt: "2026-04-03T00:02:12.000Z",
            callTopic: "ACME discovery",
            callCreatedAt: "2026-04-03T00:00:00.000Z",
            repId: "rep-1",
            repFirstName: "Riley",
            repLastName: "Stone",
          },
        ],
      },
    });

    const html = renderToStaticMarkup(await HighlightsPage());

    expect(html).toContain("Manager note");
    expect(html).toContain("Use this in the next team coaching review.");
  });
});
