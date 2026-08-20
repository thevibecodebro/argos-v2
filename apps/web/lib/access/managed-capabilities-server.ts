import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getCachedCurrentUserProfile } from "@/lib/auth/request-user";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import {
  getManagedWorkspaceLandingPath,
  hasManagedCapability,
  resolveOrganizationCapabilities,
  type ManagedCapabilityKey,
} from "./managed-capabilities";
import { createManagedAccessRepository } from "./managed-capabilities-repository";

export const getCachedOrganizationCapabilities = cache(async (orgId: string) =>
  resolveOrganizationCapabilities(createManagedAccessRepository(), orgId),
);

export async function organizationHasManagedCapability(
  orgId: string,
  capability: ManagedCapabilityKey,
) {
  return hasManagedCapability(
    await getCachedOrganizationCapabilities(orgId),
    capability,
  );
}

export async function requireManagedCapabilityForUser(
  authUserId: string,
  capability: ManagedCapabilityKey,
) {
  const profile = await getCachedCurrentUserProfile(authUserId);
  const orgId = profile?.org?.id ?? null;

  if (!orgId) {
    return {
      ok: false as const,
      status: 403 as const,
      code: "workspace_inactive" as const,
      error: "Workspace access is inactive",
    };
  }

  const access = await getCachedOrganizationCapabilities(orgId);
  if (!hasManagedCapability(access, capability)) {
    return {
      ok: false as const,
      access,
      status: 403 as const,
      code: access.mode === "inactive" ? "workspace_inactive" as const : "feature_unavailable" as const,
      error:
        access.mode === "inactive"
          ? "Workspace access is inactive"
          : "This feature is not enabled for this workspace",
    };
  }

  return { ok: true as const, access, orgId };
}

export async function requireAuthenticatedManagedCapability(
  capability: ManagedCapabilityKey,
) {
  const user = await getAuthenticatedSupabaseUser();
  if (!user) {
    return { ok: false as const, response: unauthorizedJson() };
  }

  const capabilityAccess = await requireManagedCapabilityForUser(user.id, capability);
  if (!capabilityAccess.ok) {
    return {
      ok: false as const,
      response: Response.json(
        { code: capabilityAccess.code, error: capabilityAccess.error },
        { status: capabilityAccess.status },
      ),
    };
  }

  return {
    ok: true as const,
    access: capabilityAccess.access,
    orgId: capabilityAccess.orgId,
    user,
  };
}

export async function requireManagedCapabilityForPage(
  authUserId: string,
  capability: ManagedCapabilityKey,
) {
  const result = await requireManagedCapabilityForUser(authUserId, capability);
  if (!result.ok) {
    redirect(
      result.code === "workspace_inactive"
        ? "/access-pending"
        : getManagedWorkspaceLandingPath(result.access),
    );
  }

  return result;
}

export async function requireAnyManagedCapabilityForPage(
  authUserId: string,
  capabilities: readonly ManagedCapabilityKey[],
) {
  const profile = await getCachedCurrentUserProfile(authUserId);
  const orgId = profile?.org?.id ?? null;
  if (!orgId) redirect("/access-pending");

  const access = await getCachedOrganizationCapabilities(orgId);
  if (
    access.mode === "inactive" ||
    !capabilities.some((capability) => hasManagedCapability(access, capability))
  ) {
    redirect(
      access.mode === "inactive"
        ? "/access-pending"
        : getManagedWorkspaceLandingPath(access),
    );
  }

  return { access, orgId };
}
