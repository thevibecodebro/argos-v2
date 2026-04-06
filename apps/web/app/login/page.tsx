import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/legacy-shell";

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
    <AuthShell>
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
