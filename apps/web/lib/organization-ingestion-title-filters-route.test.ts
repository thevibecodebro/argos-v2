import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedSupabaseUser = vi.fn();
const createIngestionTitleFiltersRepository = vi.fn();
const createEffectiveTenantRepository = vi.fn();
const createPlatformRepository = vi.fn();
const getPlatformMutationAuditContext = vi.fn();
const auditPlatformWorkspaceMutation = vi.fn();
const cookies = vi.fn();

vi.mock("next/headers", () => ({ cookies }));

vi.mock("@/lib/auth/get-authenticated-user", () => ({
  getAuthenticatedSupabaseUser,
}));

vi.mock("@/lib/ingestion-title-filters/create-repository", () => ({
  createIngestionTitleFiltersRepository,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantRepository,
}));

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/audit", () => ({
  auditPlatformWorkspaceMutation,
  getPlatformMutationAuditContext,
}));

function user(role: "admin" | "manager" = "admin") {
  return {
    email: "admin@argos.test",
    firstName: "Admin",
    id: "user-1",
    lastName: "User",
    org: {
      id: "org-1",
      name: "Argos",
      plan: "trial",
      slug: "argos",
    },
    role,
  };
}

describe("organization ingestion title filters route", () => {
  const rawRepository = { name: "raw-repository" };
  const platformRepository = { name: "platform-repository" };
  const effectiveRepository = {
    findCurrentUserByAuthId: vi.fn(),
    listTitleFilters: vi.fn(),
    replaceTitleFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAuthenticatedSupabaseUser.mockReset();
    createIngestionTitleFiltersRepository.mockReset();
    createEffectiveTenantRepository.mockReset();
    createPlatformRepository.mockReset();
    getPlatformMutationAuditContext.mockReset();
    auditPlatformWorkspaceMutation.mockReset();
    cookies.mockReset();
    effectiveRepository.findCurrentUserByAuthId.mockReset();
    effectiveRepository.listTitleFilters.mockReset();
    effectiveRepository.replaceTitleFilters.mockReset();

    getAuthenticatedSupabaseUser.mockResolvedValue({ id: "user-1" });
    createIngestionTitleFiltersRepository.mockReturnValue(rawRepository);
    createEffectiveTenantRepository.mockResolvedValue(effectiveRepository);
    createPlatformRepository.mockReturnValue(platformRepository);
    getPlatformMutationAuditContext.mockResolvedValue({ sessionId: "session-1" });
    auditPlatformWorkspaceMutation.mockResolvedValue(undefined);
    cookies.mockResolvedValue(new Map());
    effectiveRepository.findCurrentUserByAuthId.mockResolvedValue(user());
    effectiveRepository.listTitleFilters.mockResolvedValue([]);
    effectiveRepository.replaceTitleFilters.mockResolvedValue(undefined);
  });

  it("returns the existing unauthorized response without creating a repository", async () => {
    getAuthenticatedSupabaseUser.mockResolvedValueOnce(null);

    const route = await import(
      "../app/api/organizations/ingestion-title-filters/route"
    );
    const response = await route.GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(createIngestionTitleFiltersRepository).not.toHaveBeenCalled();
  });

  it("returns 403 when a non-admin attempts to replace filters", async () => {
    effectiveRepository.findCurrentUserByAuthId.mockResolvedValueOnce(user("manager"));

    const route = await import(
      "../app/api/organizations/ingestion-title-filters/route"
    );
    const response = await route.PUT(
      new Request("http://localhost:3000/api/organizations/ingestion-title-filters", {
        body: JSON.stringify({ excludePhrases: [], includePhrases: [] }),
        method: "PUT",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only organization admins can manage ingestion title filters",
    });
    expect(effectiveRepository.replaceTitleFilters).not.toHaveBeenCalled();
    expect(auditPlatformWorkspaceMutation).not.toHaveBeenCalled();
  });

  it("returns the canonical GET config through the effective tenant repository", async () => {
    effectiveRepository.listTitleFilters.mockResolvedValueOnce([
      { kind: "exclude", phrase: "Internal" },
      { kind: "include", phrase: "Weekly Review" },
    ]);

    const route = await import(
      "../app/api/organizations/ingestion-title-filters/route"
    );
    const response = await route.GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      configured: true,
      excludePhrases: ["Internal"],
      includePhrases: ["Weekly Review"],
    });
    expect(createEffectiveTenantRepository).toHaveBeenCalledWith(
      rawRepository,
      "user-1",
    );
    expect(effectiveRepository.listTitleFilters).toHaveBeenCalledWith("org-1");
  });

  it("returns PUT validation errors without replacing or auditing", async () => {
    const route = await import(
      "../app/api/organizations/ingestion-title-filters/route"
    );
    const response = await route.PUT(
      new Request("http://localhost:3000/api/organizations/ingestion-title-filters", {
        body: JSON.stringify({ excludePhrases: [], includePhrases: "Weekly Review" }),
        method: "PUT",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "includePhrases and excludePhrases must be arrays",
    });
    expect(effectiveRepository.replaceTitleFilters).not.toHaveBeenCalled();
    expect(auditPlatformWorkspaceMutation).not.toHaveBeenCalled();
  });

  it("passes a successful PUT through the canonical atomic replacement contract", async () => {
    const route = await import(
      "../app/api/organizations/ingestion-title-filters/route"
    );
    const response = await route.PUT(
      new Request("http://localhost:3000/api/organizations/ingestion-title-filters", {
        body: JSON.stringify({
          excludePhrases: [" Internal  Calibration "],
          includePhrases: [" Weekly\tReview "],
        }),
        method: "PUT",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      configured: true,
      excludePhrases: ["Internal Calibration"],
      includePhrases: ["Weekly Review"],
    });
    expect(effectiveRepository.replaceTitleFilters).toHaveBeenCalledWith({
      createdBy: "user-1",
      filters: [
        {
          kind: "include",
          normalizedPhrase: "weekly review",
          phrase: "Weekly Review",
        },
        {
          kind: "exclude",
          normalizedPhrase: "internal calibration",
          phrase: "Internal Calibration",
        },
      ],
      orgId: "org-1",
    });
  });

  it("audits a successful platform mutation using counts without raw phrases", async () => {
    const route = await import(
      "../app/api/organizations/ingestion-title-filters/route"
    );
    const response = await route.PUT(
      new Request("http://localhost:3000/api/organizations/ingestion-title-filters", {
        body: JSON.stringify({
          excludePhrases: ["Sensitive Exclusion"],
          includePhrases: ["Sensitive Inclusion"],
        }),
        method: "PUT",
      }),
    );

    expect(response.status).toBe(200);
    expect(getPlatformMutationAuditContext).toHaveBeenCalledWith(
      platformRepository,
      {
        authUserId: "user-1",
        cookies: expect.any(Map),
      },
    );
    expect(auditPlatformWorkspaceMutation).toHaveBeenCalledWith(
      platformRepository,
      { sessionId: "session-1" },
      {
        action: "platform.workspace.ingestion_title_filters.update",
        metadata: {
          configured: true,
          excludePhraseCount: 1,
          includePhraseCount: 1,
          route: "/api/organizations/ingestion-title-filters",
        },
        resourceType: "organization_ingestion_title_filters",
      },
    );

    const auditEvent = auditPlatformWorkspaceMutation.mock.calls[0]?.[2];
    expect(JSON.stringify(auditEvent?.metadata)).not.toContain("Sensitive Inclusion");
    expect(JSON.stringify(auditEvent?.metadata)).not.toContain("Sensitive Exclusion");
  });
});
