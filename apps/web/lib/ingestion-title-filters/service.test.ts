import { describe, expect, it, vi } from "vitest";
import {
  getOrganizationIngestionTitleFilters,
  replaceOrganizationIngestionTitleFilters,
  type IngestionTitleFiltersRepository,
} from "./service";

function createRepository(
  overrides: Partial<IngestionTitleFiltersRepository> = {},
): IngestionTitleFiltersRepository {
  return {
    findCurrentUserByAuthId: vi.fn(),
    listTitleFilters: vi.fn(),
    replaceTitleFilters: vi.fn(),
    ...overrides,
  };
}

const adminUser = {
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
  role: "admin" as const,
};

describe("getOrganizationIngestionTitleFilters", () => {
  it("returns the current organization's canonical filter config to an admin", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      listTitleFilters: vi.fn().mockResolvedValue([
        { kind: "exclude", phrase: "Internal Calibration" },
        { kind: "include", phrase: "Weekly Review" },
        { kind: "include", phrase: "Customer Discovery" },
      ]),
    });

    await expect(
      getOrganizationIngestionTitleFilters(repository, "user-1"),
    ).resolves.toEqual({
      ok: true,
      data: {
        configured: true,
        excludePhrases: ["Internal Calibration"],
        includePhrases: ["Weekly Review", "Customer Discovery"],
      },
    });
    expect(repository.listTitleFilters).toHaveBeenCalledWith("org-1");
  });

  it("returns 403 for a non-admin without reading filters", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        role: "manager",
      }),
    });

    await expect(
      getOrganizationIngestionTitleFilters(repository, "user-1"),
    ).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Only organization admins can manage ingestion title filters",
    });
    expect(repository.listTitleFilters).not.toHaveBeenCalled();
  });

  it("returns a clear result when the user has no organization", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        org: null,
      }),
    });

    await expect(
      getOrganizationIngestionTitleFilters(repository, "user-1"),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "User must be in an organization",
    });
  });
});

describe("replaceOrganizationIngestionTitleFilters", () => {
  it("canonicalizes valid phrases, replaces both lists, and derives configured", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      replaceTitleFilters: vi.fn().mockResolvedValue(undefined),
    });

    const result = await replaceOrganizationIngestionTitleFilters(
      repository,
      "user-1",
      {
        excludePhrases: ["  Internal\t Calibration  "],
        includePhrases: ["  WEEKLY   Review  "],
      },
    );

    expect(result).toEqual({
      ok: true,
      data: {
        configured: true,
        excludePhrases: ["Internal Calibration"],
        includePhrases: ["WEEKLY Review"],
      },
    });
    expect(repository.replaceTitleFilters).toHaveBeenCalledWith({
      createdBy: "user-1",
      filters: [
        {
          kind: "include",
          normalizedPhrase: "weekly review",
          phrase: "WEEKLY Review",
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

  it("derives configured false when the include list is empty", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
      replaceTitleFilters: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", {
        excludePhrases: ["Internal"],
        includePhrases: [],
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { configured: false },
    });
  });

  it.each([
    [{ excludePhrases: [], includePhrases: "Weekly" }],
    [{ excludePhrases: null, includePhrases: [] }],
    [{ includePhrases: [] }],
    [null],
  ])("requires both phrase fields to be arrays", async (input) => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", input),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "includePhrases and excludePhrases must be arrays",
    });
    expect(repository.replaceTitleFilters).not.toHaveBeenCalled();
  });

  it("rejects more than 50 phrases in either list", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", {
        excludePhrases: [],
        includePhrases: Array.from({ length: 51 }, (_, index) => `Phrase ${index}`),
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "includePhrases cannot contain more than 50 phrases",
    });
  });

  it.each([
    ["blank", ["   "]],
    ["non-string", [42]],
    ["over 80 characters", ["x".repeat(81)]],
  ])("rejects %s phrases", async (_label, includePhrases) => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", {
        excludePhrases: [],
        includePhrases,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "Each includePhrases phrase must be a string from 1 to 80 characters",
    });
  });

  it("rejects normalized duplicates within a list", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", {
        excludePhrases: [],
        includePhrases: ["Weekly Review", "  ＷＥＥＫＬＹ\tREVIEW "],
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "includePhrases contains normalized duplicates",
    });
  });

  it("rejects normalized overlaps across include and exclude lists", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue(adminUser),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", {
        excludePhrases: [" weekly\t review "],
        includePhrases: ["Weekly Review"],
      }),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: "A phrase cannot appear in both includePhrases and excludePhrases",
    });
  });

  it("returns 403 for a non-admin without replacing filters", async () => {
    const repository = createRepository({
      findCurrentUserByAuthId: vi.fn().mockResolvedValue({
        ...adminUser,
        role: "manager",
      }),
    });

    await expect(
      replaceOrganizationIngestionTitleFilters(repository, "user-1", {
        excludePhrases: [],
        includePhrases: [],
      }),
    ).resolves.toMatchObject({ ok: false, status: 403 });
    expect(repository.replaceTitleFilters).not.toHaveBeenCalled();
  });
});
