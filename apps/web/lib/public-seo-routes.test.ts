import { afterEach, describe, expect, it, vi } from "vitest";
import * as llmsRoute from "../app/llms.txt/route";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import {
  AI_CRAWLER_USER_AGENTS,
  DEFAULT_PUBLIC_SITE_URL,
  PRIVATE_CRAWL_PATHS,
  PRODUCT_DEFINITION,
  absoluteUrl,
} from "./seo/site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public SEO metadata routes", () => {
  it("emits robots rules for public and private paths", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", DEFAULT_PUBLIC_SITE_URL);
    const result = robots();

    expect(result.sitemap).toBe(absoluteUrl("/sitemap.xml"));
    expect(result.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userAgent: "*",
          allow: ["/"],
          disallow: [...PRIVATE_CRAWL_PATHS],
        }),
      ]),
    );

    for (const agent of AI_CRAWLER_USER_AGENTS) {
      expect(result.rules).toContainEqual({
        userAgent: agent,
        allow: ["/"],
        disallow: [...PRIVATE_CRAWL_PATHS],
      });
    }
  });

  it("emits a sitemap for crawlable public pages", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", DEFAULT_PUBLIC_SITE_URL);
    const result = sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      absoluteUrl("/"),
      absoluteUrl("/privacy-policy"),
      absoluteUrl("/terms-of-service"),
      absoluteUrl("/security-policy"),
    ]);
    expect(result[0]).toMatchObject({ changeFrequency: "weekly", priority: 1 });
    expect(result[1]).toMatchObject({ changeFrequency: "yearly", priority: 0.3 });
    expect(result[2]).toMatchObject({ changeFrequency: "yearly", priority: 0.3 });
    expect(result[3]).toMatchObject({ changeFrequency: "yearly", priority: 0.4 });
  });

  it("serves llms.txt as plain text", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", DEFAULT_PUBLIC_SITE_URL);
    const response = await llmsRoute.GET();
    const text = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(text).toContain(PRODUCT_DEFINITION);
    expect(text).toContain(absoluteUrl("/security-policy"));
    expect(text).toContain("Public pricing is not currently published on the homepage.");
  });
});
