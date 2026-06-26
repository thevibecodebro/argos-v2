import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendInviteEmail } from "./email";

const send = vi.hoisted(() => vi.fn());
const Resend = vi.hoisted(() => vi.fn(() => ({ emails: { send } })));

vi.mock("resend", () => ({
  Resend,
}));

describe("sendInviteEmail", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    Resend.mockClear();
    send.mockReset();
    send.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  it("uses the configured onboarding sender for invite delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("ARGOS_ONBOARDING_FROM", "Argos Revenue Command <onboarding@hello.argosrevenuecommand.com>");

    await sendInviteEmail(
      "admin@acme.com",
      "https://auth.example.com/invite-link",
      "Acme",
      "admin",
    );

    expect(Resend).toHaveBeenCalledWith("re_test");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Argos Revenue Command <onboarding@hello.argosrevenuecommand.com>",
        subject: "You've been invited to join Acme on Argos",
        to: "admin@acme.com",
      }),
    );
  });
});
