import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsRubricPage from "../app/(authenticated)/settings/rubric/page";

const {
  createRubricsRepository,
  createUsersRepository,
  getActiveRubric,
  getAuthenticatedSupabaseUser,
  getCurrentUserDetails,
  loadRubricHistory,
  redirectMock,
} = vi.hoisted(() => ({
  createRubricsRepository: vi.fn(),
  createUsersRepository: vi.fn(),
  getActiveRubric: vi.fn(),
  getAuthenticatedSupabaseUser: vi.fn(),
  getCurrentUserDetails: vi.fn(),
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

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/rubrics/create-repository", () => ({
  createRubricsRepository,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails,
}));

vi.mock("@/lib/rubrics/service", () => ({
  getActiveRubric,
  loadRubricHistory,
}));

describe("SettingsRubricPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createUsersRepository.mockReturnValue({});
    createRubricsRepository.mockReturnValue({});
    getCurrentUserDetails.mockResolvedValue({
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
    getCurrentUserDetails.mockResolvedValue({
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
