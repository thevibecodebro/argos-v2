import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const supabaseConfigSource = readFileSync(
  new URL("../../../supabase/config.toml", import.meta.url),
  "utf8",
);
const loginFormSource = readFileSync(
  new URL("../components/auth/login-form.tsx", import.meta.url),
  "utf8",
);

describe("invite-only auth configuration", () => {
  it("allows OAuth auth users so orgless Google accounts can reach onboarding", () => {
    expect(supabaseConfigSource).toMatch(/\[auth\][\s\S]*?enable_signup = true/);
  });

  it("keeps email magic links from creating new auth users", () => {
    expect(supabaseConfigSource).toMatch(/\[auth\.email\][\s\S]*?enable_signup = false/);
    expect(loginFormSource).toContain("shouldCreateUser: false");
  });
});
