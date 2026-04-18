import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getGhlOAuthCapability, getZoomOAuthCapability } from "@/lib/capabilities/service";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationSettingsNotices } from "@/lib/integrations/settings";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

type SettingsIntegrationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsIntegrationsPage({ searchParams }: SettingsIntegrationsPageProps) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const integrationsResult = await getIntegrationStatuses(
    createIntegrationsRepository(),
    authUser.id,
  );

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const notices = getIntegrationSettingsNotices(resolvedSearchParams);
  const integrations = integrationsResult.ok ? integrationsResult.data : null;
  const zoomCapability = getZoomOAuthCapability();
  const ghlCapability = getGhlOAuthCapability();

  return (
    <PageFrame
      description="Connect external tools to automate call imports and post-call workflows."
      eyebrow="Settings"
      title="Integrations"
    >
      {notices.length > 0 ? (
        <div className="mb-6 space-y-3">
          {notices.map((notice) => (
            <section
              className="rounded-[1.25rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
              key={notice}
            >
              {notice}
            </section>
          ))}
        </div>
      ) : null}
      <IntegrationsPanel
        zoom={
          integrations?.zoom ?? {
            available: zoomCapability.available,
            reason: zoomCapability.reason,
            connectPath: "/api/integrations/zoom/connect",
            connected: false,
            connectedAt: null,
            disconnectPath: "/api/integrations/zoom/disconnect",
            zoomUserId: null,
          }
        }
        ghl={
          integrations?.ghl ?? {
            available: ghlCapability.available,
            reason: ghlCapability.reason,
            connectPath: "/api/integrations/ghl/connect",
            connected: false,
            connectedAt: null,
            disconnectPath: "/api/integrations/ghl/disconnect",
            locationId: null,
            locationName: null,
          }
        }
      />
    </PageFrame>
  );
}
