import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { CompliancePanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { getComplianceStatus } from "@/lib/compliance/service";

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
    <PageFrame
      description="Configure call recording consent and review compliance acknowledgments."
      headerMode="hidden"
      eyebrow="Settings"
      title="Compliance"
    >
      <CompliancePanel
        consentMode={null}
        acknowledgedAt={compliance?.consentedAt ?? null}
        acknowledgedByName={null}
        recordingEnabled={false}
      />
    </PageFrame>
  );
}
