import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  it("renders the public landing page without redirecting to login and includes the pricing anchor and content", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain("Build a sales team that");
    expect(html).toContain("after every call.");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Access platform");
    expect(html).toContain('href="#platform"');
    expect(html).toContain('href="#pricing"');
    expect(html).toContain("Solo");
    expect(html).toContain("Team");
    expect(html).toContain("Extra voice");
  });
});
