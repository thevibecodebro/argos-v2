import { PlatformSessionsPage } from "@/components/platform/platform-sessions-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getPlatformPageContext,
  serializeOrganization,
  serializeRecentSession,
} from "@/lib/platform/page-context";

export default async function PlatformSessionsRoute() {
  const context = await getPlatformPageContext({
    pathname: "/platform/sessions",
  });
  const [organizations, recentSessions, auditEvents] = await Promise.all([
    context.repository.listOrganizations({ limit: 100 }),
    context.repository.listRecentAccessSessions({ limit: 50 }),
    context.repository.listAuditEvents({ limit: 50 }),
  ]);
  const serializedOrganizations = organizations.map(serializeOrganization);

  return (
    <PlatformShell
      activePath="/platform/sessions"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={serializedOrganizations.length}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformSessionsPage
        activeSession={context.activeSession}
        auditEvents={auditEvents}
        organizations={serializedOrganizations}
        recentSessions={recentSessions.map((session) => serializeRecentSession(session))}
      />
    </PlatformShell>
  );
}
