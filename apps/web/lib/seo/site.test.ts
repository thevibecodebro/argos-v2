import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_CRAWLER_USER_AGENTS,
  DEFAULT_PUBLIC_SITE_URL,
  HOME_DESCRIPTION,
  HOME_PAGE_TITLE,
  HOME_TITLE,
  PRODUCT_DEFINITION,
  PUBLIC_ROUTES,
  absoluteUrl,
  buildLlmsText,
  getPublicSiteUrl,
} from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public SEO site config", () => {
  it("normalizes the public site URL from the environment", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");

    expect(getPublicSiteUrl()).toBe("https://example.com");
    expect(absoluteUrl("/privacy-policy")).toBe("https://example.com/privacy-policy");
    expect(absoluteUrl("security-policy")).toBe("https://example.com/security-policy");
  });

  it("falls back to the audited public Vercel URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);

    expect(getPublicSiteUrl()).toBe(DEFAULT_PUBLIC_SITE_URL);
    expect(absoluteUrl("/")).toBe(`${DEFAULT_PUBLIC_SITE_URL}/`);
  });

  it("keeps the public narrative consistent across SEO surfaces", () => {
    expect(HOME_TITLE).toBe("Argos | Build a sales team that actually follows the playbook.");
    expect(HOME_PAGE_TITLE).toBe("Build a sales team that actually follows the playbook.");
    expect(HOME_DESCRIPTION).toContain("real sales calls");
    expect(PRODUCT_DEFINITION).toContain("scored evidence");
    expect(PUBLIC_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/privacy-policy",
      "/terms-of-service",
      "/security-policy",
    ]);
    expect(AI_CRAWLER_USER_AGENTS).toEqual([
      "OAI-SearchBot",
      "ChatGPT-User",
      "Claude-SearchBot",
      "PerplexityBot",
      "Perplexity-User",
    ]);
  });

  it("builds an llms.txt body with canonical public facts", () => {
    const text = buildLlmsText();

    expect(text).toContain("# Argos");
    expect(text).toContain("Build a sales team that actually follows the playbook.");
    expect(text).toContain(PRODUCT_DEFINITION);
    expect(text).toContain(`${DEFAULT_PUBLIC_SITE_URL}/privacy-policy`);
    expect(text).toContain("Public pricing is not currently published on the homepage.");
    expect(text).toContain("OAI-SearchBot");
    expect(text).not.toContain("Solo, Team, Enterprise");
  });
});
