import type { ReactNode } from "react";
import { OperationalWorkspace } from "./operational-workspace";
import { WorkspacePageHeader } from "./workspace-page-header";
import { ForgeErrorState } from "./forge";

export function NotificationsWorkspace({ children, error }: { children: ReactNode; error?: string }) {
  return (
    <OperationalWorkspace data-notifications-route="account-inbox">
      <WorkspacePageHeader title="Notifications" description="Your call reviews, coaching notes, and training updates." />
      <section className="min-w-0" aria-label="Notification inbox">
        {error ? <ForgeErrorState title="Notifications unavailable" description={error} /> : children}
      </section>
    </OperationalWorkspace>
  );
}
