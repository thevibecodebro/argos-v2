import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { PermissionsPanel } from "@/components/settings/permissions-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot, PRESET_GRANTS } from "@/lib/team-access/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, listOrganizationMembers } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsPermissionsPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const [snapshotResult, membersResult] = await Promise.all([
    getTeamAccessSnapshot(createTeamAccessRepository(), authUser.id),
    listOrganizationMembers(createUsersRepository(), authUser.id),
  ]);

  const snapshot = snapshotResult?.ok ? snapshotResult.data : null;
  const allMembers = membersResult?.ok ? membersResult.data : [];
  const managers = allMembers.filter((m) => m.role === "manager" || m.role === "admin");

  // Build static presets from the PRESET_GRANTS constant
  const presets = (Object.keys(PRESET_GRANTS) as Array<keyof typeof PRESET_GRANTS>).map(
    (presetName) => ({
      id: presetName,
      name: presetName,
      role: "manager",
      permissions: [...PRESET_GRANTS[presetName]],
    }),
  );

  // Reps with their primaryManagerId come directly from the snapshot
  const reps = snapshot?.reps ?? [];

  return (
    <PageFrame
      description="Configure permission presets and primary manager assignments per rep."
      eyebrow="Settings"
      title="Permissions"
    >
      <PermissionsPanel
        managers={managers}
        presets={presets}
        reps={reps}
      />
    </PageFrame>
  );
}
