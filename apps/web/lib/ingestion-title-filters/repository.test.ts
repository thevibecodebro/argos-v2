import { describe, expect, it, vi } from "vitest";
import {
  auditEventsTable,
  organizationIngestionTitleFiltersTable,
  organizationsTable,
} from "@argos-v2/db";
import { DrizzleIngestionTitleFiltersRepository } from "./repository";

function createResolvedOrganizationLock() {
  return {
    for: vi.fn().mockResolvedValue([{ id: "org-1" }]),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
}

describe("DrizzleIngestionTitleFiltersRepository", () => {
  it("atomically replaces filters and writes a phrase-free tenant audit event", async () => {
    const organizationLock = createResolvedOrganizationLock();
    const deletion = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const filterInsertion = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    const auditInsertion = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      delete: vi.fn().mockReturnValue(deletion),
      insert: vi
        .fn()
        .mockReturnValueOnce(filterInsertion)
        .mockReturnValueOnce(auditInsertion),
      select: vi.fn().mockReturnValue(organizationLock),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new DrizzleIngestionTitleFiltersRepository(db as never);

    await repository.replaceTitleFilters({
      createdBy: "user-1",
      filters: [
        {
          kind: "include",
          normalizedPhrase: "weekly review",
          phrase: "Weekly Review",
        },
        {
          kind: "exclude",
          normalizedPhrase: "internal",
          phrase: "Internal",
        },
      ],
      orgId: "org-1",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(tx.delete).toHaveBeenCalledTimes(1);
    expect(deletion.where).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(tx.insert).toHaveBeenNthCalledWith(
      1,
      organizationIngestionTitleFiltersTable,
    );
    expect(filterInsertion.values).toHaveBeenCalledWith([
      {
        createdBy: "user-1",
        kind: "include",
        normalizedPhrase: "weekly review",
        orgId: "org-1",
        phrase: "Weekly Review",
      },
      {
        createdBy: "user-1",
        kind: "exclude",
        normalizedPhrase: "internal",
        orgId: "org-1",
        phrase: "Internal",
      },
    ]);
    expect(tx.insert).toHaveBeenNthCalledWith(2, auditEventsTable);
    expect(auditInsertion.values).toHaveBeenCalledWith({
      actorId: "user-1",
      eventType: "ingestion_title_filters_updated",
      metadata: {
        configured: true,
        excludePhraseCount: 1,
        includePhraseCount: 1,
      },
      orgId: "org-1",
      resourceId: "org-1",
      resourceType: "organization",
    });
  });

  it("atomically clears all filters and audits the unconfigured state", async () => {
    const organizationLock = createResolvedOrganizationLock();
    const deletion = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const auditInsertion = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      delete: vi.fn().mockReturnValue(deletion),
      insert: vi.fn().mockReturnValue(auditInsertion),
      select: vi.fn().mockReturnValue(organizationLock),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new DrizzleIngestionTitleFiltersRepository(db as never);

    await repository.replaceTitleFilters({
      createdBy: "user-1",
      filters: [],
      orgId: "org-1",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(deletion.where).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(tx.insert).toHaveBeenCalledWith(auditEventsTable);
    expect(auditInsertion.values).toHaveBeenCalledWith({
      actorId: "user-1",
      eventType: "ingestion_title_filters_updated",
      metadata: {
        configured: false,
        excludePhraseCount: 0,
        includePhraseCount: 0,
      },
      orgId: "org-1",
      resourceId: "org-1",
      resourceType: "organization",
    });
  });

  it("acquires the organization row lock before mutating filters", async () => {
    let releaseLock!: () => void;
    const pendingLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const organizationLock = {
      for: vi.fn().mockReturnValue(pendingLock),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };
    const deletion = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    const auditInsertion = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      delete: vi.fn().mockReturnValue(deletion),
      insert: vi.fn().mockReturnValue(auditInsertion),
      select: vi.fn().mockReturnValue(organizationLock),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new DrizzleIngestionTitleFiltersRepository(db as never);

    const replacement = repository.replaceTitleFilters({
      createdBy: "user-1",
      filters: [],
      orgId: "org-1",
    });

    expect(tx.select).toHaveBeenCalledWith({ id: organizationsTable.id });
    expect(organizationLock.from).toHaveBeenCalledWith(organizationsTable);
    expect(organizationLock.for).toHaveBeenCalledWith("update");
    expect(tx.delete).not.toHaveBeenCalled();

    releaseLock();
    await replacement;

    expect(tx.delete).toHaveBeenCalledTimes(1);
  });

  it("returns canonical filter rows from the requested organization", async () => {
    const rows = [
      { kind: "exclude", phrase: "Internal" },
      { kind: "include", phrase: "Weekly Review" },
    ];
    const query = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(rows),
      where: vi.fn().mockReturnThis(),
    };
    const db = {
      select: vi.fn().mockReturnValue(query),
    };
    const repository = new DrizzleIngestionTitleFiltersRepository(db as never);

    await expect(repository.listTitleFilters("org-1")).resolves.toEqual(rows);
    expect(query.where).toHaveBeenCalledTimes(1);
    expect(query.orderBy).toHaveBeenCalledTimes(1);
  });
});
