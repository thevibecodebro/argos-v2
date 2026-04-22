// apps/web/app/(authenticated)/settings/page.tsx
import { redirect } from "next/navigation";
import { PageFrame } from "@/components/page-frame";
import { AccountPanel } from "@/components/settings/account-panel";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login");

  const result = await getCurrentUserDetails(createUsersRepository(), authUser.id);

  if (!result?.ok) {
    return (
      <PageFrame
        description="Settings needs an app user record before profile and org management can load."
        eyebrow="Provisioning"
        title="Account"
        tone="warning"
      >
        <section className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/5 p-6 text-sm leading-7 text-amber-100">
          {result?.error ?? "Unable to load settings."}
        </section>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      description="Manage your display name and view your organization details."
      headerMode="hidden"
      eyebrow="Settings"
      title="Account"
    >
      <AccountPanel initialUser={result.data} />
    </PageFrame>
  );
}
