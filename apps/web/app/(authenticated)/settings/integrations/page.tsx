import { loadSettingsRailItems } from "../settings-navigation-data";
import { redirect } from "next/navigation";
import { IntegrationsPanel } from "@/components/panel-loaders/integrations-panel-loader";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createIngestionTitleFiltersRepository } from "@/lib/ingestion-title-filters/create-repository";
import { getOrganizationIngestionTitleFilters } from "@/lib/ingestion-title-filters/service";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import {
  createEffectiveTenantRepository,
  createEffectiveTenantUsersRepository,
} from "@/lib/platform/effective-request";
import { createUsersRepository } from "@/lib/users/create-repository";
import { listOrganizationMembers } from "@/lib/users/service";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";
import { requireAnyManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function SettingsIntegrationsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");
  const { access } = await requireAnyManagedCapabilityForPage(authUser.id, [
    "integration_google_meet",
    "integration_ghl",
    "integration_zoom",
  ]);
  const canUseGoogleMeet = hasManagedCapability(access, "integration_google_meet");
  const canUseGhl = hasManagedCapability(access, "integration_ghl");
  const canUseZoom = hasManagedCapability(access, "integration_zoom");

  const usersRepository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUser.id,
  );
  const integrationsRepository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const titleFiltersRepository = await createEffectiveTenantRepository(
    createIngestionTitleFiltersRepository(),
    authUser.id,
  );
  const [integrationsResult, membersResult, titleFiltersResult] = await Promise.all([
    getIntegrationStatuses(integrationsRepository, authUser.id),
    listOrganizationMembers(usersRepository, authUser.id),
    getOrganizationIngestionTitleFilters(titleFiltersRepository, authUser.id),
  ]);

  const integrations = integrationsResult.ok ? integrationsResult.data : null;
  const fallbackOwnerOptions = membersResult.ok
    ? membersResult.data.map((member) => ({
        email: member.email,
        id: member.id,
        name:
          [member.firstName, member.lastName].filter(Boolean).join(" ") ||
          member.email,
        role: member.role,
      }))
    : [];
  const titleFilters = titleFiltersResult.ok
    ? titleFiltersResult.data
    : {
        configured: false,
        excludePhrases: [],
        includePhrases: [],
      };

  return (
    <SettingsOperationalLayout
      railItems={await loadSettingsRailItems()}
      description="Connect and monitor supported providers."
      route="integrations"
      title="Integrations"
    >
      <IntegrationsPanel
        titleFilterEnforcementEnabled={
          process.env.ARGOS_INGESTION_TITLE_FILTERS_ENFORCED === "true"
        }
        titleFilters={titleFilters}
        zoom={
          canUseZoom
            ? integrations?.zoom ?? {
                available: false,
                connectPath: "/api/integrations/zoom/connect",
                connected: false,
                connectedAt: null,
                disconnectPath: "/api/integrations/zoom/disconnect",
                zoomUserId: null,
              }
            : undefined
        }
        googleMeet={
          canUseGoogleMeet
            ? {
                ...(integrations?.googleMeet ?? {
                  available: false,
                  connectPath: "/api/integrations/google-meet/connect",
                  connected: false,
                  connectedAt: null,
                  consentConfirmedAt: null,
                  defaultRepId: null,
                  disconnectPath: "/api/integrations/google-meet/disconnect",
                  googleEmail: null,
                  lastSyncCompletedAt: null,
                  lastSyncError: null,
                  lastSyncStartedAt: null,
                  syncEnabled: false,
                }),
                fallbackOwnerOptions,
              }
            : undefined
        }
        ghl={
          canUseGhl
            ? {
                ...(integrations?.ghl ?? {
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
                }),
                fallbackOwnerOptions,
              }
            : undefined
        }
      />
    </SettingsOperationalLayout>
  );
}
