import { redirect } from "next/navigation";
import { AuthenticatedAppChrome } from "@/components/authenticated-app-chrome";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getAuthenticatedEntryHref } from "@/lib/auth-routing";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getCurrentUserProfile } from "@/lib/dashboard/service";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    redirect("/login");
  }

  const currentUser = await getCurrentUserProfile(createDashboardRepository(), authUser.id);

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
