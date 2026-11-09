import { redirect } from "next/navigation";
import { AccessPendingView } from "@/components/auth/entry-views";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { getCachedOrganizationCapabilities } from "@/lib/access/managed-capabilities-server";

export default async function AccessPendingPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login?next=/access-pending");

  const currentUser = await getCachedCurrentUserProfile(authUser.id);
  if (!currentUser?.org) redirect("/onboarding");

  const access = await getCachedOrganizationCapabilities(currentUser.org.id);
  if (access.mode !== "inactive") redirect("/dashboard");

  return <AccessPendingView organizationName={currentUser.org.name} />;
}
