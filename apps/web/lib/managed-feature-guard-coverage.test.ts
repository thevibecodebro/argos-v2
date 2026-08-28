import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

describe("managed feature guard coverage", () => {
  it("atomically switches an organization to managed mode when platform access is saved", async () => {
    const content = await source("lib/platform/repository.ts");

    expect(content).toContain("if (input.action === \"save\")");
    expect(content).toContain(".set({ accessModel: \"managed\" })");
  });
  it.each([
    ["app/(authenticated)/dashboard/page.tsx", "call_analytics", "await Promise.all"],
    ["app/(authenticated)/team/page.tsx", "call_analytics", "const dashboard ="],
    ["app/(authenticated)/team/[repId]/page.tsx", "call_analytics", "const [managerDashboard"],
  ])("guards %s before loading call-performance data", async (path, capability, sink) => {
    const content = await source(path);
    const guard = content.indexOf(`requireManagedCapabilityForPage(authUser.id, "${capability}")`);
    const dataLoad = content.indexOf(sink);

    expect(guard).toBeGreaterThan(-1);
    expect(dataLoad).toBeGreaterThan(guard);
  });

  it.each([
    ["app/api/integrations/ghl/consent/route.ts", "integration_ghl"],
    ["app/api/integrations/ghl/disconnect/route.ts", "integration_ghl"],
    ["app/api/integrations/ghl/mappings/route.ts", "integration_ghl"],
    ["app/api/integrations/ghl/status/route.ts", "integration_ghl"],
    ["app/api/integrations/google-meet/consent/route.ts", "integration_google_meet"],
    ["app/api/integrations/google-meet/disconnect/route.ts", "integration_google_meet"],
    ["app/api/integrations/google-meet/settings/route.ts", "integration_google_meet"],
    ["app/api/integrations/zoom/disconnect/route.ts", "integration_zoom"],
    ["app/api/integrations/zoom/status/route.ts", "integration_zoom"],
  ])("enforces the provider capability in %s", async (path, capability) => {
    const content = await source(path);

    expect(content).toContain(`requireAuthenticatedManagedCapability("${capability}")`);
  });
});
