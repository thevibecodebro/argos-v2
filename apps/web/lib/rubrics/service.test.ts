import { describe, expect, it, vi } from "vitest";
import {
  getRubricById,
  loadRubricHistory,
  publishRubric,
  type RubricsRepository,
} from "./service";

function createRepository(
  overrides: Partial<RubricsRepository> = {},
): RubricsRepository {
  return {
    createDraftRubric: vi.fn(),
    findActiveRubricByOrgId: vi.fn(),
    findRubricHistoryByOrgId: vi.fn(),
    findCategoriesByRubricId: vi.fn(),
    findRubricById: vi.fn(),
    publishDraftRubric: vi.fn(),
    ...overrides,
  };
}

describe("getRubricById", () => {
  it("returns the requested historical rubric detail", async () => {
    const repository = createRepository({
      findRubricById: vi.fn().mockResolvedValue({
        id: "rubric-6",
        orgId: "org-1",
        version: 6,
        name: "Revenue Scorecard v6",
        description: "Historical rubric",
        status: "draft",
        isActive: false,
        isTemplate: false,
        createdBy: "user-1",
        createdAt: "2026-04-20T00:00:00.000Z",
        updatedAt: "2026-04-20T00:00:00.000Z",
        categoryCount: 2,
        categories: [],
      }),
    });

    const result = await getRubricById(repository, "org-1", "rubric-6");

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: "rubric-6",
        version: 6,
      }),
    });
  });
});

describe("publishRubric", () => {
  it("returns the published draft and leaves history lookup available", async () => {
    const repository = createRepository({
      publishDraftRubric: vi.fn().mockResolvedValue({
        id: "rubric-7",
        orgId: "org-1",
        version: 7,
        name: "Revenue Scorecard v7",
        description: null,
        status: "active",
        isActive: true,
        isTemplate: false,
        createdBy: "user-1",
        createdAt: "2026-04-22T00:00:00.000Z",
        updatedAt: "2026-04-22T00:00:00.000Z",
        categoryCount: 7,
        categories: [],
      }),
      findRubricHistoryByOrgId: vi.fn().mockResolvedValue([
        {
          id: "rubric-7",
          version: 7,
          name: "Revenue Scorecard v7",
          isActive: true,
          status: "active",
          isTemplate: false,
          orgId: "org-1",
          description: null,
          createdBy: "user-1",
          createdAt: "2026-04-22T00:00:00.000Z",
          updatedAt: "2026-04-22T00:00:00.000Z",
          categoryCount: 7,
        },
        {
          id: "rubric-6",
          version: 6,
          name: "Revenue Scorecard v6",
          isActive: false,
          status: "draft",
          isTemplate: false,
          orgId: "org-1",
          description: null,
          createdBy: "user-1",
          createdAt: "2026-04-20T00:00:00.000Z",
          updatedAt: "2026-04-20T00:00:00.000Z",
          categoryCount: 7,
        },
      ]),
    });

    const publishResult = await publishRubric(repository, {
      orgId: "org-1",
      rubricId: "rubric-7",
      publishedBy: "user-1",
    });
    const history = await loadRubricHistory(repository, "org-1");

    expect(publishResult).toEqual(
      expect.objectContaining({
        id: "rubric-7",
        isActive: true,
      }),
    );
    expect(history).toHaveLength(2);
  });
});
