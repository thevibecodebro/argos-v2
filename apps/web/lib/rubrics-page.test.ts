import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsRubricPage from "../app/(authenticated)/settings/rubric/page";
import SettingsRubricBuilderPage from "../app/(authenticated)/settings/rubric/builder/page";

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

vi.mock("@/components/panel-loaders/rubrics-panel-loader", () => ({
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

  it("renders the admin rubric overview inside the operational settings workspace", async () => {
    const html = renderToStaticMarkup(await SettingsRubricPage());

    expect(html).toContain("Active rubric");
    expect(html).toContain("Version history");
    expect(html).toContain(">Rubrics<");
    expect(html).toContain("Configure the scoring rubric used across reviewed calls.");
    expect(html).toContain('href="/settings/rubric/builder"');
    expect(html).not.toContain("Active Rubric Version History");
  });

  it("keeps the full rubric builder on the builder route", async () => {
    const html = renderToStaticMarkup(await SettingsRubricBuilderPage());

    expect(html).toContain("Active Rubric Version History");
    expect(html).toContain('href="/settings/rubric"');
    expect(html).toContain(">Rubric builder<");
    expect(html).toContain('data-secondary-rail="settings"');
    expect(html).not.toContain('data-settings-internal-subnav="true"');
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
