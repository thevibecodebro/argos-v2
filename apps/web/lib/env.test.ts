import { describe, expect, it } from "vitest";
import { buildAuthRedirectUrl, getWebEnv } from "./env";

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
