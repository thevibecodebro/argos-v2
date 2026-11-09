// apps/web/app/(authenticated)/settings/page.tsx
import { redirect } from "next/navigation";
import { ForgeErrorState } from "@/components/forge";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import { AccountPanel } from "@/components/panel-loaders/account-panel-loader";
import { VoiceBalanceCard } from "@/components/billing/voice-balance-card";
import { getSettingsRailItems } from "@/components/settings/settings-navigation";
import { SettingsAccountWorkspace } from "@/components/settings/settings-account-workspace";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";
import {
  hasManagedCapability,
} from "@/lib/access/managed-capabilities";
import { getCachedOrganizationCapabilities } from "@/lib/access/managed-capabilities-server";

export default async function SettingsAccountPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);

  if (!result?.ok) {
    return (
      <OperationalWorkspace data-settings-route="control-room">
        <OperationalToolbar
          description="Settings needs an app user record before profile and org management can load."
          eyebrow="Provisioning"
          title="Account"
        />
        <ForgeErrorState
          description={result?.error ?? "Unable to load settings."}
          title="Settings unavailable"
        />
      </OperationalWorkspace>
    );
  }

  const access = result.data.org
    ? await getCachedOrganizationCapabilities(result.data.org.id)
    : undefined;

  const settingsRailItems = getSettingsRailItems(result.data.role, access);

  return (
    <SettingsAccountWorkspace
      railItems={settingsRailItems}
      voiceBalance={
        !access || hasManagedCapability(access, "roleplay_voice")
          ? <VoiceBalanceCard returnTo="/settings" />
          : undefined
      }
    >
      <AccountPanel initialUser={result.data} />
    </SettingsAccountWorkspace>
  );
}
