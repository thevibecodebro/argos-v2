export const MANAGED_CAPABILITY_KEYS = [
  "training",
  "roleplay",
  "roleplay_voice",
  "custom_scenarios",
  "team_rubrics",
  "practice_reporting",
  "call_upload",
  "call_ingestion",
  "call_scoring",
  "highlights",
  "call_analytics",
  "leaderboard",
  "integration_google_meet",
  "integration_ghl",
  "integration_zoom",
  "workspace_branding",
] as const;

export type ManagedCapabilityKey = (typeof MANAGED_CAPABILITY_KEYS)[number];

export const INTERO_PRACTICE_PILOT_CAPABILITIES = [
  "training",
  "roleplay",
  "roleplay_voice",
  "custom_scenarios",
  "practice_reporting",
  "workspace_branding",
] as const satisfies readonly ManagedCapabilityKey[];

const managedCapabilitySet = new Set<string>(MANAGED_CAPABILITY_KEYS);

type ManagedCapabilityValidationResult =
  | { ok: true; capabilities: ManagedCapabilityKey[] }
  | { ok: false; error: string };

function requires(
  capabilities: Set<ManagedCapabilityKey>,
  capability: ManagedCapabilityKey,
  dependency: ManagedCapabilityKey,
): ManagedCapabilityValidationResult | null {
  if (capabilities.has(capability) && !capabilities.has(dependency)) {
    return { ok: false, error: `${capability} requires ${dependency}` };
  }

  return null;
}

export function normalizeManagedCapabilities(
  input: unknown,
): ManagedCapabilityValidationResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: "capabilities must be an array" };
  }

  for (const value of input) {
    if (typeof value !== "string" || !managedCapabilitySet.has(value)) {
      return {
        ok: false,
        error: `Unknown managed capability: ${typeof value === "string" ? value : String(value)}`,
      };
    }
  }

  const requested = new Set(input as ManagedCapabilityKey[]);
  const capabilities = MANAGED_CAPABILITY_KEYS.filter((key) => requested.has(key));
  const capabilitySet = new Set(capabilities);

  for (const [capability, dependency] of [
    ["roleplay_voice", "roleplay"],
    ["custom_scenarios", "roleplay"],
    ["team_rubrics", "roleplay"],
    ["highlights", "call_scoring"],
    ["call_analytics", "call_scoring"],
    ["integration_google_meet", "call_ingestion"],
    ["integration_ghl", "call_ingestion"],
    ["integration_zoom", "call_ingestion"],
  ] as const) {
    const error = requires(capabilitySet, capability, dependency);
    if (error) return error;
  }

  if (
    capabilitySet.has("practice_reporting") &&
    !capabilitySet.has("training") &&
    !capabilitySet.has("roleplay")
  ) {
    return {
      ok: false,
      error: "practice_reporting requires training or roleplay",
    };
  }

  if (
    capabilitySet.has("call_scoring") &&
    !capabilitySet.has("call_upload") &&
    !capabilitySet.has("call_ingestion")
  ) {
    return {
      ok: false,
      error: "call_scoring requires call_upload or call_ingestion",
    };
  }

  return { ok: true, capabilities };
}

export type EffectiveOrganizationCapabilities = {
  capabilities: ManagedCapabilityKey[];
  grantId: string | null;
  mode: "inactive" | "legacy" | "managed";
  version: number | null;
};

export type ManagedAccessRepository = {
  findOrganizationAccessModel(
    orgId: string,
  ): Promise<"legacy" | "managed" | null>;
  findActiveManagedGrant(orgId: string): Promise<{
    capabilities: ManagedCapabilityKey[];
    id: string;
    version: number;
  } | null>;
};

export async function resolveOrganizationCapabilities(
  repository: ManagedAccessRepository,
  orgId: string,
): Promise<EffectiveOrganizationCapabilities> {
  const accessModel = await repository.findOrganizationAccessModel(orgId);

  if (accessModel !== "managed") {
    return {
      capabilities: [],
      grantId: null,
      mode: accessModel === "legacy" ? "legacy" : "inactive",
      version: null,
    };
  }

  const grant = await repository.findActiveManagedGrant(orgId);
  if (!grant) {
    return {
      capabilities: [],
      grantId: null,
      mode: "inactive",
      version: null,
    };
  }

  const normalized = normalizeManagedCapabilities(grant.capabilities);
  if (!normalized.ok) {
    return {
      capabilities: [],
      grantId: grant.id,
      mode: "inactive",
      version: grant.version,
    };
  }

  return {
    capabilities: normalized.capabilities,
    grantId: grant.id,
    mode: "managed",
    version: grant.version,
  };
}

export function hasManagedCapability(
  access: EffectiveOrganizationCapabilities,
  capability: ManagedCapabilityKey,
) {
  return access.mode === "legacy" || access.capabilities.includes(capability);
}

export function getManagedWorkspaceLandingPath(
  access: EffectiveOrganizationCapabilities,
) {
  if (access.mode === "inactive") return "/access-pending";
  if (hasManagedCapability(access, "call_analytics")) return "/dashboard";
  if (hasManagedCapability(access, "call_scoring")) return "/calls";
  if (hasManagedCapability(access, "training")) return "/training";
  if (hasManagedCapability(access, "roleplay")) return "/roleplay";
  return "/settings";
}
