import type { DashboardUserRecord } from "@/lib/dashboard/service";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationRecord = Omit<NotificationItem, "createdAt"> & { createdAt: Date };

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 404; error: string };

export type NotificationsRepository = {
  findCurrentUserByAuthId(authUserId: string): Promise<DashboardUserRecord | null>;
  findNotificationsByUserId(userId: string): Promise<NotificationRecord[]>;
  insertNotification(input: {
    body: string;
    link: string | null;
    title: string;
    type: "call_scored" | "annotation_added" | "module_assigned";
    userId: string;
  }): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  markNotificationRead(notificationId: string, userId: string): Promise<boolean>;
};

function serializeNotification(record: NotificationRecord): NotificationItem {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
  };
}

async function getViewer(
  repository: NotificationsRepository,
  authUserId: string,
): Promise<ServiceResult<DashboardUserRecord>> {
  const viewer = await repository.findCurrentUserByAuthId(authUserId);

  if (!viewer) {
    return {
      ok: false,
      status: 404,
      error: "User is not provisioned in the app database",
    };
  }

  return { ok: true, data: viewer };
}

export async function getNotifications(
  repository: NotificationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ notifications: NotificationItem[]; unreadCount: number }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const notifications = await repository.findNotificationsByUserId(viewerResult.data.id);

  return {
    ok: true,
    data: {
      notifications: notifications.map(serializeNotification),
      unreadCount: notifications.filter((item) => !item.read).length,
    },
  };
}

export async function markNotificationRead(
  repository: NotificationsRepository,
  authUserId: string,
  notificationId: string,
): Promise<ServiceResult<{ success: true }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  const updated = await repository.markNotificationRead(notificationId, viewerResult.data.id);

  if (!updated) {
    return {
      ok: false,
      status: 404,
      error: "Notification not found",
    };
  }

  return { ok: true, data: { success: true } };
}

export async function markAllNotificationsRead(
  repository: NotificationsRepository,
  authUserId: string,
): Promise<ServiceResult<{ success: true }>> {
  const viewerResult = await getViewer(repository, authUserId);

  if (!viewerResult.ok) {
    return viewerResult;
  }

  await repository.markAllNotificationsRead(viewerResult.data.id);

  return { ok: true, data: { success: true } };
}
