import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);
  const role = result?.ok ? result.data.role : null;

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      {/* Left nav — sticky within the settings shell */}
      <aside className="w-48 shrink-0 border-r border-[#45484f]/10 pt-8 px-3 sticky top-[65px] self-start h-[calc(100vh-65px)] overflow-y-auto">
        <SettingsNav role={role} />
      </aside>

      {/* Page content */}
      <div className="flex-1 min-w-0 px-8 py-8">
        {children}
      </div>
    </div>
  );
}
