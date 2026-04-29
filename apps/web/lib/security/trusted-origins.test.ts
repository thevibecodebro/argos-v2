import { describe, expect, it } from "vitest";
import {
  getSafeRequestOrigin,
  getTrustedOrigins,
  isTrustedOrigin,
} from "./trusted-origins";

describe("trusted origin helpers", () => {
  it("normalizes the site URL and comma-separated allowed origins", () => {
    expect(
      getTrustedOrigins({
        ARGOS_ALLOWED_ORIGINS:
          "https://preview.argos.ai/, staging.argos.ai, http://localhost:3100/path",
        NEXT_PUBLIC_SITE_URL: "https://app.argos.ai/",
      }),
    ).toEqual([
      "https://app.argos.ai",
      "https://preview.argos.ai",
      "https://staging.argos.ai",
      "http://localhost:3100",
    ]);
  });

  it("accepts a trusted forwarded origin in production", () => {
    const request = new Request("http://internal.argos.local/api/integrations/zoom/connect", {
      headers: {
        "x-forwarded-host": "preview.argos.ai",
        "x-forwarded-proto": "https",
      },
    });

    expect(
      getSafeRequestOrigin(request, {
        env: {
          ARGOS_ALLOWED_ORIGINS: "https://preview.argos.ai",
          NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
        },
        nodeEnv: "production",
      }),
    ).toBe("https://preview.argos.ai");
  });

  it("falls back to the trusted site origin for untrusted forwarded hosts in production", () => {
    const request = new Request("http://internal.argos.local/auth/callback", {
      headers: {
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(
      getSafeRequestOrigin(request, {
        env: {
          ARGOS_ALLOWED_ORIGINS: "https://preview.argos.ai",
          NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
        },
        nodeEnv: "production",
      }),
    ).toBe("https://app.argos.ai");
  });

  it("uses the Vercel URL fallback chain when the production site URL is missing", () => {
    const request = new Request("http://internal.argos.local/auth/callback", {
      headers: {
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(
      getSafeRequestOrigin(request, {
        env: {
          NEXT_PUBLIC_VERCEL_URL: "argos-preview.vercel.app",
        },
        nodeEnv: "production",
      }),
    ).toBe("https://argos-preview.vercel.app");
  });

  it("skips an invalid production site URL and uses the next Vercel fallback", () => {
    const request = new Request("http://internal.argos.local/auth/callback", {
      headers: {
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(
      getSafeRequestOrigin(request, {
        env: {
          NEXT_PUBLIC_SITE_URL: "not a valid url",
          VERCEL_PROJECT_PRODUCTION_URL: "argos.ai",
        },
        nodeEnv: "production",
      }),
    ).toBe("https://argos.ai");
  });

  it("fails closed in production when no trusted site origin can be resolved", () => {
    const request = new Request("http://internal.argos.local/auth/callback", {
      headers: {
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(() =>
      getSafeRequestOrigin(request, {
        env: {},
        nodeEnv: "production",
      }),
    ).toThrow("Missing trusted production site origin");
  });

  it("rejects invalid forwarded protocols in production", () => {
    const request = new Request("https://app.argos.ai/auth/callback", {
      headers: {
        "x-forwarded-host": "preview.argos.ai",
        "x-forwarded-proto": "javascript",
      },
    });

    expect(
      getSafeRequestOrigin(request, {
        env: {
          ARGOS_ALLOWED_ORIGINS: "https://preview.argos.ai",
          NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
        },
        nodeEnv: "production",
      }),
    ).toBe("https://app.argos.ai");
  });

  it("keeps localhost requests on the request origin outside production", () => {
    const request = new Request("http://localhost:3100/api/integrations/zoom/connect", {
      headers: {
        "x-forwarded-host": "preview.argos.ai",
        "x-forwarded-proto": "https",
      },
    });

    expect(
      getSafeRequestOrigin(request, {
        env: {
          NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
        },
        nodeEnv: "development",
      }),
    ).toBe("http://localhost:3100");
  });

  it("matches trusted origins after normalization", () => {
    expect(
      isTrustedOrigin("https://preview.argos.ai/", {
        ARGOS_ALLOWED_ORIGINS: "preview.argos.ai",
        NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
      }),
    ).toBe(true);
  });
});
