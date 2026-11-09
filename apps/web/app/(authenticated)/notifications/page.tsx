import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { NotificationsPanel } from "@/components/panel-loaders/notifications-panel-loader";
import { NotificationsWorkspace } from "@/components/notifications-workspace";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";
import { createNotificationsRepository } from "@/lib/notifications/create-repository";
import { getNotifications } from "@/lib/notifications/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export default async function NotificationsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  const repository = authUser
    ? await createEffectiveTenantRepository(createNotificationsRepository(), authUser.id)
    : null;
  const result = authUser
    ? await getNotifications(repository ?? createNotificationsRepository(), authUser.id)
    : null;
  const notifications = result?.ok ? result.data.notifications : [];
  const unreadCount = result?.ok ? result.data.unreadCount : 0;
  return (
    <AuthenticatedPageContainer>
      <NotificationsWorkspace error={result && !result.ok ? result.error : undefined}>
        <NotificationsPanel
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
      </NotificationsWorkspace>
    </AuthenticatedPageContainer>
  );
}
