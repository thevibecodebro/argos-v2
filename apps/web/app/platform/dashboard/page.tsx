import { PlatformDashboardPage } from "@/components/platform/platform-dashboard-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import { parsePlatformDashboardFilters } from "@/lib/platform/dashboard";
import {
  getPlatformPageContext,
  serializeOrganization,
} from "@/lib/platform/page-context";

type PlatformDashboardRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlatformDashboardRoute({
  searchParams,
}: PlatformDashboardRouteProps) {
  const context = await getPlatformPageContext({
    pathname: "/platform/dashboard",
  });
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parsePlatformDashboardFilters(resolvedSearchParams);
  const [dashboard, organizations] = await Promise.all([
    context.repository.getDashboardSnapshot(filters),
    context.repository.listOrganizations({ limit: 100 }),
  ]);
  const serializedOrganizations = organizations.map(serializeOrganization);

  return (
    <PlatformShell
      activePath="/platform/dashboard"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={dashboard.summary.totalOrganizations}
      organizations={serializedOrganizations}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformDashboardPage dashboard={dashboard} />
    </PlatformShell>
  );
}
