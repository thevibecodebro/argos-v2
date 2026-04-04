import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";
import LoginPage from "../app/login/page";

describe("legacy auth shell", () => {
  it("renders the dark restored landing page", () => {
    const html = renderToStaticMarkup(HomePage());

    expect(html).toContain("Revenue Command Platform");
    expect(html).toContain("AI Scorecards");
    expect(html).toContain("Coaching Flags");
    expect(html).toContain("Instant Insights");
    expect(html).toContain("Sign in to Argos");
  });

  it("renders the login flow inside the restored shell", async () => {
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/dashboard" }),
      }),
    );

    expect(html).toContain("Revenue Command Platform");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Send magic link");
  });
});
