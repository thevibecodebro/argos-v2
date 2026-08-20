import { describe, expect, it, vi } from "vitest";
import {
  INTERO_PRACTICE_PILOT_CAPABILITIES,
  getManagedWorkspaceLandingPath,
  hasManagedCapability,
  normalizeManagedCapabilities,
  resolveOrganizationCapabilities,
  type ManagedAccessRepository,
} from "./managed-capabilities";

function repository(
  overrides: Partial<ManagedAccessRepository> = {},
): ManagedAccessRepository {
  return {
    findActiveManagedGrant: vi.fn().mockResolvedValue(null),
    findOrganizationAccessModel: vi.fn().mockResolvedValue("managed"),
    ...overrides,
  };
}

describe("managed capability validation", () => {
  it("normalizes a unique allow-list in registry order", () => {
    expect(
      normalizeManagedCapabilities([
        "workspace_branding",
        "roleplay",
        "training",
        "roleplay",
      ]),
    ).toEqual({
      ok: true,
      capabilities: ["training", "roleplay", "workspace_branding"],
    });
  });

  it("rejects unknown capabilities and unsafe dependency combinations", () => {
    expect(normalizeManagedCapabilities(["training", "unknown"])).toEqual({
      ok: false,
      error: "Unknown managed capability: unknown",
    });
    expect(normalizeManagedCapabilities(["roleplay_voice"])).toEqual({
      ok: false,
      error: "roleplay_voice requires roleplay",
    });
    expect(normalizeManagedCapabilities(["call_scoring"])).toEqual({
      ok: false,
      error: "call_scoring requires call_upload or call_ingestion",
    });
  });

  it("keeps the Intero launch preset narrow and leaves team rubrics off", () => {
    expect(INTERO_PRACTICE_PILOT_CAPABILITIES).toEqual([
      "training",
      "roleplay",
      "roleplay_voice",
      "custom_scenarios",
      "practice_reporting",
      "workspace_branding",
    ]);
    expect(INTERO_PRACTICE_PILOT_CAPABILITIES).not.toContain("team_rubrics");
    expect(INTERO_PRACTICE_PILOT_CAPABILITIES).not.toContain("call_scoring");
  });

  it("routes a practice-only managed workspace to training instead of call analytics", () => {
    expect(
      getManagedWorkspaceLandingPath({
        capabilities: [...INTERO_PRACTICE_PILOT_CAPABILITIES],
        grantId: "grant-intero",
        mode: "managed",
        version: 1,
      }),
    ).toBe("/training");
  });
});

describe("managed capability resolution", () => {
  it("fails closed for a managed organization without an active agreement", async () => {
    const result = await resolveOrganizationCapabilities(repository(), "org-intero");

    expect(result).toEqual({
      capabilities: [],
      grantId: null,
      mode: "inactive",
      version: null,
    });
    expect(hasManagedCapability(result, "training")).toBe(false);
  });

  it("returns only the explicit managed allow-list", async () => {
    const result = await resolveOrganizationCapabilities(
      repository({
        findActiveManagedGrant: vi.fn().mockResolvedValue({
          capabilities: ["training", "roleplay"],
          id: "grant-intero",
          version: 3,
        }),
      }),
      "org-intero",
    );

    expect(result).toEqual({
      capabilities: ["training", "roleplay"],
      grantId: "grant-intero",
      mode: "managed",
      version: 3,
    });
    expect(hasManagedCapability(result, "roleplay")).toBe(true);
    expect(hasManagedCapability(result, "call_upload")).toBe(false);
  });

  it("preserves explicitly marked legacy organizations during migration", async () => {
    const findActiveManagedGrant = vi.fn();
    const result = await resolveOrganizationCapabilities(
      repository({
        findActiveManagedGrant,
        findOrganizationAccessModel: vi.fn().mockResolvedValue("legacy"),
      }),
      "org-legacy",
    );

    expect(result.mode).toBe("legacy");
    expect(findActiveManagedGrant).not.toHaveBeenCalled();
    expect(hasManagedCapability(result, "call_upload")).toBe(true);
  });

  it("does not resolve one organization's grant for another organization id", async () => {
    const findActiveManagedGrant = vi.fn().mockImplementation(async (orgId: string) =>
      orgId === "org-intero"
        ? {
            capabilities: ["training" as const],
            id: "grant-intero",
            version: 1,
          }
        : null,
    );
    const accessRepository = repository({ findActiveManagedGrant });

    const intero = await resolveOrganizationCapabilities(accessRepository, "org-intero");
    const anotherAccount = await resolveOrganizationCapabilities(
      accessRepository,
      "org-another",
    );

    expect(hasManagedCapability(intero, "training")).toBe(true);
    expect(hasManagedCapability(anotherAccount, "training")).toBe(false);
    expect(findActiveManagedGrant).toHaveBeenNthCalledWith(1, "org-intero");
    expect(findActiveManagedGrant).toHaveBeenNthCalledWith(2, "org-another");
  });
});
