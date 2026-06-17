import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_PRODUCT_CAPTURE_ROUTES,
  isHomepageProductCaptureEnabled,
} from "./homepage-product-capture";

describe("homepage product capture mode", () => {
  it("is explicitly enabled only outside production", () => {
    expect(
      isHomepageProductCaptureEnabled({
        ARGOS_HOMEPAGE_SCREENSHOT_MODE: "true",
        NODE_ENV: "development",
      }),
    ).toBe(true);

    expect(
      isHomepageProductCaptureEnabled({
        ARGOS_HOMEPAGE_SCREENSHOT_MODE: "true",
        NODE_ENV: "production",
      }),
    ).toBe(false);

    expect(
      isHomepageProductCaptureEnabled({
        ARGOS_HOMEPAGE_SCREENSHOT_MODE: "false",
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });

  it("defines the eight canonical homepage screenshot cards", () => {
    expect(HOMEPAGE_PRODUCT_CAPTURE_ROUTES.map((route) => route.slug)).toEqual([
      "dashboard",
      "calls",
      "scorecard",
      "highlights",
      "training",
      "roleplay",
      "team",
      "leaderboard",
    ]);

    expect(HOMEPAGE_PRODUCT_CAPTURE_ROUTES.map((route) => route.imageName)).toEqual([
      "argos-dashboard.png",
      "argos-calls.png",
      "argos-scorecard.png",
      "argos-highlights.png",
      "argos-training.png",
      "argos-roleplay.png",
      "argos-team.png",
      "argos-leaderboard.png",
    ]);
  });
});
