import { notFound } from "next/navigation";
import { PlatformOrganizationDetailPage } from "@/components/platform/platform-organization-detail-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getPlatformPageContext,
  serializeOrganization,
} from "@/lib/platform/page-context";

type PlatformOrganizationDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PlatformOrganizationDetailRoute({
  params,
}: PlatformOrganizationDetailRouteProps) {
  const { slug } = await params;
  const pathname = `/platform/organizations/${slug}`;
  const context = await getPlatformPageContext({
    pathname,
  });
  const [organization, organizations] = await Promise.all([
    context.repository.getOrganizationDetailSnapshot(slug),
    context.repository.listOrganizations({ limit: 100 }),
  ]);

  if (!organization) {
    notFound();
  }
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
      <PlatformOrganizationDetailPage organization={organization} />
    </PlatformShell>
  );
}
