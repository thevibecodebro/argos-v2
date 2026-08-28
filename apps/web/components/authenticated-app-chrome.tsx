import { AuthenticatedAppShell } from "./app-shell";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "./platform/platform-types";
import type { WorkspaceTheme } from "@/lib/organizations/workspace-theme";
import type { EffectiveOrganizationCapabilities } from "@/lib/access/managed-capabilities";

type AuthenticatedAppChromeProps = {
  access?: EffectiveOrganizationCapabilities;
  children: React.ReactNode;
  platformSwitcher?: {
    activeSession: PlatformConsoleActiveSession | null;
    organizations: PlatformConsoleOrganization[];
  };
  user: {
    email: string;
    fullName: string;
    id: string;
    orgLogoUrl?: string | null;
    orgName?: string | null;
    role: "rep" | "manager" | "executive" | "admin" | null;
    workspaceTheme?: WorkspaceTheme | null;
  };
};

export function AuthenticatedAppChrome({
  access,
  children,
  platformSwitcher,
  user,
}: AuthenticatedAppChromeProps) {
  return (
    <AuthenticatedAppShell access={access} platformSwitcher={platformSwitcher} user={user}>
      {children}
    </AuthenticatedAppShell>
  );
}
