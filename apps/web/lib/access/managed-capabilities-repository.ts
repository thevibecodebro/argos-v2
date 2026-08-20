import "server-only";

import { and, eq, gt, lte } from "drizzle-orm";
import {
  getDb,
  organizationsTable,
  softwareAccessCapabilitiesTable,
  softwareAccessGrantsTable,
  type ArgosDb,
} from "@argos-v2/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-repository-helpers";
import type {
  ManagedAccessRepository,
  ManagedCapabilityKey,
} from "./managed-capabilities";

export class DrizzleManagedAccessRepository implements ManagedAccessRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async findOrganizationAccessModel(orgId: string) {
    const [organization] = await this.db
      .select({ accessModel: organizationsTable.accessModel })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);

    return organization?.accessModel ?? null;
  }

  async findActiveManagedGrant(orgId: string) {
    const now = new Date();
    const [grant] = await this.db
      .select({
        id: softwareAccessGrantsTable.id,
        version: softwareAccessGrantsTable.version,
      })
      .from(softwareAccessGrantsTable)
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

    if (!grant) return null;

    const rows = await this.db
      .select({ capabilityKey: softwareAccessCapabilitiesTable.capabilityKey })
      .from(softwareAccessCapabilitiesTable)
      .where(
        and(
          eq(softwareAccessCapabilitiesTable.grantId, grant.id),
          eq(softwareAccessCapabilitiesTable.orgId, orgId),
        ),
      );

    return {
      capabilities: rows.map((row) => row.capabilityKey as ManagedCapabilityKey),
      id: grant.id,
      version: grant.version,
    };
  }
}

export class SupabaseManagedAccessRepository implements ManagedAccessRepository {
  constructor(private readonly supabase = getSupabaseAdminClient()) {}

  async findOrganizationAccessModel(orgId: string) {
    const client: any = this.supabase;
    const { data, error } = await client
      .from("organizations")
      .select("access_model")
      .eq("id", orgId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data?.access_model === "legacy" || data?.access_model === "managed"
      ? data.access_model
      : null;
  }

  async findActiveManagedGrant(orgId: string) {
    const client: any = this.supabase;
    const now = new Date().toISOString();
    const { data: grant, error: grantError } = await client
      .from("software_access_grants")
      .select("id, version")
      .eq("org_id", orgId)
      .eq("access_model", "managed_capabilities")
      .eq("status", "active")
      .lte("starts_at", now)
      .gt("ends_at", now)
      .maybeSingle();

    if (grantError) throw new Error(grantError.message);
    if (!grant) return null;

    const { data: capabilityRows, error: capabilityError } = await client
      .from("software_access_capabilities")
      .select("capability_key")
      .eq("grant_id", grant.id)
      .eq("org_id", orgId);

    if (capabilityError) throw new Error(capabilityError.message);

    return {
      capabilities: (capabilityRows ?? []).map(
        (row: { capability_key: ManagedCapabilityKey }) => row.capability_key,
      ),
      id: grant.id as string,
      version: Number(grant.version),
    };
  }
}

export function createManagedAccessRepository(): ManagedAccessRepository {
  return process.env.DATABASE_URL
    ? new DrizzleManagedAccessRepository()
    : new SupabaseManagedAccessRepository();
}
