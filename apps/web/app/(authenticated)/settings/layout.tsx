import { redirect } from "next/navigation";
import { getCachedAuthenticatedSupabaseUser } from "@/lib/auth/request-user";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  return (
    <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {children}
    </div>
  );
}
