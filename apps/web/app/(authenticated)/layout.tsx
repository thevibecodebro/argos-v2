import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticatedAppChrome } from "@/components/authenticated-app-chrome";
import type {
  PlatformConsoleActiveSession,
  PlatformConsoleOrganization,
} from "@/components/platform/platform-types";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { getAuthenticatedEntryHref } from "@/lib/auth-routing";
import { getCachedOrganizationCapabilities } from "@/lib/access/managed-capabilities-server";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { getPlatformSessionCookieValue } from "@/lib/platform/effective-actor";
import {
  serializeActivePlatformSession,
  serializeOrganization,
} from "@/lib/platform/page-context";

type PlatformOrganizationSwitcherContext = {
  activeSession: PlatformConsoleActiveSession | null;
  organizations: PlatformConsoleOrganization[];
};

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getCachedAuthenticatedSupabaseUser();

  if (!authUser) {
    redirect("/login");
  }

  const platformSwitcher = await loadPlatformOrganizationSwitcher(authUser.id);
  const currentUser = await getCachedCurrentUserProfile(authUser.id);

  if (platformSwitcher && !currentUser?.org) {
    redirect("/platform/dashboard");
  }

  if (!currentUser) {
    redirect("/auth/error");
  }

  if (!currentUser.org) {
    redirect(getAuthenticatedEntryHref(false));
  }

  const access = await getCachedOrganizationCapabilities(currentUser.org.id);

  if (access.mode === "inactive") {
    redirect(platformSwitcher ? "/platform/dashboard" : "/access-pending");
  }

  return (
    <AuthenticatedAppChrome
      access={access}
      platformSwitcher={platformSwitcher ?? undefined}
      user={{
        email: currentUser.email,
        fullName: currentUser.fullName,
        id: currentUser.id,
        orgLogoUrl: currentUser.org?.logoUrl ?? null,
        orgName: currentUser.org?.name,
        role: currentUser.role,
        workspaceTheme: currentUser.org?.workspaceTheme ?? null,
      }}
    >
      {children}
    </AuthenticatedAppChrome>
  );
}

async function loadPlatformOrganizationSwitcher(
  authUserId: string,
): Promise<PlatformOrganizationSwitcherContext | null> {
  const repository = createPlatformRepository();
  const staff = await repository.findStaffByUserId(authUserId);

  // Staff access outlives the temporary organization support session.
  if (staff?.status !== "active") {
    return null;
  }

  await requirePlatformStaffAccess({ repository, pathname: "/dashboard" });
  const cookieStore = await cookies();
  const activeSessionId = getPlatformSessionCookieValue(cookieStore);
  const activeSession = activeSessionId
    ? await repository.findActiveAccessSession(activeSessionId, authUserId)
    : null;

  const organizations = await repository.listOrganizations({ limit: 100 });

  return {
    activeSession: activeSession ? serializeActivePlatformSession(activeSession) : null,
    organizations: organizations.map(serializeOrganization),
  };
}
