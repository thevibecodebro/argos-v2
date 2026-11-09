import { loadSettingsRailItems } from "../settings-navigation-data";
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
      railItems={await loadSettingsRailItems()}
      description="Review consent and recording safeguards."
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
