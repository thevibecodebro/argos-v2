import { AuthenticatedAppShell } from "./app-shell";

type AuthenticatedAppChromeProps = {
  children: React.ReactNode;
  user: {
    email: string;
    fullName: string;
    orgLogoUrl?: string | null;
    orgName?: string | null;
    role: "rep" | "manager" | "executive" | "admin" | null;
  };
};

export function AuthenticatedAppChrome({
  children,
  user,
}: AuthenticatedAppChromeProps) {
  return <AuthenticatedAppShell user={user}>{children}</AuthenticatedAppShell>;
}
