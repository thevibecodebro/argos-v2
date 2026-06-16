import { PlatformStaffPage } from "@/components/platform/platform-staff-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getPlatformPageContext,
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

  return (
    <PlatformShell
      activePath="/platform/staff"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={organizations.length}
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
