import { cache } from "react";
import { redirect } from "next/navigation";
import { getSettingsRailItems } from "@/components/settings/settings-navigation";
import { getCachedAuthenticatedSupabaseUser, getCachedCurrentUserDetails } from "@/lib/auth/request-user";
import { getCachedOrganizationCapabilities } from "@/lib/access/managed-capabilities-server";

export const loadSettingsRailItems = cache(async () => {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");
  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) return getSettingsRailItems(null);
  const access = result.data.org ? await getCachedOrganizationCapabilities(result.data.org.id) : undefined;
  return getSettingsRailItems(result.data.role, access);
});
