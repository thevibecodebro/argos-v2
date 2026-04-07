import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { CompliancePanel } from "@/components/settings/compliance-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createComplianceRepository } from "@/lib/compliance/create-repository";
import { getComplianceStatus } from "@/lib/compliance/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsCompliancePage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
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
