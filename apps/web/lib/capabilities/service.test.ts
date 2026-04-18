import { describe, expect, it } from "vitest";
import {
  getInviteEmailCapability,
  getGhlOAuthCapability,
  getRoleplayVoiceCapability,
  getTrainingAiCapability,
  getZoomOAuthCapability,
} from "./service";

describe("capability service", () => {
  it("requires both Zoom OAuth credentials", () => {
    expect(
      getZoomOAuthCapability({
        ZOOM_CLIENT_ID: "zoom-client-id",
        ZOOM_CLIENT_SECRET: "",
      }),
    ).toEqual({
      available: false,
      reason: "Zoom OAuth is not configured. Missing: ZOOM_CLIENT_SECRET.",
    });
  });

  it("requires both Go High Level OAuth credentials", () => {
    expect(
      getGhlOAuthCapability({
        GHL_CLIENT_ID: "",
        GHL_CLIENT_SECRET: "ghl-client-secret",
      }),
    ).toEqual({
      available: false,
      reason: "Go High Level OAuth is not configured. Missing: GHL_CLIENT_ID.",
    });
  });

  it("reports training AI availability from OpenAI config", () => {
    expect(getTrainingAiCapability({ OPENAI_API_KEY: "" })).toEqual({
      available: false,
      reason: "OPENAI_API_KEY is missing",
    });
    expect(getTrainingAiCapability({ OPENAI_API_KEY: "openai-key" })).toEqual({
      available: true,
      reason: null,
    });
  });

  it("reports roleplay voice availability from OpenAI config", () => {
    expect(getRoleplayVoiceCapability({ OPENAI_API_KEY: "" })).toEqual({
      available: false,
      reason: "Voice features are not configured. Missing: OPENAI_API_KEY.",
    });
    expect(getRoleplayVoiceCapability({ OPENAI_API_KEY: "openai-key" })).toEqual({
      available: true,
      reason: null,
    });
  });

  it("requires invite email delivery config for onboarding and people invites", () => {
    expect(
      getInviteEmailCapability({
        RESEND_API_KEY: "",
        NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
      }),
    ).toEqual({
      available: false,
      reason: "Invite email delivery is not configured. Missing: RESEND_API_KEY.",
    });

    expect(
      getInviteEmailCapability({
        RESEND_API_KEY: "resend-key",
        NEXT_PUBLIC_SITE_URL: "https://app.argos.ai",
      }),
    ).toEqual({
      available: true,
      reason: null,
    });
  });
});
