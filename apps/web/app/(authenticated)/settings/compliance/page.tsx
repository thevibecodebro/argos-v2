import { redirect } from "next/navigation";
import { CompliancePanel } from "@/components/panel-loaders/compliance-panel-loader";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { getComplianceStatus } from "@/lib/compliance/service";
import { SettingsOperationalLayout } from "../settings-operational-layout";

export default async function SettingsCompliancePage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const complianceResult = await getComplianceStatus(
    createComplianceRepository(),
    authUser.id,
  );
  const compliance = complianceResult.ok ? complianceResult.data : null;

  return (
    <SettingsOperationalLayout
      description="Manage consent, retention, and coaching safeguards."
      previewDescription="Consent and recording safeguard state."
      previewRows={[
        { label: "Consent", tone: compliance?.consentedAt ? "success" : "muted", value: compliance?.consentedAt ? "Acknowledged" : "Not acknowledged" },
        { label: "Recording", tone: "muted", value: "Disabled" },
        { label: "Acknowledged", value: compliance?.consentedAt ? formatDate(compliance.consentedAt) : "Not recorded" },
        { label: "Scope", tone: "gold", value: "Workspace" },
      ]}
      previewTitle="Compliance status"
      route="compliance"
      title="Compliance"
    >
      <CompliancePanel
        consentMode={null}
        acknowledgedAt={compliance?.consentedAt ?? null}
        acknowledgedByName={null}
        recordingEnabled={false}
      />
    </SettingsOperationalLayout>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}
