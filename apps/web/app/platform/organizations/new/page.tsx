import { PlatformCreateOrganizationPage } from "@/components/platform/platform-create-organization-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getPlatformPageContext,
  serializeOrganization,
} from "@/lib/platform/page-context";

export default async function PlatformCreateOrganizationRoute() {
  const context = await getPlatformPageContext({
    pathname: "/platform/organizations/new",
  });
  const organizations = await context.repository.listOrganizations({ limit: 100 });
  const serializedOrganizations = organizations.map(serializeOrganization);

  return (
    <PlatformShell
      activePath="/platform/organizations/new"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={serializedOrganizations.length}
      organizations={serializedOrganizations}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformCreateOrganizationPage />
    </PlatformShell>
  );
}
