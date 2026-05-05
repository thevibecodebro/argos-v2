import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCachedAuthenticatedSupabaseUserMock,
  getCachedCurrentUserProfileMock,
  createCallsRepositoryMock,
  getCallDetailMock,
  listAnnotationsMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getCachedAuthenticatedSupabaseUserMock: vi.fn(),
  getCachedCurrentUserProfileMock: vi.fn(),
  createCallsRepositoryMock: vi.fn(),
  getCallDetailMock: vi.fn(),
  listAnnotationsMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/components/page-panel-loaders", () => ({
  CallDetailPanel: () => "Call detail panel marker",
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser: getCachedAuthenticatedSupabaseUserMock,
  getCachedCurrentUserProfile: getCachedCurrentUserProfileMock,
}));

vi.mock("@/lib/calls/create-repository", () => ({
  createCallsRepository: createCallsRepositoryMock,
}));

vi.mock("@/lib/calls/service", () => ({
  getCallDetail: getCallDetailMock,
  listAnnotations: listAnnotationsMock,
}));

import CallDetailPage from "../app/(authenticated)/calls/[id]/page";

async function renderRoute(page: Promise<React.ReactElement> | React.ReactElement) {
  return renderToStaticMarkup(await page);
}

describe("CallDetailPage forge treatment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedAuthenticatedSupabaseUserMock.mockResolvedValue({ id: "auth-user-1" });
    getCachedCurrentUserProfileMock.mockResolvedValue({
      email: "coach@example.com",
      fullName: "Avery Coach",
      role: "manager",
    });
    createCallsRepositoryMock.mockReturnValue({});
    getCallDetailMock.mockResolvedValue({
      ok: true,
      data: {
        id: "call-1",
        callTopic: "Pricing review",
        createdAt: "2026-04-01T15:00:00.000Z",
        durationSeconds: 245,
        overallScore: 89,
        status: "complete",
      },
    });
    listAnnotationsMock.mockResolvedValue({
      ok: true,
      data: { annotations: [] },
    });
  });

  it("renders a forge review bench header while preserving call actions", async () => {
    const html = await renderRoute(
      CallDetailPage({ params: Promise.resolve({ id: "call-1" }) }),
    );

    expect(html).toContain('data-call-detail-shell="forge-review-bench"');
    expect(html).toContain('data-operational-workspace="true"');
    expect(html).toContain('data-operational-toolbar="true"');
    expect(html).toContain('data-operational-metric-strip="true"');
    expect(html).toContain('data-operational-preview-drawer="true"');
    expect(html).toContain('href="/calls"');
    expect(html).toContain('href="/highlights"');
    expect(html).toContain("Open Highlights");
    expect(html).not.toContain("Share Insight");
    expect(html).toContain("Call detail panel marker");
    expect(html).toContain("Pricing review");
    expect(html).not.toContain('data-forge-chip="gold">#call-1');
    expect(html).not.toContain("Avery Coach / manager");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
    expect(html).not.toContain("backdrop-blur-md");
    expect(html).not.toContain(">Call Detail<");
  });
});
