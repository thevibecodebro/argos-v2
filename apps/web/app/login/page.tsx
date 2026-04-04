import { LoginForm } from "@/components/auth/login-form";
import { LegacyAuthShell } from "@/components/legacy-shell";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath =
    resolvedSearchParams?.next && resolvedSearchParams.next.startsWith("/")
      ? resolvedSearchParams.next
      : "/dashboard";

  return (
    <LegacyAuthShell note="Secure login via Google or magic link. No password required.">
      <LoginForm nextPath={nextPath} />
    </LegacyAuthShell>
  );
}
