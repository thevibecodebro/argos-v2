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
  it("keeps local Supabase signup disabled", () => {
    expect(supabaseConfigSource).toMatch(/\[auth\][\s\S]*?enable_signup = false/);
    expect(supabaseConfigSource).toMatch(/\[auth\.email\][\s\S]*?enable_signup = false/);
  });

  it("prevents browser magic links from creating new auth users", () => {
    expect(loginFormSource).toContain("shouldCreateUser: false");
  });
});
