import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AuthenticatedRouteLoading,
  AuthenticatedRouteNotFound,
} from "../components/authenticated-route-state";
import { AuthenticatedRouteError } from "../components/authenticated-route-error";

describe("authenticated route states", () => {
  it("renders loading with readable live status and labelled skeletons", () => {
    const html = renderToStaticMarkup(
      createElement(AuthenticatedRouteLoading, {
        description: "Loading call review state.",
        eyebrow: "Review bench",
        lines: 3,
        size: "wide",
        title: "Call review",
      }),
    );

    expect(html).toContain('data-authenticated-route-state="loading"');
    expect(html).toContain('data-authenticated-page-container="wide"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading call review"');
    expect(html).toContain('data-authenticated-route-loading-header="true"');
    expect(html).toContain('data-authenticated-route-skeletons="compact"');
    expect(html).toContain("Loading call review state.");
  });

  it("renders route errors and not-found states with next actions", () => {
    const errorHtml = renderToStaticMarkup(
      createElement(AuthenticatedRouteError, {
        description: "A workspace view failed.",
        error: Object.assign(new Error("boom"), { digest: "digest-1" }),
        eyebrow: "Argos",
        reset: () => undefined,
        title: "Page error",
      }),
    );
    const notFoundHtml = renderToStaticMarkup(
      createElement(AuthenticatedRouteNotFound, {
        actionHref: "/calls",
        actionLabel: "Back to call library",
        description: "This call is unavailable.",
        eyebrow: "Review bench",
        title: "Call review",
      }),
    );

    expect(errorHtml).toContain('data-authenticated-route-state="error"');
    expect(errorHtml).toContain('data-forge-error-state="true"');
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain("Try again");
    expect(errorHtml).toContain("Back to dashboard");
    expect(errorHtml).toContain("digest-1");
    expect(notFoundHtml).toContain('data-authenticated-route-state="not-found"');
    expect(notFoundHtml).toContain("Call review not found");
    expect(notFoundHtml).toContain('href="/calls"');
  });

  it("covers the core authenticated routes with loading or not-found files", () => {
    const routeFiles = [
      "../app/(authenticated)/dashboard/loading.tsx",
      "../app/(authenticated)/calls/loading.tsx",
      "../app/(authenticated)/calls/[id]/loading.tsx",
      "../app/(authenticated)/calls/[id]/not-found.tsx",
      "../app/(authenticated)/highlights/loading.tsx",
      "../app/(authenticated)/leaderboard/loading.tsx",
      "../app/(authenticated)/notifications/loading.tsx",
      "../app/(authenticated)/roleplay/loading.tsx",
      "../app/(authenticated)/settings/loading.tsx",
      "../app/(authenticated)/team/loading.tsx",
      "../app/(authenticated)/team/[repId]/loading.tsx",
      "../app/(authenticated)/team/[repId]/not-found.tsx",
      "../app/(authenticated)/upload/loading.tsx",
    ];

    for (const routeFile of routeFiles) {
      expect(existsSync(new URL(routeFile, import.meta.url)), routeFile).toBe(true);
    }
  });
});
