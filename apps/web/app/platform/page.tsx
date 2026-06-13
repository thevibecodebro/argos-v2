import { cookies } from "next/headers";
import { PlatformConsole } from "@/components/platform/platform-console";
import { requirePlatformStaffAccess } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";
import { getPlatformSessionCookieValue } from "@/lib/platform/effective-actor";

type PlatformPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function serializeDate(value: Date) {
  return value.toISOString();
}

export default async function PlatformPage({ searchParams }: PlatformPageProps) {
  const { staff, user } = await requirePlatformStaffAccess({
    pathname: "/platform",
  });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = firstValue(resolvedSearchParams?.q)?.trim() ?? "";
  const repository = createPlatformRepository();
  const cookieStore = await cookies();
  const activeSessionId = getPlatformSessionCookieValue(cookieStore);
  const [organizations, platformStaff, activeSession] = await Promise.all([
    repository.listOrganizations({ limit: 100, query }),
    repository.listStaff(),
    activeSessionId ? repository.findActiveAccessSession(activeSessionId, staff.userId) : null,
  ]);

  return (
    <main className="forge-shell min-h-dvh">
      <PlatformConsole
        activeSession={
          activeSession
            ? {
                expiresAt: serializeDate(activeSession.expiresAt),
                id: activeSession.id,
                reason: activeSession.reason,
                targetOrgId: activeSession.targetOrgId,
                targetOrgName:
                  activeSession.targetOrgName ??
                  activeSession.targetOrgNameSnapshot ??
                  "Customer organization",
                targetOrgSlug:
                  activeSession.targetOrgSlug ??
                  activeSession.targetOrgSlugSnapshot ??
                  activeSession.targetOrgId ??
                  "customer",
              }
            : null
        }
        currentUserEmail={user.email ?? user.id}
        currentUserId={staff.userId}
        organizations={organizations.map((organization) => ({
          createdAt: serializeDate(organization.createdAt),
          id: organization.id,
          name: organization.name,
          plan: organization.plan,
          slug: organization.slug,
        }))}
        platformStaff={platformStaff.map((member) => ({
          createdAt: serializeDate(member.createdAt),
          email: member.email,
          role: member.role,
          status: member.status,
          updatedAt: serializeDate(member.updatedAt),
          userId: member.userId,
        }))}
        query={query}
        staffRole={staff.role}
        staffStatus={staff.status}
      />
    </main>
  );
}
