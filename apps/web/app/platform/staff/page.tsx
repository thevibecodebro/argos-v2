import { PlatformStaffPage } from "@/components/platform/platform-staff-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getPlatformPageContext,
  serializeOrganization,
  serializeStaffMember,
} from "@/lib/platform/page-context";

export default async function PlatformStaffRoute() {
  const context = await getPlatformPageContext({
    pathname: "/platform/staff",
  });
  const [organizations, platformStaff] = await Promise.all([
    context.repository.listOrganizations({ limit: 100 }),
    context.repository.listStaff(),
  ]);
  const serializedOrganizations = organizations.map(serializeOrganization);

  return (
    <PlatformShell
      activePath="/platform/staff"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={serializedOrganizations.length}
      organizations={serializedOrganizations}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformStaffPage
        currentUserId={context.staff.userId}
        platformStaff={platformStaff.map(serializeStaffMember)}
        staffRole={context.staff.role}
      />
    </PlatformShell>
  );
}
