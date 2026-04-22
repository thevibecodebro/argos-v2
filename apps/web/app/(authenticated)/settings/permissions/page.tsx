import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { PermissionsPanel } from "@/components/page-panel-loaders";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot, PRESET_GRANTS } from "@/lib/team-access/service";

export default async function SettingsPermissionsPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const snapshotResult = await getTeamAccessSnapshot(
    createTeamAccessRepository(),
    authUser.id,
  );
  const snapshot = snapshotResult?.ok ? snapshotResult.data : null;

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
      headerMode="hidden"
      eyebrow="Settings"
      title="Permissions"
    >
      <PermissionsPanel
        grants={snapshot?.grants ?? []}
        managers={snapshot?.managers ?? []}
        memberships={snapshot?.memberships ?? []}
        presets={presets}
        reps={reps}
        teams={snapshot?.teams ?? []}
      />
    </PageFrame>
  );
}
