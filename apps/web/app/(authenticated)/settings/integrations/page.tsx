import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { IntegrationsPanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";

export default async function SettingsIntegrationsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const integrationsResult = await getIntegrationStatuses(
    createIntegrationsRepository(),
    authUser.id,
  );

  const integrations = integrationsResult.ok ? integrationsResult.data : null;

  return (
    <PageFrame
      description="Connect external tools to automate call imports and post-call workflows."
      headerMode="hidden"
      eyebrow="Settings"
      title="Integrations"
    >
      <IntegrationsPanel
        zoom={
          integrations?.zoom ?? {
            available: false,
            connectPath: "/api/integrations/zoom/connect",
            connected: false,
            connectedAt: null,
            disconnectPath: "/api/integrations/zoom/disconnect",
            zoomUserId: null,
          }
        }
        ghl={
          integrations?.ghl ?? {
            available: false,
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
