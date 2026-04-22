import { AuthenticatedAppShell } from "./app-shell";

type AuthenticatedAppChromeProps = {
  children: React.ReactNode;
  user: {
    email: string;
    fullName: string;
    orgName?: string | null;
    role: "rep" | "manager" | "executive" | "admin" | null;
  };
};

export function AuthenticatedAppChrome({
  children,
  user,
}: AuthenticatedAppChromeProps) {
  return (
    <AuthenticatedAppShell user={user}>
      {children}
    </AuthenticatedAppShell>
  );
}
