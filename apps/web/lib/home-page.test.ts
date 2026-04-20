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
  it("renders the public landing page instead of redirecting to login", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain("Build a sales team that improves after every call.");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#system"');
  });
});
