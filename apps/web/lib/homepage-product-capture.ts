type CaptureEnv = Record<string, string | undefined>;

export const HOMEPAGE_PRODUCT_CAPTURE_ROUTES = [
  {
    alt: "Argos dashboard showing manager coaching attention across the team.",
    emphasis: "before the week gets away.",
    headline: "Know where to coach",
    id: "dashboard-attention",
    image: "/homepage-product/argos-dashboard.png",
    imageName: "argos-dashboard.png",
    label: "Dashboard",
    slug: "dashboard",
  },
  {
    alt: "Argos call library showing reviewed sales conversations with scores and reps.",
    emphasis: "your team actually had.",
    headline: "Start with the conversations",
    id: "call-library",
    image: "/homepage-product/argos-calls.png",
    imageName: "argos-calls.png",
    label: "Calls",
    slug: "calls",
  },
  {
    alt: "Argos scorecard showing transcript evidence, coaching moments, and next practice.",
    emphasis: "that make or break the sale.",
    headline: "Score the moments",
    id: "scorecard",
    image: "/homepage-product/argos-scorecard.png",
    imageName: "argos-scorecard.png",
    label: "Scorecards",
    slug: "scorecard",
  },
  {
    alt: "Argos highlights showing saved coaching moments and manager notes.",
    emphasis: "every manager should coach.",
    headline: "Pull out the moment",
    id: "coaching-highlight",
    image: "/homepage-product/argos-highlights.png",
    imageName: "argos-highlights.png",
    label: "Highlights",
    slug: "highlights",
  },
  {
    alt: "Argos training showing assigned modules, progress, and a lesson checkpoint.",
    emphasis: "while the call is still fresh.",
    headline: "Assign the fix",
    id: "training-assignment",
    image: "/homepage-product/argos-training.png",
    imageName: "argos-training.png",
    label: "Training",
    slug: "training",
  },
  {
    alt: "Argos roleplay showing a call-based practice simulation and scorecard.",
    emphasis: "before the next live call.",
    headline: "Practice the pushback",
    id: "roleplay-practice",
    image: "/homepage-product/argos-roleplay.png",
    imageName: "argos-roleplay.png",
    label: "Roleplay",
    slug: "roleplay",
  },
  {
    alt: "Argos team view showing reps, coaching flags, scores, and trends.",
    emphasis: "without hunting through calls.",
    headline: "See who needs help",
    id: "team-visibility",
    image: "/homepage-product/argos-team.png",
    imageName: "argos-team.png",
    label: "Team",
    slug: "team",
  },
  {
    alt: "Argos leaderboard showing score quality, call volume, and improvement across reps.",
    emphasis: "is spreading across the team.",
    headline: "Track whether the standard",
    id: "leaderboard",
    image: "/homepage-product/argos-leaderboard.png",
    imageName: "argos-leaderboard.png",
    label: "Leaderboard",
    slug: "leaderboard",
  },
] as const;

export type HomepageProductCaptureSlug =
  (typeof HOMEPAGE_PRODUCT_CAPTURE_ROUTES)[number]["slug"];

export function isHomepageProductCaptureEnabled(
  env: CaptureEnv = getProcessEnv(),
) {
  return (
    env.ARGOS_HOMEPAGE_SCREENSHOT_MODE === "true" &&
    env.NODE_ENV !== "production"
  );
}

export function getHomepageProductCaptureRoute(slug: string) {
  return HOMEPAGE_PRODUCT_CAPTURE_ROUTES.find((route) => route.slug === slug) ?? null;
}

function getProcessEnv(): CaptureEnv {
  if (typeof process === "undefined") {
    return {};
  }

  return process.env;
}
