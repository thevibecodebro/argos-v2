import { describe, expect, it } from "vitest";
import {
  buildAuthRedirectUrl,
  getBrowserWebEnv,
  getBrowserWebEnvConfigurationError,
  getDevelopmentStartupEnvError,
  getMissingWebEnvKeys,
  getWebEnv,
  getWebEnvConfigurationError,
} from "./env";

describe("getWebEnv", () => {
  it("returns required Supabase env values", () => {
    const env = getWebEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_SITE_URL: "https://argos-v2.app",
    });

    expect(env).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      siteUrl: "https://argos-v2.app",
    });
  });

  it("falls back to the current Vercel deployment URL when a production site URL is absent", () => {
    const env = getWebEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_VERCEL_URL: "argos-v2-git-main-thevibecodebro.vercel.app",
    });

    expect(env.siteUrl).toBe("https://argos-v2-git-main-thevibecodebro.vercel.app");
  });

  it("defaults siteUrl to localhost when no public site URL is available", () => {
    const env = getWebEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(env.siteUrl).toBe("http://localhost:3000");
  });

  it("throws when required Supabase env values are missing", () => {
    expect(() => getWebEnv({ NEXT_PUBLIC_SITE_URL: "https://argos-v2.app" })).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});

describe("getMissingWebEnvKeys", () => {
  it("returns all missing public Supabase keys", () => {
    expect(getMissingWebEnvKeys({ NEXT_PUBLIC_SITE_URL: "https://argos-v2.app" })).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  });

  it("returns an empty list when the browser auth config is present", () => {
    expect(
      getMissingWebEnvKeys({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual([]);
  });
});

describe("getWebEnvConfigurationError", () => {
  it("returns a user-facing auth configuration error when public env keys are missing", () => {
    expect(getWebEnvConfigurationError({ NEXT_PUBLIC_SITE_URL: "https://argos-v2.app" })).toBe(
      "Auth is not configured for this environment. Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  });

  it("returns null when the browser auth config is present", () => {
    expect(
      getWebEnvConfigurationError({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toBeNull();
  });
});

describe("browser runtime env helpers", () => {
  it("read NEXT_PUBLIC Supabase values directly from process.env", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    expect(getBrowserWebEnv()).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      siteUrl: "http://localhost:3000",
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("report missing NEXT_PUBLIC keys from the runtime env helper", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getBrowserWebEnvConfigurationError()).toBe(
      "Auth is not configured for this environment. Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  });
});

describe("buildAuthRedirectUrl", () => {
  it("prefers the current runtime origin for auth callbacks", () => {
    const redirectUrl = buildAuthRedirectUrl("/dashboard?tab=recent", {
      runtimeOrigin: "https://preview.example.vercel.app",
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "https://argos-v2.app",
      },
    });

    expect(redirectUrl).toBe(
      "https://preview.example.vercel.app/auth/callback?next=%2Fdashboard%3Ftab%3Drecent",
    );
  });

  it("falls back to resolved env site URL when no runtime origin exists", () => {
    const redirectUrl = buildAuthRedirectUrl("/dashboard", {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_VERCEL_URL: "argos-v2.vercel.app",
      },
    });

    expect(redirectUrl).toBe("https://argos-v2.vercel.app/auth/callback?next=%2Fdashboard");
  });
});

describe("getDevelopmentStartupEnvError", () => {
  it("returns a development-only startup error when required public auth env is missing", () => {
    expect(
      getDevelopmentStartupEnvError({
        env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
        nodeEnv: "development",
      }),
    ).toBe(
      "Auth is not configured for this environment. Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  });

  it("does not block startup in production when public auth env is missing", () => {
    expect(
      getDevelopmentStartupEnvError({
        env: { NEXT_PUBLIC_SITE_URL: "https://argos-v2.app" },
        nodeEnv: "production",
      }),
    ).toBeNull();
  });

  it("returns null when required auth env is present", () => {
    expect(
      getDevelopmentStartupEnvError({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
        nodeEnv: "development",
      }),
    ).toBeNull();
  });
});
