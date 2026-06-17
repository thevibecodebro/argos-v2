export const DEFAULT_PUBLIC_SITE_URL = "https://argos-v2-nine.vercel.app";
export const SITE_NAME = "Argos";
export const HOME_PAGE_TITLE = "Build a sales team that actually follows the playbook.";
export const HOME_TITLE = `${SITE_NAME} | ${HOME_PAGE_TITLE}`;
export const HOME_DESCRIPTION =
  "Argos turns real sales calls into scored evidence, manager coaching actions, roleplay practice, and progress signals for sales teams.";
export const PRODUCT_DEFINITION =
  "Argos is a web platform for sales teams that turns real sales calls into scored evidence, coaching actions, roleplay practice, and progress signals managers can track across the team.";
export const SOCIAL_IMAGE_PATH = "/opengraph-image";
export const LOGO_PATH = "/argos_logo_background.png";

export const PRIVATE_CRAWL_PATHS = [
  "/calls",
  "/dashboard",
  "/highlights",
  "/invite",
  "/leaderboard",
  "/notifications",
  "/onboarding",
  "/roleplay",
  "/settings",
  "/team",
  "/training",
  "/upload",
] as const;

export const AI_CRAWLER_USER_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
] as const;

export const PUBLIC_ROUTES = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/privacy-policy",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/terms-of-service",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/security-policy",
    changeFrequency: "yearly",
    priority: 0.4,
  },
] as const;

export function getPublicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl || configuredUrl === "undefined") {
    return DEFAULT_PUBLIC_SITE_URL;
  }

  return configuredUrl.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return new URL(normalizedPath, `${getPublicSiteUrl()}/`).toString();
}

export function buildLlmsText() {
  const publicPages = PUBLIC_ROUTES.map((route) => `- ${absoluteUrl(route.path)}`).join("\n");
  const aiCrawlers = AI_CRAWLER_USER_AGENTS.map((agent) => `- ${agent}`).join("\n");

  return [
    "# Argos",
    "",
    PRODUCT_DEFINITION,
    "",
    "## Canonical URLs",
    "",
    publicPages,
    "",
    "## Product Summary",
    "",
    `- Homepage headline: ${HOME_PAGE_TITLE}`,
    "- Category: sales coaching platform for sales teams and managers.",
    "- Core workflow: call review -> scored evidence -> coaching action -> roleplay practice -> next-call progress signal.",
    "- Main users: sales managers, sales leaders, and reps who need coaching tied to real conversations.",
    "- Public pricing is not currently published on the homepage.",
    "- Demo path: book a guided walkthrough from the public homepage.",
    "",
    "## Public Policies",
    "",
    `- Privacy Policy: ${absoluteUrl("/privacy-policy")}`,
    `- Terms of Service: ${absoluteUrl("/terms-of-service")}`,
    `- Security Policy: ${absoluteUrl("/security-policy")}`,
    "",
    "## AI Crawler Posture",
    "",
    "Argos allows public search and user-triggered AI crawlers to access public marketing and policy pages. Authenticated application paths are not public crawl targets.",
    "",
    aiCrawlers,
    "",
  ].join("\n");
}
