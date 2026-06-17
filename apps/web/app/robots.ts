import type { MetadataRoute } from "next";
import { AI_CRAWLER_USER_AGENTS, PRIVATE_CRAWL_PATHS, absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const publicRules = {
    allow: ["/"],
    disallow: [...PRIVATE_CRAWL_PATHS],
  };

  return {
    rules: [
      {
        userAgent: "*",
        ...publicRules,
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        ...publicRules,
      })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
