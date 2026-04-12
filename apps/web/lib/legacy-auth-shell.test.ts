import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";
import LoginPage from "../app/login/page";

describe("legacy auth shell", () => {
  it("redirects the landing page to login", () => {
    expect(() => HomePage()).toThrowError(
      expect.objectContaining({
        digest: expect.stringContaining("NEXT_REDIRECT"),
      }),
    );
    expect(() => HomePage()).toThrowError(
      expect.objectContaining({
        digest: expect.stringContaining("/login"),
      }),
    );
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
