import { describe, expect, it, vi } from "vitest";
import { billingPlans } from "./plans";
import {
  sendBillingOnboardingEmail,
  type BillingOnboardingEmailClient,
} from "./onboarding-email";

describe("billing onboarding email", () => {
  it("sends a plan-specific onboarding email to the account owner", async () => {
    const client: BillingOnboardingEmailClient = {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: "email-1" },
          error: null,
        }),
      },
    };

    await sendBillingOnboardingEmail(
      {
        checkoutSessionId: "cs_1",
        email: "owner@acme.com",
        fullName: "Ada Owner",
        orgName: "Acme Revenue",
        plan: billingPlans.team,
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      },
      {
        client,
        env: {
          ARGOS_ONBOARDING_FROM: "Argos Revenue Command <onboarding@hello.argosrevenuecommand.com>",
        },
      },
    );

    expect(client.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Argos Revenue Command <onboarding@hello.argosrevenuecommand.com>",
        subject: "Your Argos Revenue Command workspace is ready",
        to: "owner@acme.com",
        text: expect.stringContaining("Hi Ada"),
      }),
    );
    const emailPayload = vi.mocked(client.emails.send).mock.calls[0]?.[0];
    expect(emailPayload?.html).toContain(
      "Start with one sales call. Turn it into coaching, scoring, and roleplay.",
    );
    expect(emailPayload?.html).toContain("Argos Revenue Command");
    expect(emailPayload?.html).toContain("Acme Revenue");
    expect(emailPayload?.html).toContain("You're in. Acme Revenue is set up");
    expect(emailPayload?.html).toContain("The best first move is simple: upload one real sales call.");
    expect(emailPayload?.html).toContain("https://argosrevenuecommand.com/dashboard");
    expect(emailPayload?.html).toContain("Open your workspace");
    expect(emailPayload?.html).toContain("If you&#39;re setting this up for your team");
    expect(emailPayload?.html).toContain("You received this because this email was used to start a paid subscription");
    expect(emailPayload?.text).toContain("Invite your team");
    expect(emailPayload?.text).toContain("The best first move is simple: upload one real sales call.");
    expect(emailPayload?.text).toContain(
      "Open your workspace: https://argosrevenuecommand.com/dashboard",
    );
  });

  it("escapes owner and organization text in the HTML email", async () => {
    const client: BillingOnboardingEmailClient = {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: "email-1" },
          error: null,
        }),
      },
    };

    await sendBillingOnboardingEmail(
      {
        checkoutSessionId: "cs_1",
        email: "owner@acme.com",
        fullName: "<Ada>",
        orgName: "Acme <script>",
        plan: billingPlans.solo,
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      },
      {
        client,
        env: {
          ARGOS_ONBOARDING_FROM: "Argos Revenue Command <onboarding@hello.argosrevenuecommand.com>",
        },
      },
    );

    const emailPayload = vi.mocked(client.emails.send).mock.calls[0]?.[0];
    expect(emailPayload?.html).toContain("&lt;Ada&gt;");
    expect(emailPayload?.html).toContain("Acme &lt;script&gt;");
  });
});
