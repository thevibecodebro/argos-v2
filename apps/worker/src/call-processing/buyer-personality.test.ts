import { describe, expect, it } from "vitest";
import {
  BUYER_PERSONALITY_SCHEMA_VERSION,
  buildBuyerPersonalityTranscriptEvidence,
  collectBuyerPersonalityDirectIdentifiers,
  parseBuyerPersonalityProfile,
} from "@argos-v2/call-processing";

function validProfile() {
  return {
    schemaVersion: BUYER_PERSONALITY_SCHEMA_VERSION,
    confidence: "high",
    buyerSpeakerLabels: ["Speaker B"],
    speakerRationale: "Speaker B asks buying questions and evaluates the offer.",
    summary: "A cautious buyer who needs concrete operational proof.",
    communicationStyle: {
      directness: "high",
      warmth: "medium",
      skepticism: "high",
      patience: "low",
      detailOrientation: "high",
      decisionStyle: "analytical",
      questionStyle: "Short questions focused on risk and implementation.",
    },
    motivations: ["Reduce manual work"],
    concerns: ["Implementation risk"],
    objections: [{ topic: "Timing", expressionStyle: "Direct", evidenceTimestampsSeconds: [42] }],
    decisionCriteria: ["Clear rollout plan"],
    engagementTriggers: ["Specific proof"],
    resistanceTriggers: ["Vague claims"],
    languagePatterns: ["Show me the process"],
    roleplayBehavior: {
      openingPosture: "Busy and skeptical.",
      conversationalRules: ["Ask for specifics"],
      escalationRules: ["Push back on vague answers"],
      evidenceNeededToMoveForward: ["A credible rollout plan"],
      realisticResolutionConditions: ["Agree to a technical follow-up"],
    },
  };
}

describe("buyer personality contract", () => {
  it("parses a complete evidence-bound profile", () => {
    expect(parseBuyerPersonalityProfile(validProfile(), 120)).toMatchObject({
      confidence: "high",
      buyerSpeakerLabels: ["Speaker B"],
    });
  });

  it("rejects missing fields, unknown versions, and out-of-range evidence", () => {
    expect(() => parseBuyerPersonalityProfile({ ...validProfile(), schemaVersion: 2 }, 120)).toThrow(/schema version/i);
    const missing = validProfile() as Record<string, unknown>;
    delete missing.roleplayBehavior;
    expect(() => parseBuyerPersonalityProfile(missing, 120)).toThrow(/structure/i);
    const invalidTimestamp = validProfile();
    invalidTimestamp.objections[0]!.evidenceTimestampsSeconds = [121];
    expect(() => parseBuyerPersonalityProfile(invalidTimestamp, 120)).toThrow(/timestamp/i);
  });

  it("redacts direct identifiers from reusable language", () => {
    const profile = validProfile();
    profile.summary = "Jordan Lee from customer ID ACCT-4921 is cautious.";
    profile.languagePatterns = ["Email me at buyer@example.com or call +1 (212) 555-0199"];
    const parsed = parseBuyerPersonalityProfile(profile, 120, {
      directIdentifiers: ["Jordan Lee", "ACCT-4921"],
    });
    expect(parsed.summary).toBe("[identifier] from customer ID [identifier] is cautious.");
    expect(parsed.languagePatterns[0]).toBe("Email me at [email] or call [phone]");
  });

  it("extracts names and account identifiers from transcript evidence for deterministic redaction", () => {
    expect(collectBuyerPersonalityDirectIdentifiers([
      {
        timestampSeconds: 0,
        speaker: "Speaker B",
        text: "My name is Jordan Lee and my account ID is ACCT-4921.",
      },
    ])).toEqual(expect.arrayContaining(["Jordan Lee", "ACCT-4921"]));
  });

  it("samples the beginning, middle, and end of long transcripts", () => {
    const transcript = Array.from({ length: 30 }, (_, index) => ({
      timestampSeconds: index * 10,
      speaker: index % 2 ? "Speaker B" : "Speaker A",
      text: `segment-${index}-${"x".repeat(30)}`,
    }));
    const evidence = buildBuyerPersonalityTranscriptEvidence(transcript, 600);
    expect(evidence).toContain("segment-0");
    expect(evidence).toMatch(/segment-1[2-8]/);
    expect(evidence).toContain("segment-29");
    expect(evidence.length).toBeLessThanOrEqual(600);
  });
});
