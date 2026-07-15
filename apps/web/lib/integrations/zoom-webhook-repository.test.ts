import { describe, expect, it, vi } from "vitest";
import { organizationIngestionTitleFiltersTable } from "@argos-v2/db";

const eqSpy = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");

  return {
    ...actual,
    eq: (...args: unknown[]) => {
      eqSpy(...args);
      return { args, operation: "eq" };
    },
  };
});

import { DrizzleZoomWebhookRepository } from "./zoom-webhook-repository";

describe("DrizzleZoomWebhookRepository", () => {
  it("maps title filter rows from the requested tenant and derives configured true", async () => {
    const rows = [
      { kind: "exclude", phrase: "Internal" },
      { kind: "include", phrase: "Weekly Review" },
      { kind: "include", phrase: "Customer Call" },
    ];
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    };
    const db = {
      select: vi.fn().mockReturnValue(query),
    };
    const repository = new DrizzleZoomWebhookRepository(db as never);

    await expect(repository.findIngestionTitleFilterConfig("org-1")).resolves.toEqual({
      configured: true,
      excludePhrases: ["Internal"],
      includePhrases: ["Weekly Review", "Customer Call"],
    });
    expect(db.select).toHaveBeenCalledWith({
      kind: organizationIngestionTitleFiltersTable.kind,
      phrase: organizationIngestionTitleFiltersTable.phrase,
    });
    expect(query.from).toHaveBeenCalledWith(organizationIngestionTitleFiltersTable);
    expect(eqSpy).toHaveBeenCalledWith(
      organizationIngestionTitleFiltersTable.orgId,
      "org-1",
    );
    expect(query.where).toHaveBeenCalledWith({
      args: [organizationIngestionTitleFiltersTable.orgId, "org-1"],
      operation: "eq",
    });
  });

  it("derives configured false when the tenant has no include rows", async () => {
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { kind: "exclude", phrase: "Internal" },
      ]),
    };
    const db = {
      select: vi.fn().mockReturnValue(query),
    };
    const repository = new DrizzleZoomWebhookRepository(db as never);

    await expect(repository.findIngestionTitleFilterConfig("org-2")).resolves.toEqual({
      configured: false,
      excludePhrases: ["Internal"],
      includePhrases: [],
    });
  });
});
