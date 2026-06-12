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
    expect(html).toContain('data-argos-logo="homepage-nav"');
    expect(html).toContain('src="/argos_logo_background.png"');
    expect(html).toContain("Sales teams changed. Coaching should have too.");
    expect(html).toContain("Argos Revenue Command");
    expect(html).toContain("Coaching by memory");
    expect(html).toContain("Pipeline goes digital");
    expect(html).toContain("Recording overload");
    expect(html).toContain("AI tool sprawl");
    expect(html).toContain("The next conversation");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Launch platform");
    expect(html).toContain(">Log in</a>");
    expect(html).toContain(">Book demo</a>");
    expect(html).not.toContain(">Access</a>");
    expect(html).not.toContain("Forge a sharper sales force with call intelligence.");
    expect(html).toContain('id="platform"');
    expect(html).toContain('id="sales-evolution-memory"');
    expect(html).toContain('href="#access"');
    expect(html).toContain("Solo");
    expect(html).toContain("Team");
    expect(html).toContain("Enterprise");
  });
});
