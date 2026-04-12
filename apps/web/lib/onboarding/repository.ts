import { eq } from "drizzle-orm";
import {
  getDb,
  organizationsTable,
  usersTable,
  type ArgosDb,
} from "@argos-v2/db";
import { parseAppUserRole, type AppUserRole } from "@/lib/users/roles";
import type { OnboardingRepository } from "./service";

export class DrizzleOnboardingRepository implements OnboardingRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

  async assignUserToOrganization(input: {
    orgId: string;
    role: AppUserRole;
    userId: string;
  }) {
    await this.db
      .update(usersTable)
      .set({
        orgId: input.orgId,
        role: input.role,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, input.userId));
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
