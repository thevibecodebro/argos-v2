import { describe, expect, it } from "vitest";
import { resolvePgSsl } from "./client";

describe("resolvePgSsl", () => {
  it("does not use TLS for local Postgres without sslmode", () => {
    expect(resolvePgSsl("postgresql://postgres:postgres@localhost:5432/argos")).toBe(false);
    expect(resolvePgSsl("postgresql://postgres:postgres@127.0.0.1:5432/argos")).toBe(false);
    expect(resolvePgSsl("postgresql://postgres:postgres@[::1]:5432/argos")).toBe(false);
  });

  it("allows explicit sslmode=disable for local development", () => {
    expect(resolvePgSsl("postgresql://postgres:postgres@db.example.com:5432/argos?sslmode=disable")).toBe(false);
  });

  it("verifies hosted Postgres certificates by default", () => {
    expect(resolvePgSsl("postgresql://postgres:postgres@db.example.com:5432/argos")).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("trusts the public Supabase root CA for Supabase Postgres hosts", () => {
    expect(resolvePgSsl("postgresql://postgres:postgres@db.project-ref.supabase.co:5432/argos")).toEqual({
      ca: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
      rejectUnauthorized: true,
    });
    expect(resolvePgSsl("postgresql://postgres:postgres@aws-0-us-east-2.pooler.supabase.com:6543/argos?sslmode=require")).toEqual({
      ca: expect.stringContaining("-----BEGIN CERTIFICATE-----"),
      rejectUnauthorized: true,
    });
  });

  it("verifies certificates when sslmode is requested", () => {
    expect(resolvePgSsl("postgresql://postgres:postgres@db.example.com:5432/argos?sslmode=require")).toEqual({
      rejectUnauthorized: true,
    });
    expect(resolvePgSsl("postgresql://postgres:postgres@db.example.com:5432/argos?sslmode=verify-full")).toEqual({
      rejectUnauthorized: true,
    });
  });
});
