import { describe, expect, it } from "vitest";
import { isGoogleOAuthSession } from "./google-auth";

describe("isGoogleOAuthSession", () => {
  it("accepts a verified Google OAuth session", () => {
    expect(
      isGoogleOAuthSession({
        amr: [{ method: "oauth", timestamp: 1_725_000_000 }],
        app_metadata: { provider: "google", providers: ["google"] },
      }),
    ).toBe(true);
  });

  it("rejects Google-linked users whose current session is a magic link", () => {
    expect(
      isGoogleOAuthSession({
        amr: [{ method: "magiclink", timestamp: 1_725_000_000 }],
        app_metadata: { provider: "google", providers: ["email", "google"] },
      }),
    ).toBe(false);
  });

  it("rejects OAuth sessions from a different provider", () => {
    expect(
      isGoogleOAuthSession({
        amr: ["oauth"],
        app_metadata: { provider: "github", providers: ["github"] },
      }),
    ).toBe(false);
  });
});
