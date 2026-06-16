import { PlatformDashboardPage } from "@/components/platform/platform-dashboard-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import { parsePlatformDashboardFilters } from "@/lib/platform/dashboard";
import { getPlatformPageContext } from "@/lib/platform/page-context";

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
  const dashboard = await context.repository.getDashboardSnapshot(filters);

  return (
    <PlatformShell
      activePath="/platform/dashboard"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={dashboard.summary.totalOrganizations}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformDashboardPage dashboard={dashboard} />
    </PlatformShell>
  );
}
