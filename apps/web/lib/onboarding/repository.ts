import { and, eq, isNull, sql } from "drizzle-orm";
import {
  getDb,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole, type AppUserRole } from "@/lib/users/roles";
import type { OnboardingRepository } from "./service";

class UserClaimConflictError extends Error {
  constructor() {
    super("User was already claimed");
    this.name = "UserClaimConflictError";
  }
}

export class DrizzleOnboardingRepository implements OnboardingRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async assignUserToOrganization(input: {
    orgId: string;
    role: AppUserRole;
    userId: string;
  }) {
    const rows = await this.db
      .update(usersTable)
      .set({
        orgId: input.orgId,
        role: input.role,
        updatedAt: new Date(),
      })
      .where(and(eq(usersTable.id, input.userId), isNull(usersTable.orgId)))
      .returning({ id: usersTable.id });

    return rows.length === 1;
  }

  async createBootstrapOrganizationForUserIfNone(input: {
    name: string;
    plan: string;
    slug: string;
    userId: string;
  }) {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext('argos'), hashtext('bootstrap-organization'))`,
        );

        const [existingOrganization] = await tx
          .select({ id: organizationsTable.id })
          .from(organizationsTable)
          .limit(1);

        if (existingOrganization) {
          return { status: "organization-exists" as const };
        }

        const [organization] = await tx
          .insert(organizationsTable)
          .values({
            name: input.name,
            plan: input.plan,
            slug: input.slug,
          })
          .returning();

        const claimedUsers = await tx
          .update(usersTable)
          .set({
            orgId: organization.id,
            role: "admin",
            updatedAt: new Date(),
          })
          .where(and(eq(usersTable.id, input.userId), isNull(usersTable.orgId)))
          .returning({ id: usersTable.id });

        if (claimedUsers.length !== 1) {
          throw new UserClaimConflictError();
        }

        return { status: "created" as const, organization };
      });
    } catch (error) {
      if (error instanceof UserClaimConflictError) {
        return { status: "user-claimed" as const };
      }

      throw error;
    }
  }

  async createOrganizationForUser(input: {
    name: string;
    plan: string;
    slug: string;
    userId: string;
  }) {
    try {
      return await this.db.transaction(async (tx) => {
        const [organization] = await tx
          .insert(organizationsTable)
          .values({
            name: input.name,
            plan: input.plan,
            slug: input.slug,
          })
          .returning();

        const claimedUsers = await tx
          .update(usersTable)
          .set({
            orgId: organization.id,
            role: "admin",
            updatedAt: new Date(),
          })
          .where(and(eq(usersTable.id, input.userId), isNull(usersTable.orgId)))
          .returning({ id: usersTable.id });

        if (claimedUsers.length !== 1) {
          throw new UserClaimConflictError();
        }

        return { status: "created" as const, organization };
      });
    } catch (error) {
      if (error instanceof UserClaimConflictError) {
        return { status: "user-claimed" as const };
      }

      throw error;
    }
  }

  async createOrganization(input: {
    name: string;
    plan: string;
    slug: string;
  }) {
    const [organization] = await this.db
      .insert(organizationsTable)
      .values(input)
      .returning();

    return organization;
  }

  async findCurrentUserByAuthId(authUserId: string) {
    const [record] = await this.db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        org: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
          plan: organizationsTable.plan,
        },
      })
      .from(usersTable)
      .leftJoin(organizationsTable, eq(usersTable.orgId, organizationsTable.id))
      .where(eq(usersTable.id, authUserId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      email: record.email,
      role: parseAppUserRole(record.role),
      firstName: record.firstName,
      lastName: record.lastName,
      org: record.org?.id
        ? {
            id: record.org.id,
            name: record.org.name,
            slug: record.org.slug,
            plan: record.org.plan,
          }
        : null,
    };
  }

  async findOrganizationBySlug(slug: string) {
    const [organization] = await this.db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .limit(1);

    return organization ?? null;
  }
}
