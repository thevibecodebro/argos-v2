import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsRubricPage from "../app/(authenticated)/settings/rubric/page";

const {
  createRubricsRepository,
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
  getActiveRubric,
  loadRubricHistory,
  redirectMock,
} = vi.hoisted(() => ({
  createRubricsRepository: vi.fn(),
  getCachedAuthenticatedSupabaseUser: vi.fn(),
  getCachedCurrentUserDetails: vi.fn(),
  getActiveRubric: vi.fn(),
  loadRubricHistory: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/page-panel-loaders", () => ({
  RubricsPanel: () => "Active Rubric Version History",
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
}));

vi.mock("@/lib/rubrics/create-repository", () => ({
  createRubricsRepository,
}));

vi.mock("@/lib/rubrics/service", () => ({
  getActiveRubric,
  loadRubricHistory,
}));

describe("SettingsRubricPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createRubricsRepository.mockReturnValue({});
    getCachedCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        email: "user@example.com",
        firstName: "Morgan",
        lastName: "Lane",
        profileImageUrl: null,
        role: "admin",
        orgId: "org-1",
        displayNameSet: true,
        org: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: "2026-04-22T00:00:00.000Z",
        },
      },
    });
    getActiveRubric.mockResolvedValue({
      ok: true,
      data: {
        id: "rubric-4",
        orgId: "org-1",
        version: 4,
        name: "Revenue Scorecard v4",
        description: "Current production rubric",
        status: "active",
        isActive: true,
        isTemplate: false,
        createdBy: "user-1",
        createdAt: "2026-04-21T00:00:00.000Z",
        updatedAt: "2026-04-21T00:00:00.000Z",
        categoryCount: 2,
        categories: [],
      },
    });
    loadRubricHistory.mockResolvedValue([]);
  });

  it("renders the admin rubrics settings workflow inside a hidden PageFrame header", async () => {
    const html = renderToStaticMarkup(await SettingsRubricPage());

    expect(html).toContain("Active Rubric");
    expect(html).toContain("Version History");
    expect(html).not.toContain(">Rubrics<");
  });

  it("redirects non-admin users back to settings", async () => {
    getCachedCurrentUserDetails.mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        email: "user@example.com",
        firstName: "Morgan",
        lastName: "Lane",
        profileImageUrl: null,
        role: "manager",
        orgId: "org-1",
        displayNameSet: true,
        org: {
          id: "org-1",
          name: "Argos",
          slug: "argos",
          plan: "trial",
          createdAt: "2026-04-22T00:00:00.000Z",
        },
      },
    });

    await expect(SettingsRubricPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/settings");
  });
});
