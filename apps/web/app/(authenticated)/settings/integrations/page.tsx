import { redirect } from "next/navigation";
import { IntegrationsPanel } from "@/components/panel-loaders/integrations-panel-loader";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import { SettingsOperationalLayout } from "../settings-operational-layout";

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
  const connectedCount = [integrations?.zoom.connected, integrations?.ghl.connected].filter(Boolean).length;

  return (
    <SettingsOperationalLayout
      description="Connect and monitor supported providers."
      previewDescription="Provider availability and connection state."
      previewRows={[
        { label: "Connected", value: connectedCount },
        { label: "Zoom", tone: integrations?.zoom.connected ? "success" : "muted", value: integrations?.zoom.connected ? "Connected" : "Not connected" },
        { label: "GoHighLevel", tone: integrations?.ghl.connected ? "success" : "muted", value: integrations?.ghl.connected ? "Connected" : "Not connected" },
        { label: "Available", value: [integrations?.zoom.available, integrations?.ghl.available].filter(Boolean).length },
      ]}
      previewTitle="Integration status"
      route="integrations"
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
            consentConfirmedAt: null,
            defaultRepId: null,
            disconnectPath: "/api/integrations/ghl/disconnect",
            lastSyncCompletedAt: null,
            lastSyncError: null,
            lastSyncStartedAt: null,
            locationId: null,
            locationName: null,
            mappedUsersCount: 0,
            syncEnabled: false,
          }
        }
      />
    </SettingsOperationalLayout>
  );
}
