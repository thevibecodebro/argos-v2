import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserDetails,
} from "@/lib/auth/request-user";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCachedCurrentUserDetails(authUser.id);
  const role = result?.ok ? result.data.role : null;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-[var(--forge-border)] bg-[rgba(5,4,3,0.56)] px-4 py-3 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-64 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="mb-5 hidden rounded-[1.35rem] border border-[var(--forge-border)] bg-[rgba(255,244,230,0.035)] p-4 shadow-[inset_0_1px_0_rgba(255,244,230,0.055)] lg:block">
          <p className="forge-page-eyebrow">Settings</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--forge-text)]">Control room</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--forge-muted)]">
            Workspace, people, and coaching-system configuration.
          </p>
        </div>
        <SettingsNav role={role} />
      </aside>

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </div>
  );
}
