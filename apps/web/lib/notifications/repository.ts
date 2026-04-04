import { and, desc, eq } from "drizzle-orm";
import { getDb, notificationsTable, organizationsTable, usersTable, type ArgosDb } from "@argos-v2/db";
import { parseAppUserRole } from "@/lib/users/roles";
import type { NotificationsRepository } from "./service";

export class DrizzleNotificationsRepository implements NotificationsRepository {
  constructor(private readonly db: ArgosDb = getDb()) {}

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
      ...record,
      role: parseAppUserRole(record.role),
    };
  }

  async findNotificationsByUserId(userId: string) {
    return this.db
      .select({
        id: notificationsTable.id,
        type: notificationsTable.type,
        title: notificationsTable.title,
        body: notificationsTable.body,
        link: notificationsTable.link,
        read: notificationsTable.read,
        createdAt: notificationsTable.createdAt,
      })
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
  }

  async insertNotification(input: {
    body: string;
    link: string | null;
    title: string;
    type: "call_scored" | "annotation_added" | "module_assigned";
    userId: string;
  }) {
    await this.db.insert(notificationsTable).values(input);
  }

  async markAllNotificationsRead(userId: string) {
    await this.db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const updated = await this.db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)))
      .returning({ id: notificationsTable.id });

    return updated.length > 0;
  }
}
