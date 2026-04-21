import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALL_SCORING_CATEGORIES,
  computeWeightedOverallScore,
  mergeTranscriptLines,
  normalizeTranscriptionPayload,
  type ScoringRubric,
} from "@argos-v2/call-processing";
import { scoreCallRecording, scoreTranscriptFromLines } from "./ai-scoring";

describe("shared call-processing package", () => {
  it("exports the rubric and transcript normalization helpers", () => {
    expect(CALL_SCORING_CATEGORIES.map((category) => category.slug)).toEqual([
      "rapport",
      "frame_control",
      "discovery",
      "pain_expansion",
      "solution",
      "objection_handling",
      "closing",
    ]);

    expect(
      computeWeightedOverallScore({
        rapport: 80,
        frame_control: 80,
        discovery: 80,
        pain_expansion: 80,
        solution: 80,
        objection_handling: 80,
        closing: 80,
      }),
    ).toBe(80);

    const normalized = normalizeTranscriptionPayload({
      segments: [{ start: 0, end: 4, speaker: "A", text: "Opening question" }],
      usage: { seconds: 4 },
    });

    expect(normalized.durationSeconds).toBe(4);
    expect(normalized.transcript[0]).toEqual({
      timestampSeconds: 0,
      speaker: "Speaker A",
      text: "Opening question",
    });
  });

  it("preserves an unknown duration for plain-text transcription fallbacks", () => {
    const normalized = normalizeTranscriptionPayload({
      text: "Plain transcript with no segment timing",
    });

    expect(normalized.durationSeconds).toBe(0);
    expect(normalized.transcript).toEqual([
      {
        timestampSeconds: 0,
        speaker: "Speaker A",
        text: "Plain transcript with no segment timing",
      },
    ]);
  });

  it("merges transcript groups into a monotonic timeline", () => {
    const merged = mergeTranscriptLines([
      [
        {
          timestampSeconds: 15,
          speaker: "Speaker A",
          text: "Later line",
        },
      ],
      [
        {
          timestampSeconds: 5,
          speaker: "Speaker B",
          text: "Earlier line",
        },
        {
          timestampSeconds: 22,
          speaker: "Speaker A",
          text: "Latest line",
        },
      ],
    ]);

    expect(merged).toEqual([
      {
        timestampSeconds: 5,
        speaker: "Speaker B",
        text: "Earlier line",
      },
      {
        timestampSeconds: 15,
        speaker: "Speaker A",
        text: "Later line",
      },
      {
        timestampSeconds: 22,
        speaker: "Speaker A",
        text: "Latest line",
      },
    ]);
  });

  it("applies chunk offsets before merging chunk-local transcript lines", () => {
    const merged = mergeTranscriptLines([
      {
        offsetSeconds: 0,
        transcript: [
          {
            timestampSeconds: 0,
            speaker: "Speaker A",
            text: "Opening line",
          },
        ],
      },
      {
        offsetSeconds: 300,
        transcript: [
          {
            timestampSeconds: 0,
            speaker: "Speaker B",
            text: "Later chunk opening",
          },
        ],
      },
    ]);

    expect(merged).toEqual([
      {
        timestampSeconds: 0,
        speaker: "Speaker A",
        text: "Opening line",
      },
      {
        timestampSeconds: 300,
        speaker: "Speaker B",
        text: "Later chunk opening",
      },
    ]);
  });
});

describe("scoreCallRecording", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("transcribes audio with diarization and scores the call against the rubric", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: "Thanks for making time. We need to understand the rollout effort.",
            usage: { seconds: 124, type: "duration" },
            segments: [
              {
                id: "seg-1",
                start: 0.4,
                end: 11.2,
                speaker: "A",
                text: "Thanks for making time today. I want to understand what is slowing down coaching.",
                type: "transcript.text.segment",
              },
              {
                id: "seg-2",
                start: 11.8,
                end: 23.1,
                speaker: "B",
                text: "Consistency is the problem. Managers keep repeating the same feedback.",
                type: "transcript.text.segment",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    confidence: "high",
                    callStageReached: "proposal",
                    categoryScores: {
                      rapport: 83,
                      frame_control: 86,
                      discovery: 90,
                      pain_expansion: 78,
                      solution: 84,
                      objection_handling: 80,
                      closing: 88,
                    },
                    strengths: [
                      "The rep established control early and kept the conversation commercially focused.",
                      "Discovery went beyond symptoms into coaching impact.",
                    ],
                    improvements: [
                      "Tighten the bridge from pain into the solution.",
                      "Handle rollout-risk questions with more concrete proof.",
                    ],
                    recommendedDrills: [
                      "Transition to pitch drill",
                      "Implementation-risk objection drill",
                    ],
                    moments: [
                      {
                        timestampSeconds: 12,
                        category: "discovery",
                        observation: "The rep uncovered a repeatable coaching problem.",
                        recommendation: "Press one layer deeper on business impact before pitching.",
                        severity: "strength",
                        isHighlight: true,
                        highlightNote: "Strong discovery sequence",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const result = await scoreCallRecording({
      audioBytes: Buffer.from("fake-audio"),
      callTopic: "Discovery call",
      contentType: "audio/x-m4a",
      fileName: "discovery-call.m4a",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/audio/transcriptions");
    const transcriptionRequest = fetchMock.mock.calls[0]?.[1];
    expect(transcriptionRequest?.method).toBe("POST");
    expect(transcriptionRequest?.headers).toMatchObject({
      Authorization: "Bearer test-openai-key",
    });
    expect(transcriptionRequest?.body).toBeInstanceOf(FormData);
    const transcriptionForm = transcriptionRequest?.body as FormData;
    expect(transcriptionForm.get("model")).toBe("gpt-4o-transcribe-diarize");
    expect(transcriptionForm.get("response_format")).toBe("diarized_json");
    expect(transcriptionForm.get("chunking_strategy")).toBe("auto");

    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)).model,
    ).toBe("gpt-5-mini");
    expect(result.durationSeconds).toBe(124);
    expect(result.rubricId).toBeNull();
    expect(result.overallScore).toBe(85);
    expect(result.categoryScores).toEqual([
      {
        categoryId: null,
        slug: "rapport",
        name: "Build Rapport",
        weight: 5,
        score: 83,
      },
      {
        categoryId: null,
        slug: "frame_control",
        name: "Set a Strong Frame",
        weight: 15,
        score: 86,
      },
      {
        categoryId: null,
        slug: "discovery",
        name: "In-Depth Discovery",
        weight: 15,
        score: 90,
      },
      {
        categoryId: null,
        slug: "pain_expansion",
        name: "Transition to Pitch",
        weight: 5,
        score: 78,
      },
      {
        categoryId: null,
        slug: "solution",
        name: "Pitch/Demo",
        weight: 15,
        score: 84,
      },
      {
        categoryId: null,
        slug: "objection_handling",
        name: "Overcome Objections",
        weight: 15,
        score: 80,
      },
      {
        categoryId: null,
        slug: "closing",
        name: "Closing",
        weight: 30,
        score: 88,
      },
    ]);
    expect(result.frameControlScore).toBe(86);
    expect(result.rapportScore).toBe(83);
    expect(result.discoveryScore).toBe(90);
    expect(result.painExpansionScore).toBe(78);
    expect(result.solutionScore).toBe(84);
    expect(result.objectionScore).toBe(80);
    expect(result.closingScore).toBe(88);
    expect(result.transcript).toEqual([
      {
        timestampSeconds: 0,
        speaker: "Speaker A",
        text: "Thanks for making time today. I want to understand what is slowing down coaching.",
      },
      {
        timestampSeconds: 12,
        speaker: "Speaker B",
        text: "Consistency is the problem. Managers keep repeating the same feedback.",
      },
    ]);
  });

  it("rejects scoring when OpenAI is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(
      scoreCallRecording({
        audioBytes: Buffer.from("fake-audio"),
        callTopic: "Discovery call",
        contentType: "audio/x-m4a",
        fileName: "discovery-call.m4a",
      }),
    ).rejects.toThrow("OPENAI_API_KEY");
  });

  it("scores against a runtime custom rubric and leaves legacy fields empty when slugs do not match", async () => {
    const rubric: ScoringRubric = {
      id: "rubric-1",
      name: "Custom rubric",
      version: 3,
      categories: [
        {
          id: "category-1",
          slug: "discovery_depth",
          name: "Discovery Depth",
          description: "How deeply the rep explores the buyer's problem.",
          weight: 60,
          scoringCriteria: {
            excellent: "Deep, commercial discovery.",
            proficient: "Good discovery with some missing depth.",
            developing: "Surface-level discovery.",
            lookFor: ["Pain", "Impact", "Urgency"],
          },
        },
        {
          id: "category-2",
          slug: "next_step_control",
          name: "Next Step Control",
          description: "How clearly the rep owns the close.",
          weight: 40,
          scoringCriteria: {
            excellent: "Specific ask with owner and timing.",
            proficient: "Reasonable next step with some ambiguity.",
            developing: "Vague or missing next step.",
            lookFor: ["Explicit ask", "Owner", "Date"],
          },
        },
      ],
    };

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: "high",
                  callStageReached: "commitment",
                  categoryScores: {
                    discovery_depth: 92,
                    next_step_control: 74,
                  },
                  strengths: ["Strong discovery"],
                  improvements: ["Tighten the close"],
                  recommendedDrills: ["Next step drill"],
                  moments: [
                    {
                      timestampSeconds: 9,
                      category: "discovery_depth",
                      observation: "The rep tied the problem to a concrete business impact.",
                      recommendation: "Keep that depth before pivoting to the close.",
                      severity: "strength",
                      isHighlight: true,
                      highlightNote: "Strong custom-category moment",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await scoreTranscriptFromLines({
      callTopic: "Custom rubric call",
      durationSeconds: 180,
      rubric,
      transcript: [
        {
          timestampSeconds: 0,
          speaker: "Speaker A",
          text: "Walk me through the current rollout problem.",
        },
      ],
    });

    expect(result.rubricId).toBe("rubric-1");
    expect(result.overallScore).toBe(85);
    expect(result.categoryScores).toEqual([
      {
        categoryId: "category-1",
        slug: "discovery_depth",
        name: "Discovery Depth",
        weight: 60,
        score: 92,
      },
      {
        categoryId: "category-2",
        slug: "next_step_control",
        name: "Next Step Control",
        weight: 40,
        score: 74,
      },
    ]);
    expect(result.frameControlScore).toBeNull();
    expect(result.rapportScore).toBeNull();
    expect(result.discoveryScore).toBeNull();
    expect(result.closingScore).toBeNull();
    expect(result.moments[0]?.category).toBe("discovery_depth");
  });
});
