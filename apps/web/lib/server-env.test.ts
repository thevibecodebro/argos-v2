import { describe, expect, it } from "vitest";
import { getServerEnv } from "./server-env";

describe("getServerEnv", () => {
  it("returns required server-side Supabase values", () => {
    expect(
      getServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toEqual({
      supabaseUrl: "https://mlluqkmmcfqjmjqoparf.supabase.co",
      supabaseAnonKey: "anon-key",
      siteUrl: "http://localhost:3000",
      supabaseServiceRoleKey: "service-role-key",
      databaseUrl: undefined,
    });
  });

  it("throws when the service role key is missing", () => {
    expect(() =>
      getServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toThrow("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  });
});
