import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const apiRoot = new URL("../app/api", import.meta.url).pathname;
const mutationMethodPattern = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/g;
const protectedRoutePattern =
  /getAuthenticatedSupabaseUser|getCachedAuthenticatedSupabaseUser|getPlatformApiAccess|createSupabaseServerClient/;
const platformAuditPattern =
  /auditPlatformWorkspaceMutation|getPlatformApiAccess|createPlatformOrganizationWithAdminInvite|createPlatformSwitchSession|endPlatformSwitchSession|grantPlatformStaffAccess|revokePlatformStaffAccess/;

const platformAuditCoveredRoutes = new Set([
  "integrations/ghl/consent/route.ts",
  "integrations/ghl/mappings/route.ts",
  "integrations/ghl/sync/route.ts",
  "invites/route.ts",
  "organizations/branding/route.ts",
  "platform/organizations/route.ts",
  "platform/sessions/route.ts",
  "platform/staff/route.ts",
]);

const platformAuditDeferredRoutes = new Set([
  "calls/[id]/annotations/[annotationId]/route.ts",
  "calls/[id]/annotations/route.ts",
  "calls/[id]/generate-roleplay/route.ts",
  "calls/[id]/moments/[momentId]/highlight/route.ts",
  "calls/[id]/route.ts",
  "calls/[id]/status/route.ts",
  "calls/upload/complete/route.ts",
  "calls/upload/prepare/route.ts",
  "calls/upload/route.ts",
  "compliance/consent/route.ts",
  "feedback/route.ts",
  "integrations/ghl/disconnect/route.ts",
  "integrations/zoom/disconnect/route.ts",
  "invites/[token]/accept/route.ts",
  "invites/[token]/route.ts",
  "me/route.ts",
  "notifications/[id]/read/route.ts",
  "notifications/read-all/route.ts",
  "organizations/join/route.ts",
  "organizations/logo/route.ts",
  "organizations/members/[userId]/primary-manager/route.ts",
  "organizations/members/[userId]/route.ts",
  "organizations/route.ts",
  "roleplay/sessions/[id]/complete/route.ts",
  "roleplay/sessions/[id]/messages/route.ts",
  "roleplay/sessions/[id]/realtime/route.ts",
  "roleplay/sessions/[id]/transcript/route.ts",
  "roleplay/sessions/route.ts",
  "roleplay/tts/route.ts",
  "rubrics/[id]/publish/route.ts",
  "rubrics/route.ts",
  "teams/[teamId]/grants/route.ts",
  "teams/[teamId]/members/route.ts",
  "teams/[teamId]/route.ts",
  "teams/route.ts",
  "training/modules/[id]/assign/[repId]/route.ts",
  "training/modules/[id]/assign/route.ts",
  "training/modules/[id]/generate/route.ts",
  "training/modules/[id]/progress/route.ts",
  "training/modules/[id]/route.ts",
  "training/modules/generate/route.ts",
  "training/modules/route.ts",
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
      const isCovered = platformAuditCoveredRoutes.has(route.route);
      const isDeferred = platformAuditDeferredRoutes.has(route.route);

      expect(
        isCovered || isDeferred,
        `${route.route} (${route.methods.join(", ")}) must be platform-audit-covered or explicitly deferred`,
      ).toBe(true);

      if (isCovered) {
        expect(route.source, `${route.route} must call the platform audit path`).toMatch(platformAuditPattern);
      }
    }
  });
});
