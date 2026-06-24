import { describe, expect, it } from "vitest";

import { getOpenAiVoiceConfigurationError, getOpenAiVoiceEnv } from "./openai-voice";

describe("getOpenAiVoiceEnv", () => {
  it("requires the production OpenAI identity label before returning voice credentials", () => {
    expect(() =>
      getOpenAiVoiceEnv({
        APP_ENV: "production",
        OPENAI_ENVIRONMENT: "preview",
        OPENAI_ROLEPLAY_API_KEY: "roleplay-key",
      }),
    ).toThrow("OPENAI_ENVIRONMENT=production");
  });

  it("reports production OpenAI identity failures as configuration errors", () => {
    expect(
      getOpenAiVoiceConfigurationError({
        APP_ENV: "production",
        OPENAI_ENVIRONMENT: "preview",
        OPENAI_ROLEPLAY_API_KEY: "roleplay-key",
      }),
    ).toContain("OPENAI_ENVIRONMENT=production");
  });
});
