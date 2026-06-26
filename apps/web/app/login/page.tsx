import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/legacy-shell";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import {
  getOrglessProtectedDestination,
  getPlatformStaffDestination,
  getSafeNextPath,
  isProtectedPath,
} from "@/lib/auth-routing";
import { getPlatformStaffAfterProvisioning } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { SupabaseProvisioningRepository } from "@/lib/provisioning/repository";
import { ensureUserProvisioned } from "@/lib/provisioning/service";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = getSafeNextPath(resolvedSearchParams?.next ?? null);
  const authenticatedUser = await getAuthenticatedSupabaseUser();

  if (authenticatedUser) {
    redirect(await getAuthenticatedLoginDestination(authenticatedUser, nextPath));
  }

  return (
    <AuthShell>
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}

type AuthenticatedLoginUser = {
  email?: string;
  id: string;
};

async function getAuthenticatedLoginDestination(
  authenticatedUser: AuthenticatedLoginUser,
  nextPath: string,
) {
  const provisionedUser = await ensureUserProvisioned(
    new SupabaseProvisioningRepository(),
    authenticatedUser,
  );
  const platformRepository = createPlatformRepository();
  const platformStaff = await getPlatformStaffAfterProvisioning(
    platformRepository,
    authenticatedUser,
  );
  const isActivePlatformStaff = platformStaff?.status === "active";

  if (isActivePlatformStaff && isProtectedPath(nextPath)) {
    return getPlatformStaffDestination(nextPath);
  }

  if (provisionedUser?.orgId === null && isProtectedPath(nextPath)) {
    return getOrglessProtectedDestination(nextPath, isActivePlatformStaff);
  }

  return nextPath;
}
