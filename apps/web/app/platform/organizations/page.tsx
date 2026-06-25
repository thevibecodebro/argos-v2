import { PlatformOrganizationsPage } from "@/components/platform/platform-organizations-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getPlatformPageContext,
  serializeOrganization,
} from "@/lib/platform/page-context";

type PlatformOrganizationsRouteProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlatformOrganizationsRoute({
  searchParams,
}: PlatformOrganizationsRouteProps) {
  const context = await getPlatformPageContext({
    pathname: "/platform/organizations",
  });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = firstValue(resolvedSearchParams?.q)?.trim() ?? "";
  const status = parseStatus(firstValue(resolvedSearchParams?.status));
  const organizations = await context.repository.listOrganizations({
    limit: 100,
    query,
    status,
  });
  const serializedOrganizations = organizations.map(serializeOrganization);

  return (
    <PlatformShell
      activePath="/platform/organizations"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={serializedOrganizations.length}
      organizations={serializedOrganizations}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformOrganizationsPage
        activeSession={context.activeSession}
        organizations={serializedOrganizations}
        query={query}
        statusFilter={status}
      />
    </PlatformShell>
  );
}

function parseStatus(value: string | undefined): "active" | "archived" | "all" {
  return value === "archived" || value === "all" ? value : "active";
}
