import { describe, expect, it } from "vitest";
import { getLoginHref, isProtectedPath } from "./auth-routing";

describe("isProtectedPath", () => {
  it("protects the dashboard root", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
  });

  it("protects nested dashboard routes", () => {
    expect(isProtectedPath("/dashboard/calls")).toBe(true);
  });

  it("does not protect public routes", () => {
    expect(isProtectedPath("/login")).toBe(false);
  });
});

describe("getLoginHref", () => {
  it("preserves the requested path and query string", () => {
    expect(getLoginHref("/dashboard/calls", "?filter=mine")).toBe(
      "/login?next=%2Fdashboard%2Fcalls%3Ffilter%3Dmine",
    );
  });
});
