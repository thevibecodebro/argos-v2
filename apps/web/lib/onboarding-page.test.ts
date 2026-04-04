import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import OnboardingPage from "../app/onboarding/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("OnboardingPage", () => {
  it("renders the archived create-or-join organization flow", async () => {
    const html = renderToStaticMarkup(await OnboardingPage());

    expect(html).toContain("Welcome to Argos");
    expect(html).toContain("Create Organization");
    expect(html).toContain("Join Organization");
  });
});
