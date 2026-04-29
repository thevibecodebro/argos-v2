import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServerClient = vi.fn();
const ensureUserProvisioned = vi.fn();
const SupabaseProvisioningRepository = vi.fn();
const isRetryableSupabaseAuthError = vi.fn();
const logAuthTransportFailure = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/provisioning/service", () => ({
  ensureUserProvisioned,
}));

vi.mock("@/lib/provisioning/repository", () => ({
  SupabaseProvisioningRepository,
}));

vi.mock("@/lib/supabase/auth-errors", () => ({
  isRetryableSupabaseAuthError,
}));

vi.mock("@/lib/supabase/auth-observability", () => ({
  logAuthTransportFailure,
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    createSupabaseServerClient.mockReset();
    ensureUserProvisioned.mockReset();
    SupabaseProvisioningRepository.mockReset();
    isRetryableSupabaseAuthError.mockReset();
    logAuthTransportFailure.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not reflect an untrusted forwarded host in production redirects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "founder@argos.ai",
              id: "auth-user-1",
            },
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue(undefined);

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=/dashboard", {
        headers: {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        },
      }),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/dashboard");
  });

  it("keeps callback next path-only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.argos.ai");

    createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "founder@argos.ai",
              id: "auth-user-1",
            },
          },
          error: null,
        }),
      },
    });
    ensureUserProvisioned.mockResolvedValue(undefined);

    const route = await import("../app/auth/callback/route");
    const response = await route.GET(
      new Request("https://app.argos.ai/auth/callback?code=auth-code&next=https://evil.example"),
    );

    expect(response.headers.get("location")).toBe("https://app.argos.ai/dashboard");
  });
});
