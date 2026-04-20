import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";
import LoginPage from "../app/login/page";

describe("legacy auth shell", () => {
  it("renders the landing page ahead of the login flow", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Build a sales team that improves after every call.");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Revenue command platform");
  });

  it("renders the login flow inside the restored shell", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );

    expect(html).toContain("Welcome back");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Work Email");
  });
});
