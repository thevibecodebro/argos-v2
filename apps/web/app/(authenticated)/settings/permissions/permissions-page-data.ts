import { redirect } from "next/navigation";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createEffectiveTenantTeamAccessRepository } from "@/lib/platform/effective-request";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot, PRESET_GRANTS } from "@/lib/team-access/service";

export async function loadAdminPermissionsSettings() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");

  const repository = await createEffectiveTenantTeamAccessRepository(
    createTeamAccessRepository(),
    authUser.id,
  );
  const snapshotResult = await getTeamAccessSnapshot(repository, authUser.id);
  const snapshot = snapshotResult?.ok ? snapshotResult.data : null;

  const presets = (Object.keys(PRESET_GRANTS) as Array<keyof typeof PRESET_GRANTS>).map(
    (presetName) => ({
      id: presetName,
      name: presetName,
      role: "manager",
      permissions: [...PRESET_GRANTS[presetName]],
    }),
  );

  return {
    presets,
    reps: snapshot?.reps ?? [],
    snapshot,
  };
}
