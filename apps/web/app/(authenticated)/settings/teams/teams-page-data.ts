import { redirect } from "next/navigation";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { createEffectiveTenantTeamAccessRepository } from "@/lib/platform/effective-request";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import { getTeamAccessSnapshot } from "@/lib/team-access/service";

export async function loadAdminTeamsSettings() {
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

  return snapshotResult.ok ? snapshotResult.data : null;
}
