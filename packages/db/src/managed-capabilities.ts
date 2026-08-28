import { and, eq, gt, lte } from "drizzle-orm";
import type { ArgosDb } from "./client";
import {
  organizationsTable,
  softwareAccessCapabilitiesTable,
  softwareAccessGrantsTable,
} from "./schema";

export type ManagedCapabilityKey =
  typeof softwareAccessCapabilitiesTable.$inferSelect.capabilityKey;

export async function findOrganizationAccessModel(
  db: ArgosDb,
  orgId: string,
) {
  const [organization] = await db
    .select({ accessModel: organizationsTable.accessModel })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId))
    .limit(1);

  return organization?.accessModel ?? null;
}

export async function organizationHasManagedCapability(
  db: ArgosDb,
  orgId: string,
  capability: ManagedCapabilityKey,
  now = new Date(),
) {
  const accessModel = await findOrganizationAccessModel(db, orgId);

  if (accessModel !== "managed") {
    return accessModel === "legacy";
  }

  const [grant] = await db
    .select({ id: softwareAccessGrantsTable.id })
    .from(softwareAccessGrantsTable)
    .innerJoin(
      softwareAccessCapabilitiesTable,
      and(
        eq(softwareAccessCapabilitiesTable.grantId, softwareAccessGrantsTable.id),
        eq(softwareAccessCapabilitiesTable.orgId, softwareAccessGrantsTable.orgId),
        eq(softwareAccessCapabilitiesTable.capabilityKey, capability),
      ),
    )
    .where(
      and(
        eq(softwareAccessGrantsTable.orgId, orgId),
        eq(softwareAccessGrantsTable.accessModel, "managed_capabilities"),
        eq(softwareAccessGrantsTable.status, "active"),
        lte(softwareAccessGrantsTable.startsAt, now),
        gt(softwareAccessGrantsTable.endsAt, now),
      ),
    )
    .limit(1);

  return Boolean(grant);
}
