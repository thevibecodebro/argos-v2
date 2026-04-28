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
  it("renders the public landing page without redirecting to login and includes the 3D access content", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain("<h1>Argos</h1>");
    expect(html).toContain("Turn every sales call into the next practice plan.");
    expect(html).toContain("The call becomes the coaching plan.");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Access platform");
    expect(html).toContain('id="platform"');
    expect(html).toContain('href="#access"');
    expect(html).toContain("Solo");
    expect(html).toContain("Team");
    expect(html).toContain("Start with one rep. Add the team later.");
  });
});
