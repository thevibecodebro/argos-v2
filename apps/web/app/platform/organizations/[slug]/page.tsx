import { notFound } from "next/navigation";
import { PlatformOrganizationDetailPage } from "@/components/platform/platform-organization-detail-page";
import { PlatformShell } from "@/components/platform/platform-shell";
import { getPlatformPageContext } from "@/lib/platform/page-context";

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
  const organization = await context.repository.getOrganizationDetailSnapshot(slug);

  if (!organization) {
    notFound();
  }

  return (
    <PlatformShell
      activePath="/platform/organizations"
      activeSession={context.activeSession}
      currentUserEmail={context.currentUserEmail}
      organizationCount={1}
      staffRole={context.staff.role}
      staffStatus={context.staff.status}
    >
      <PlatformOrganizationDetailPage organization={organization} />
    </PlatformShell>
  );
}
