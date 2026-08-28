import { redirect } from "next/navigation";
import { WorkspaceBrandingPanel } from "@/components/settings/workspace-branding-panel";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { requireManagedCapabilityForPage } from "@/lib/access/managed-capabilities-server";

export default async function SettingsBrandingPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  if (!result?.ok) redirect("/settings");
  if (result.data.role !== "admin") redirect("/settings");
  await requireManagedCapabilityForPage(authUser.id, "workspace_branding");

  return (
    <SettingsOperationalLayout
      description="Control workspace colors for buttons, text, surfaces, status states, and focus indicators."
      route="branding"
      title="Branding"
      variant="editor"
    >
      <WorkspaceBrandingPanel
        initialLogoUrl={result.data.org?.logoUrl ?? null}
        initialTheme={result.data.org?.workspaceTheme ?? null}
        organizationName={result.data.org?.name ?? "Workspace"}
        organizationSlug={result.data.org?.slug ?? null}
      />
    </SettingsOperationalLayout>
  );
}
