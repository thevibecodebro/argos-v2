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

  it("requires production identity labels before returning privileged web values", () => {
    expect(() =>
      getServerEnv({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "https://argosrevenuecommand.com",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ENVIRONMENT: "preview",
      }),
    ).toThrow("APP_ENV=production");

    expect(() =>
      getServerEnv({
        APP_ENV: "production",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "https://argosrevenuecommand.com",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ENVIRONMENT: "preview",
      }),
    ).toThrow("SUPABASE_ENVIRONMENT=production");
  });

  it("accepts declared production identities for privileged web values", () => {
    expect(
      getServerEnv({
        APP_ENV: "production",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://mlluqkmmcfqjmjqoparf.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        NEXT_PUBLIC_SITE_URL: "https://argosrevenuecommand.com",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SUPABASE_ENVIRONMENT: "production",
        DATABASE_URL: "postgres://postgres:postgres@db.mlluqkmmcfqjmjqoparf.supabase.co:5432/postgres",
        DATABASE_ENVIRONMENT: "production",
      }),
    ).toMatchObject({
      supabaseUrl: "https://mlluqkmmcfqjmjqoparf.supabase.co",
      supabaseServiceRoleKey: "service-role-key",
      databaseUrl: "postgres://postgres:postgres@db.mlluqkmmcfqjmjqoparf.supabase.co:5432/postgres",
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
