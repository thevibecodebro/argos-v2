export type PlatformTotpFactor = {
  id: string;
  status?: string | null;
};

export type PlatformTotpEnrollment = {
  id: string;
  totp?: {
    qr_code?: string | null;
    secret?: string | null;
  } | null;
};

type PlatformMfaClient = {
  auth: {
    mfa: {
      challengeAndVerify(input: {
        factorId: string;
        code: string;
      }): Promise<{ data: unknown; error: { message: string } | null }>;
      enroll(input: {
        factorType: "totp";
      }): Promise<{ data: PlatformTotpEnrollment | null; error: { message: string } | null }>;
      listFactors(): Promise<{
        data: { totp?: PlatformTotpFactor[] | null } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

function assertNoMfaError(error: { message: string } | null, action: string) {
  if (error) {
    throw new Error(`Failed to ${action}: ${error.message}`);
  }
}

export async function getVerifiedTotpFactors(supabase: PlatformMfaClient) {
  const { data, error } = await supabase.auth.mfa.listFactors();
  assertNoMfaError(error, "list platform MFA factors");

  return (data?.totp ?? []).filter((factor) => factor.status === "verified");
}

export async function enrollPlatformTotp(supabase: PlatformMfaClient) {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  assertNoMfaError(error, "enroll platform TOTP MFA");

  if (!data) {
    throw new Error("Failed to enroll platform TOTP MFA: missing enrollment data");
  }

  return data;
}

export async function verifyPlatformTotpCode(
  supabase: PlatformMfaClient,
  input: { factorId: string; code: string },
) {
  const factorId = input.factorId.trim();
  const code = input.code.trim();

  if (!factorId) {
    throw new Error("TOTP factor id is required");
  }

  if (!code) {
    throw new Error("TOTP code is required");
  }

  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  assertNoMfaError(error, "verify platform TOTP MFA");

  return data;
}
