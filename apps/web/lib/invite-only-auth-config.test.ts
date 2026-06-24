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

function getAdditionalRedirectUrls() {
  const match = supabaseConfigSource.match(/additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/);

  if (!match) {
    throw new Error("Missing additional_redirect_urls in Supabase auth config");
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g), ([, value]) => value);
}

describe("invite-only auth configuration", () => {
  it("allows OAuth auth users so orgless Google accounts can reach onboarding", () => {
    expect(supabaseConfigSource).toMatch(/\[auth\][\s\S]*?enable_signup = true/);
  });

  it("keeps email magic links from creating new auth users", () => {
    expect(supabaseConfigSource).toMatch(/\[auth\.email\][\s\S]*?enable_signup = false/);
    expect(loginFormSource).toContain("shouldCreateUser: false");
  });

  it("does not allow arbitrary Vercel domains as auth redirect targets", () => {
    const redirectUrls = getAdditionalRedirectUrls();

    expect(redirectUrls).not.toContain("https://**.vercel.app/**");
    expect(redirectUrls).toContain("https://argosrevenuecommand.com/auth/callback");
    expect(redirectUrls).toContain("https://www.argosrevenuecommand.com/auth/callback");
    expect(redirectUrls).toContain("https://*-thevibecodebro.vercel.app/auth/callback");
  });
});
