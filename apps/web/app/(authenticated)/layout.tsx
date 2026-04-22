import { redirect } from "next/navigation";
import { AuthenticatedAppChrome } from "@/components/authenticated-app-chrome";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { getAuthenticatedEntryHref } from "@/lib/auth-routing";

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

  return (
    <AuthenticatedAppChrome
      user={{
        email: currentUser.email,
        fullName: currentUser.fullName,
        orgName: currentUser.org?.name,
        role: currentUser.role,
      }}
    >
      {children}
    </AuthenticatedAppChrome>
  );
}
