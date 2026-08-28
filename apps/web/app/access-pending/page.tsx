import Link from "next/link";
import { redirect } from "next/navigation";
import { ArgosLogo } from "@/components/argos-logo";
import {
  getCachedAuthenticatedSupabaseUser,
  getCachedCurrentUserProfile,
} from "@/lib/auth/request-user";
import { getCachedOrganizationCapabilities } from "@/lib/access/managed-capabilities-server";

export default async function AccessPendingPage() {
  const authUser = await getCachedAuthenticatedSupabaseUser();
  if (!authUser) redirect("/login?next=/access-pending");

  const currentUser = await getCachedCurrentUserProfile(authUser.id);
  if (!currentUser?.org) redirect("/onboarding");

  const access = await getCachedOrganizationCapabilities(currentUser.org.id);
  if (access.mode !== "inactive") redirect("/dashboard");

  return (
    <main className="forge-shell grid min-h-dvh place-items-center px-4 text-[var(--forge-text)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--forge-border)] bg-[var(--forge-panel-bg)] p-8 text-center shadow-xl">
        <ArgosLogo className="mx-auto w-28" decorative placement="access-pending" />
        <p className="forge-page-eyebrow mt-8">Workspace access</p>
        <h1 className="mt-2 text-2xl font-semibold">Setup is still in progress</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--forge-muted)]">
          {currentUser.org.name} exists, but its managed feature access is not active yet.
          No workspace features or customer data are available until a platform operator
          activates the agreement.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="forge-button forge-button-secondary rounded-xl px-4 py-2 text-sm" href="/access-pending">
            Check again
          </Link>
          <form action="/auth/signout" method="post">
            <button className="forge-button forge-button-primary rounded-xl px-4 py-2 text-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
