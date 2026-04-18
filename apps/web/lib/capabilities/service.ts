type EnvSource = Partial<Record<string, string | undefined>>;

export type CapabilityStatus = {
  available: boolean;
  reason: string | null;
};

function hasConfiguredValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function buildMissingKeysReason(prefix: string, keys: string[]): CapabilityStatus {
  return {
    available: false,
    reason: `${prefix} Missing: ${keys.join(", ")}.`,
  };
}

export function getZoomOAuthCapability(env: EnvSource = process.env): CapabilityStatus {
  const missing: string[] = [];

  if (!hasConfiguredValue(env.ZOOM_CLIENT_ID)) {
    missing.push("ZOOM_CLIENT_ID");
  }

  if (!hasConfiguredValue(env.ZOOM_CLIENT_SECRET)) {
    missing.push("ZOOM_CLIENT_SECRET");
  }

  if (missing.length > 0) {
    return buildMissingKeysReason("Zoom OAuth is not configured.", missing);
  }

  return {
    available: true,
    reason: null,
  };
}

export function getGhlOAuthCapability(env: EnvSource = process.env): CapabilityStatus {
  const missing: string[] = [];

  if (!hasConfiguredValue(env.GHL_CLIENT_ID)) {
    missing.push("GHL_CLIENT_ID");
  }

  if (!hasConfiguredValue(env.GHL_CLIENT_SECRET)) {
    missing.push("GHL_CLIENT_SECRET");
  }

  if (missing.length > 0) {
    return buildMissingKeysReason("Go High Level OAuth is not configured.", missing);
  }

  return {
    available: true,
    reason: null,
  };
}

export function getTrainingAiCapability(env: EnvSource = process.env): CapabilityStatus {
  if (!hasConfiguredValue(env.OPENAI_API_KEY)) {
    return {
      available: false,
      reason: "OPENAI_API_KEY is missing",
    };
  }

  return {
    available: true,
    reason: null,
  };
}

export function getRoleplayVoiceCapability(env: EnvSource = process.env): CapabilityStatus {
  if (!hasConfiguredValue(env.OPENAI_API_KEY)) {
    return {
      available: false,
      reason: "Voice features are not configured. Missing: OPENAI_API_KEY.",
    };
  }

  return {
    available: true,
    reason: null,
  };
}

export function getInviteEmailCapability(env: EnvSource = process.env): CapabilityStatus {
  const missing: string[] = [];

  if (!hasConfiguredValue(env.RESEND_API_KEY)) {
    missing.push("RESEND_API_KEY");
  }

  if (!hasConfiguredValue(env.NEXT_PUBLIC_SITE_URL)) {
    missing.push("NEXT_PUBLIC_SITE_URL");
  }

  if (missing.length > 0) {
    return buildMissingKeysReason("Invite email delivery is not configured.", missing);
  }

  return {
    available: true,
    reason: null,
  };
}
