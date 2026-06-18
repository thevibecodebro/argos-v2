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

  const currentUser = await getCachedCurrentUserProfile(authUser.id);

  if (!currentUser) {
    redirect("/auth/error");
  }

  if (!currentUser.org) {
    redirect(getAuthenticatedEntryHref(false));
  }

  const platformSwitcher = currentUser.email.startsWith("platform:")
    ? await loadPlatformOrganizationSwitcher(authUser.id)
    : null;

  return (
    <AuthenticatedAppChrome
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
  const cookieStore = await cookies();
  const activeSessionId = getPlatformSessionCookieValue(cookieStore);

  if (!activeSessionId) {
    return null;
  }

  const repository = createPlatformRepository();
  const activeSession = await repository.findActiveAccessSession(
    activeSessionId,
    authUserId,
  );

  if (!activeSession) {
    return null;
  }

  const organizations = await repository.listOrganizations({ limit: 100 });

  return {
    activeSession: serializeActivePlatformSession(activeSession),
    organizations: organizations.map(serializeOrganization),
  };
}
