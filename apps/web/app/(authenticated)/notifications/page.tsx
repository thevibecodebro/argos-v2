import { AuthenticatedPageContainer } from "@/components/authenticated-page-container";
import { NotificationsPanel } from "@/components/panel-loaders/notifications-panel-loader";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
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
  const selectedNotification = notifications.find((notification) => !notification.read) ?? notifications[0] ?? null;
  const sectionClassName = selectedNotification
    ? "grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
    : "grid min-w-0 gap-3";

  return (
    <AuthenticatedPageContainer>
      <OperationalWorkspace data-notifications-route="account-inbox">
        <OperationalToolbar
          description="Review account activity and open the related record."
          eyebrow="Inbox"
          status={{ icon: "notifications", label: `${unreadCount} unread`, tone: unreadCount > 0 ? "gold" : "muted" }}
          title="Notifications"
        />

        <section className={sectionClassName}>
          <div className="min-w-0">
            <NotificationsPanel
              initialNotifications={notifications}
              initialUnreadCount={unreadCount}
            />
          </div>
          {selectedNotification ? (
            <OperationalPreviewDrawer
              actions={
                selectedNotification.link
                  ? [{ href: selectedNotification.link, label: "Open related record", variant: "primary" }]
                  : undefined
              }
              data-selected-object-drawer="true"
              description={selectedNotification.body}
              eyebrow="Selected notification"
              title={selectedNotification.title}
            >
              <div className="grid gap-2 text-sm">
                <PreviewRow label="Status" value={selectedNotification.read ? "Read" : "Unread"} />
              </div>
            </OperationalPreviewDrawer>
          ) : null}
        </section>
      </OperationalWorkspace>
    </AuthenticatedPageContainer>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] py-2 last:border-b-0">
      <span className="text-[var(--forge-muted)]">{label}</span>
      <span className="font-semibold text-[var(--forge-text)]">{value}</span>
    </div>
  );
}
