import { describe, expect, it, vi } from "vitest";
import {
  enrollPlatformTotp,
  getVerifiedTotpFactors,
  verifyPlatformTotpCode,
} from "./mfa";

function createMfaClient() {
  return {
    auth: {
      mfa: {
        challengeAndVerify: vi.fn().mockResolvedValue({ data: { user: { id: "auth-user-1" } }, error: null }),
        enroll: vi.fn().mockResolvedValue({
          data: {
            id: "factor-1",
            totp: {
              qr_code: "otpauth://totp/Argos:owner@argos.ai",
              secret: "SECRET123",
            },
          },
          error: null,
        }),
        unenroll: vi.fn().mockResolvedValue({
          data: { id: "factor-2" },
          error: null,
        }),
        listFactors: vi.fn().mockResolvedValue({
          data: {
            all: [
              { id: "factor-1", factor_type: "totp", status: "verified" },
              { id: "factor-2", factor_type: "totp", status: "unverified" },
            ],
            totp: [
              { id: "factor-1", status: "verified" },
              { id: "factor-2", status: "unverified" },
            ],
          },
          error: null,
        }),
      },
    },
  };
}

describe("platform MFA helpers", () => {
  it("returns only verified TOTP factors", async () => {
    const supabase = createMfaClient();

    await expect(getVerifiedTotpFactors(supabase)).resolves.toEqual([
      { id: "factor-1", status: "verified" },
    ]);

    expect(supabase.auth.mfa.listFactors).toHaveBeenCalled();
  });

  it("enrolls a TOTP factor for platform access", async () => {
    const supabase = createMfaClient();

    await expect(enrollPlatformTotp(supabase)).resolves.toEqual({
      id: "factor-1",
      totp: {
        qr_code: "otpauth://totp/Argos:owner@argos.ai",
        secret: "SECRET123",
      },
    });

    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({ factorType: "totp" });
  });

  it("removes stale unverified TOTP factors before enrolling a fresh setup factor", async () => {
    const supabase = createMfaClient();

    await expect(enrollPlatformTotp(supabase)).resolves.toEqual({
      id: "factor-1",
      totp: {
        qr_code: "otpauth://totp/Argos:owner@argos.ai",
        secret: "SECRET123",
      },
    });

    expect(supabase.auth.mfa.listFactors).toHaveBeenCalled();
    expect(supabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: "factor-2" });
    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({ factorType: "totp" });
  });

  it("removes stale unverified TOTP factors from all listed factors before enrolling", async () => {
    const supabase = createMfaClient();
    supabase.auth.mfa.listFactors.mockResolvedValueOnce({
      data: {
        all: [
          { id: "factor-stale", factor_type: "totp", status: "unverified" },
        ],
        totp: [],
      },
      error: null,
    });

    await expect(enrollPlatformTotp(supabase)).resolves.toEqual({
      id: "factor-1",
      totp: {
        qr_code: "otpauth://totp/Argos:owner@argos.ai",
        secret: "SECRET123",
      },
    });

    expect(supabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: "factor-stale" });
    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({ factorType: "totp" });
  });

  it("verifies a TOTP factor challenge code", async () => {
    const supabase = createMfaClient();

    await expect(
      verifyPlatformTotpCode(supabase, {
        factorId: "factor-1",
        code: "123456",
      }),
    ).resolves.toEqual({ user: { id: "auth-user-1" } });

    expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: "factor-1",
      code: "123456",
    });
  });
});
