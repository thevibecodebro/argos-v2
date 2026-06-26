import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const apiRoot = new URL("../app/api", import.meta.url).pathname;
const mutationMethodPattern = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/g;
const protectedRoutePattern =
  /getAuthenticatedSupabaseUser|getCachedAuthenticatedSupabaseUser|getPlatformApiAccess|createSupabaseServerClient/;
const platformAuditPattern =
  /auditPlatformWorkspaceMutation|createEffectiveTenant(?:Access|TeamAccess|Users)?Repository|getPlatformApiAccess|archiveOrganizationForCurrentAdmin|archiveOrganizationForPlatform|createPlatformOrganizationWithAdminInvite|createPlatformSwitchSession|endPlatformSwitchSession|grantPlatformStaffAccess|resendPlatformAdminInvite|revokePlatformStaffAccess/;
const effectiveTenantRepositoryPattern =
  /createEffectiveTenant(?:Access|TeamAccess|Users)?Repository/;

const platformAuditCoveredRoutes = new Set([
  "integrations/ghl/consent/route.ts",
  "integrations/ghl/mappings/route.ts",
  "integrations/ghl/sync/route.ts",
  "invites/route.ts",
  "organizations/route.ts",
  "organizations/branding/route.ts",
  "platform/organizations/[slug]/admin-invite/resend/route.ts",
  "platform/organizations/route.ts",
  "platform/sessions/route.ts",
  "platform/staff/route.ts",
]);

const platformAuditDeferredRoutes = new Set([
  "calls/upload/prepare/route.ts",
  "compliance/consent/route.ts",
  "invites/[token]/accept/route.ts",
  "invites/[token]/route.ts",
  "me/route.ts",
  "organizations/join/route.ts",
  "roleplay/sessions/[id]/realtime/route.ts",
  "roleplay/tts/route.ts",
  "training/modules/[id]/generate/route.ts",
  "training/modules/generate/route.ts",
]);

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findRouteFiles(path);
    }

    return entry.name === "route.ts" ? [path] : [];
  });
}

function findProtectedMutatingRoutes() {
  return findRouteFiles(apiRoot)
    .map((path) => {
      const source = readFileSync(path, "utf8");
      const methods = Array.from(source.matchAll(mutationMethodPattern)).map((match) => match[1]);

      return {
        methods,
        path,
        route: relative(apiRoot, path),
        source,
      };
    })
    .filter((route) => route.methods.length > 0 && protectedRoutePattern.test(route.source))
    .sort((left, right) => left.route.localeCompare(right.route));
}

describe("platform audit coverage for mutating API routes", () => {
  it("classifies every protected mutating route as covered or explicitly deferred", () => {
    const protectedMutatingRoutes = findProtectedMutatingRoutes();

    expect(protectedMutatingRoutes.length).toBeGreaterThan(0);

    for (const route of protectedMutatingRoutes) {
      const isCovered =
        platformAuditCoveredRoutes.has(route.route) ||
        effectiveTenantRepositoryPattern.test(route.source);
      const isDeferred = platformAuditDeferredRoutes.has(route.route);

      expect(
        isCovered || isDeferred,
        `${route.route} (${route.methods.join(", ")}) must be platform-audit-covered or explicitly deferred`,
      ).toBe(true);

      if (isCovered) {
        expect(route.source, `${route.route} must call the platform audit path`).toMatch(platformAuditPattern);
      }

      if (isDeferred) {
        expect(
          route.source,
          `${route.route} uses effective tenant access and must not stay deferred from platform audit coverage`,
        ).not.toMatch(effectiveTenantRepositoryPattern);
      }
    }
  });
});
