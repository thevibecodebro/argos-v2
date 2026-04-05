import { PageFrame } from "@/components/page-frame";
import { SettingsWorkspacePanel } from "@/components/settings-workspace-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { getComplianceStatus } from "@/lib/compliance/service";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { getIntegrationStatuses } from "@/lib/integrations/service";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

function buildNotices(searchParams?: Record<string, string | string[] | undefined>) {
  if (!searchParams) {
    return [];
  }

  const values = [
    searchParams.zoom_connected,
    searchParams.ghl_connected,
    searchParams.zoom_error,
    searchParams.ghl_error,
    searchParams.zoom_notice,
    searchParams.ghl_notice,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .map((value) => String(value));

  return values.map((value) => {
    switch (value) {
      case "true":
        return "Integration connected successfully.";
      case "not_configured":
        return "The provider is not configured yet. Add the OAuth credentials to enable connect flows.";
      case "forbidden":
        return "Only managers, executives, and admins can manage integrations.";
      case "callback_failed":
        return "The provider returned to Argos, but token exchange or persistence failed during callback.";
      case "webhook_registration_failed":
        return "Zoom connected, but webhook registration failed. Recording ingest will stay inactive until webhook registration succeeds.";
      case "invalid_state":
      case "state_mismatch":
      case "session_expired":
      case "no_session":
        return "The OAuth state check failed. Start the connection flow again from Settings.";
      case "missing_params":
        return "The provider callback did not include the expected authorization parameters.";
      case "not_provisioned":
        return "Your authenticated user is not provisioned in the app database yet.";
      case "oauth_recovery_pending":
        return "The provider returned an intermediate notice. Restart the connection flow from Settings if the provider did not finish cleanly.";
      default:
        return value.replaceAll("_", " ");
    }
  });
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authUser = await getAuthenticatedSupabaseUser();
  const [profileResult, integrations, compliance] = authUser
    ? await Promise.all([
        getCurrentUserDetails(createUsersRepository(), authUser.id),
        getIntegrationStatuses(createIntegrationsRepository(), authUser.id),
        getComplianceStatus(createComplianceRepository(), authUser.id),
      ])
    : [null, null, null];
  const resolvedSearchParams = await searchParams;
  const notices = buildNotices(resolvedSearchParams);

  if (!profileResult?.ok) {
    return (
      <PageFrame
        description="Settings needs an app user record before profile and org management can load."
        eyebrow="Provisioning"
        title="Settings"
        tone="warning"
      >
        <section className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/5 p-6 text-sm leading-7 text-amber-100">
          {profileResult?.error ?? "Unable to load settings."}
        </section>
      </PageFrame>
    );
  }

  const membersResult =
    authUser && profileResult.data.role === "admin"
      ? await listOrganizationMembers(createUsersRepository(), authUser.id)
      : null;
  const teamAccessResult =
    authUser && profileResult.data.role === "admin"
      ? await getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id)
      : null;

  return (
    <PageFrame
      description="Profile updates, org roster management, compliance controls, and provider connections are live."
      eyebrow="Workspace"
      title="Settings"
    >
      <SettingsWorkspacePanel
        initialCompliance={{
          canManage:
            profileResult.data.role === "admin" ||
            profileResult.data.role === "manager" ||
            profileResult.data.role === "executive",
          consentedAt: compliance?.ok ? compliance.data.consentedAt : null,
          hasConsented: compliance?.ok ? compliance.data.hasConsented : false,
        }}
        initialIntegrations={integrations?.ok ? integrations.data : null}
        initialManagers={teamAccessResult?.ok ? teamAccessResult.data.managers : []}
        initialMembers={membersResult?.ok ? membersResult.data : []}
        initialReps={teamAccessResult?.ok ? teamAccessResult.data.reps : []}
        initialTeams={teamAccessResult?.ok ? teamAccessResult.data.teams : []}
        initialUser={profileResult.data}
        notices={notices}
      />
    </PageFrame>
  );
}
