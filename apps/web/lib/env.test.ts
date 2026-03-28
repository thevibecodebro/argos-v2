import { describe, expect, it } from "vitest";
import { getWebEnv } from "./env";

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

  it("throws when required Supabase env values are missing", () => {
    expect(() => getWebEnv({})).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});

