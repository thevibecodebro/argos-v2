import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createUsersRepository = vi.fn();
const getCurrentUserDetails = vi.fn();
const updateOrganizationLogo = vi.fn();
const createSupabaseAdminClient = vi.fn();

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository,
}));

vi.mock("@/lib/users/service", () => ({
  getCurrentUserDetails,
  updateOrganizationLogo,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

function currentUser(logoUrl: string | null = null) {
  return {
    id: "auth-user-1",
    email: "jared@example.com",
    firstName: "Jared",
    lastName: "Newman",
    profileImageUrl: null,
    role: "admin",
    orgId: "org-1",
    displayNameSet: true,
    org: {
      id: "org-1",
      name: "Jared Newman's Team",
      slug: "jared-newman",
      plan: "trial",
      logoUrl,
      createdAt: "2026-04-03T00:00:00.000Z",
    },
  };
}

describe("organization logo route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createUsersRepository.mockReset();
    getCurrentUserDetails.mockReset();
    updateOrganizationLogo.mockReset();
    createSupabaseAdminClient.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "auth-user-1" });
    createUsersRepository.mockReturnValue({ repository: true });
    getCurrentUserDetails.mockResolvedValue({ ok: true, data: currentUser() });
  });

  it("uploads a validated org logo and stores the public URL", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://assets.example/org-logos/org-1.png" },
    });
    const bucket = { upload, getPublicUrl };
    createSupabaseAdminClient.mockReturnValue({
      storage: { from: vi.fn().mockReturnValue(bucket) },
    });
    updateOrganizationLogo.mockResolvedValue({
      ok: true,
      data: currentUser("https://assets.example/org-logos/org-1.png"),
    });

    const route = await import("../app/api/organizations/logo/route");
    const formData = new FormData();
    formData.set(
      "logo",
      new File(["logo-bytes"], "team-logo.png", { type: "image/png" }),
    );

    const response = await route.POST(
      new Request("http://localhost:3000/api/organizations/logo", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      org: {
        logoUrl: "https://assets.example/org-logos/org-1.png",
      },
    });
    expect(upload).toHaveBeenCalledWith(
      "org-logos/org-1.png",
      expect.any(File),
      expect.objectContaining({
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      }),
    );
    expect(updateOrganizationLogo).toHaveBeenCalledWith(
      { repository: true },
      "auth-user-1",
      "https://assets.example/org-logos/org-1.png",
    );
  });

  it("rejects unsupported logo file types before storage upload", async () => {
    const upload = vi.fn();
    createSupabaseAdminClient.mockReturnValue({
      storage: { from: vi.fn().mockReturnValue({ upload }) },
    });

    const route = await import("../app/api/organizations/logo/route");
    const formData = new FormData();
    formData.set("logo", new File(["bad"], "logo.txt", { type: "text/plain" }));

    const response = await route.POST(
      new Request("http://localhost:3000/api/organizations/logo", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Upload a PNG, JPG, or WebP logo.",
    });
    expect(upload).not.toHaveBeenCalled();
    expect(updateOrganizationLogo).not.toHaveBeenCalled();
  });

  it("removes the current logo asset and clears the organization logo URL", async () => {
    getCurrentUserDetails.mockResolvedValueOnce({
      ok: true,
      data: currentUser(
        "https://mlluqkmmcfqjmjqoparf.supabase.co/storage/v1/object/public/org-assets/org-logos/org-1.png",
      ),
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createSupabaseAdminClient.mockReturnValue({
      storage: { from: vi.fn().mockReturnValue({ remove }) },
    });
    updateOrganizationLogo.mockResolvedValue({
      ok: true,
      data: currentUser(null),
    });

    const route = await import("../app/api/organizations/logo/route");
    const response = await route.DELETE();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      org: {
        logoUrl: null,
      },
    });
    expect(remove).toHaveBeenCalledWith(["org-logos/org-1.png"]);
    expect(updateOrganizationLogo).toHaveBeenCalledWith(
      { repository: true },
      "auth-user-1",
      null,
    );
  });
});
