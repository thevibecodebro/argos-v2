import { AuthenticatedAppShell } from "./app-shell";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "./platform/platform-types";

type AuthenticatedAppChromeProps = {
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
  };
};

export function AuthenticatedAppChrome({
  children,
  platformSwitcher,
  user,
}: AuthenticatedAppChromeProps) {
  return (
    <AuthenticatedAppShell platformSwitcher={platformSwitcher} user={user}>
      {children}
    </AuthenticatedAppShell>
  );
}
