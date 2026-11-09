import type { ReactNode } from "react";
import type { SettingsSecondaryRailItem } from "./settings-secondary-rail";
import { SettingsWorkspace } from "./settings-workspace";

export function SettingsAccountWorkspace({
  children,
  railItems,
  voiceBalance,
}: {
  children: ReactNode;
  railItems: SettingsSecondaryRailItem[];
  voiceBalance?: ReactNode;
}) {
  return (
    <SettingsWorkspace route="account" title="Settings" description="Manage your profile and workspace." railItems={railItems}>
      <div className="min-w-0 space-y-6" data-settings-inline-detail="account">
        {children}
        {voiceBalance ? <section aria-label="Roleplay voice access">{voiceBalance}</section> : null}
      </div>
    </SettingsWorkspace>
  );
}
