import { describe, expect, it, vi } from "vitest";
import { processCallJob } from "./process-call-job";

describe("processCallJob", () => {
  it("fails closed before downloading when neither processing path is enabled", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: false }),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const downloadSourceAsset = vi.fn();

    await processCallJob({
      job: {
        id: "job-revoked",
        callId: "call-revoked",
        attemptCount: 1,
        maxAttempts: 3,
      } as never,
      repository: repository as never,
      downloadSourceAsset,
    });

    expect(downloadSourceAsset).not.toHaveBeenCalled();
    expect(repository.markTerminalFailure).toHaveBeenCalledWith(
      "job-revoked",
      expect.objectContaining({ lastError: "recording processing capabilities disabled" }),
    );
  });
  it("transcribes, profiles, and completes without scoring in a personality-only workspace", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: true, canScoreCall: false }),
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn(),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      persistProcessedCall: vi.fn().mockResolvedValue(undefined),
      updateBuyerProfileStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const transcript = [{ timestampSeconds: 12, speaker: "Speaker B", text: "I need proof this will work." }];
    const profile = {
      schemaVersion: 1 as const,
      confidence: "high" as const,
      buyerSpeakerLabels: ["Speaker B"], speakerRationale: "Buyer questions", summary: "Skeptical buyer",
      communicationStyle: { directness: "high" as const, warmth: "medium" as const, skepticism: "high" as const, patience: "low" as const, detailOrientation: "high" as const, decisionStyle: "analytical" as const, questionStyle: "Proof-focused" },
      motivations: [], concerns: ["Risk"], objections: [], decisionCriteria: [], engagementTriggers: [], resistanceTriggers: [], languagePatterns: [],
      roleplayBehavior: { openingPosture: "Skeptical", conversationalRules: [], escalationRules: [], evidenceNeededToMoveForward: [], realisticResolutionConditions: [] },
    };
    const scorer = vi.fn();
    const extractor = vi.fn().mockResolvedValue({ model: "gpt-5-mini", profile });

    await processCallJob({
      job: { id: "job-profile", callId: "call-profile", repId: "rep-1", callTopic: "Discovery", attemptCount: 1, maxAttempts: 3, sourceStoragePath: "recordings/call-profile/source/demo.mp4" } as never,
      repository: repository as never,
      downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
      normalizeAudio: vi.fn().mockResolvedValue({ outputPath: "/tmp/normalized.mp3", sizeBytes: 1024, durationSeconds: 600 }),
      readFile: vi.fn().mockResolvedValue(Buffer.from("normalized audio")),
      transcribeAudioBuffer: vi.fn().mockResolvedValue({ durationSeconds: 600, transcript }),
      extractBuyerPersonalityFromTranscript: extractor,
      scoreTranscriptFromLines: scorer,
    });

    expect(extractor).toHaveBeenCalledWith(expect.objectContaining({ transcript }));
    expect(scorer).not.toHaveBeenCalled();
    expect(repository.persistProcessedCall).toHaveBeenCalledWith(expect.objectContaining({
      callId: "call-profile",
      evaluation: null,
      buyerPersonality: expect.objectContaining({ status: "ready", profile }),
    }));
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "recording_ready" }));
  });

  it("continues scoring when optional buyer personality extraction fails", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: true, canScoreCall: true }),
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      persistProcessedCall: vi.fn().mockResolvedValue(undefined),
      updateBuyerProfileStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const evaluation = {
      rubricId: null,
      confidence: "high",
      callStageReached: "commitment",
      overallScore: 86,
      categoryScores: [],
      frameControlScore: null,
      rapportScore: null,
      discoveryScore: null,
      painExpansionScore: null,
      solutionScore: null,
      objectionScore: null,
      closingScore: null,
      strengths: [],
      improvements: [],
      recommendedDrills: [],
      transcript: [],
      moments: [],
      durationSeconds: 600,
    };
    const scoreTranscriptFromLines = vi.fn().mockResolvedValue(evaluation);

    await processCallJob({
      job: { id: "job-both", callId: "call-both", repId: "rep-1", callTopic: "Discovery", attemptCount: 1, maxAttempts: 3, sourceStoragePath: "recordings/call-both/source/demo.mp4" } as never,
      repository: repository as never,
      downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
      normalizeAudio: vi.fn().mockResolvedValue({ outputPath: "/tmp/normalized.mp3", sizeBytes: 1024, durationSeconds: 600 }),
      readFile: vi.fn().mockResolvedValue(Buffer.from("normalized audio")),
      transcribeAudioBuffer: vi.fn().mockResolvedValue({ durationSeconds: 600, transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello" }] }),
      extractBuyerPersonalityFromTranscript: vi.fn().mockRejectedValue(new Error("malformed structured output")),
      scoreTranscriptFromLines,
    });

    expect(repository.updateBuyerProfileStatus).toHaveBeenLastCalledWith("call-both", "failed");
    expect(scoreTranscriptFromLines).toHaveBeenCalledTimes(1);
    expect(repository.persistProcessedCall).toHaveBeenCalledWith(expect.objectContaining({
      buyerPersonality: null,
      evaluation,
    }));
    expect(repository.markJobComplete).toHaveBeenCalledWith("job-both");
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "call_scored" }));
  });
  it("downloads, normalizes, transcribes, scores, persists, and completes a queued call", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      persistProcessedCall: vi.fn().mockResolvedValue(undefined),
      updateBuyerProfileStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const downloadSourceAsset = vi.fn().mockResolvedValue("/tmp/source.mp4");
    const normalizeAudio = vi.fn().mockResolvedValue({
      outputPath: "/tmp/normalized.mp3",
      sizeBytes: 12 * 1024 * 1024,
      durationSeconds: 1800,
    });
    const transcribeAudioBuffer = vi.fn().mockResolvedValue({
      durationSeconds: 1800,
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello there" }],
    });
    const scoreTranscriptFromLines = vi.fn().mockResolvedValue({
      rubricId: null,
      confidence: "high",
      callStageReached: "commitment",
      overallScore: 86,
      categoryScores: [
        {
          categoryId: null,
          slug: "frame_control",
          name: "Set a Strong Frame",
          weight: 15,
          score: 84,
        },
      ],
      frameControlScore: 84,
      rapportScore: 82,
      discoveryScore: 88,
      painExpansionScore: 80,
      solutionScore: 85,
      objectionScore: 83,
      closingScore: 92,
      strengths: ["Strong close"],
      improvements: ["Go deeper in discovery"],
      recommendedDrills: ["Discovery ladder"],
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello there" }],
      moments: [],
      durationSeconds: 1800,
    });

    await processCallJob({
      job: {
        id: "job-1",
        callId: "call-1",
        repId: "rep-1",
        callTopic: "Discovery",
        attemptCount: 1,
        maxAttempts: 3,
        sourceStoragePath: "recordings/call-1/source/demo.mp3",
        sourceSizeBytes: 12345,
      } as never,
      repository: repository as never,
      downloadSourceAsset,
      normalizeAudio,
      readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
      transcribeAudioBuffer,
      scoreTranscriptFromLines,
    });

    expect(repository.updateCallStatus).toHaveBeenNthCalledWith(1, "call-1", "transcribing");
    expect(downloadSourceAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedSizeBytes: 12345,
        storagePath: "recordings/call-1/source/demo.mp3",
        targetPath: expect.stringMatching(/source\.mp3$/),
      }),
    );
    expect(normalizeAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        ffmpegBinary: expect.any(String),
        inputPath: "/tmp/source.mp4",
        maxOutputBytes: 500 * 1024 * 1024,
        outputPath: expect.stringMatching(/normalized\.mp3$/),
      }),
    );
    expect(repository.updateCallStatus).toHaveBeenNthCalledWith(2, "call-1", "evaluating");
    expect(repository.persistProcessedCall).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "call-1",
        evaluation: expect.objectContaining({ overallScore: 86 }),
      }),
    );
    expect(repository.markJobComplete).toHaveBeenCalledWith("job-1");
  });

  it("loads a pinned rubric and passes it into scoring", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue({
        id: "rubric-1",
        name: "Custom rubric",
        version: 3,
        categories: [
          {
            id: "category-1",
            slug: "discovery_depth",
            name: "Discovery Depth",
            description: "How well the rep explores the underlying business problem.",
            weight: 60,
            scoringCriteria: {
              excellent: "Deep and commercial discovery.",
              proficient: "Solid but incomplete discovery.",
              developing: "Surface-level discovery.",
              lookFor: ["Pain", "Impact", "Urgency"],
            },
          },
          {
            id: "category-2",
            slug: "next_step_control",
            name: "Next Step Control",
            description: "How clearly the rep owns the close and next step.",
            weight: 40,
            scoringCriteria: {
              excellent: "Clear owner, timing, and ask.",
              proficient: "Reasonable next step with some ambiguity.",
              developing: "Vague or missing next step.",
              lookFor: ["Explicit ask", "Owner", "Date"],
            },
          },
        ],
      }),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      persistProcessedCall: vi.fn().mockResolvedValue(undefined),
      updateBuyerProfileStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const transcribeAudioBuffer = vi.fn().mockResolvedValue({
      durationSeconds: 1800,
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello there" }],
    });
    const scoreTranscriptFromLines = vi.fn().mockResolvedValue({
      rubricId: "rubric-1",
      confidence: "high",
      callStageReached: "commitment",
      overallScore: 86,
      categoryScores: [
        {
          categoryId: "category-1",
          slug: "discovery_depth",
          name: "Discovery Depth",
          weight: 60,
          score: 90,
        },
        {
          categoryId: "category-2",
          slug: "next_step_control",
          name: "Next Step Control",
          weight: 40,
          score: 80,
        },
      ],
      frameControlScore: null,
      rapportScore: null,
      discoveryScore: null,
      painExpansionScore: null,
      solutionScore: null,
      objectionScore: null,
      closingScore: null,
      strengths: ["Strong discovery"],
      improvements: ["Tighten the close"],
      recommendedDrills: ["Next step drill"],
      transcript: [{ timestampSeconds: 0, speaker: "Speaker A", text: "Hello there" }],
      moments: [],
      durationSeconds: 1800,
    });

    await processCallJob({
      job: {
        id: "job-1",
        callId: "call-1",
        repId: "rep-1",
        callTopic: "Discovery",
        rubricId: "rubric-1",
        attemptCount: 1,
        maxAttempts: 3,
        sourceStoragePath: "recordings/call-1/source/demo.mp3",
      } as never,
      repository: repository as never,
      downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
      normalizeAudio: vi.fn().mockResolvedValue({
        outputPath: "/tmp/normalized.mp3",
        sizeBytes: 12 * 1024 * 1024,
        durationSeconds: 1800,
      }),
      readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
      transcribeAudioBuffer,
      scoreTranscriptFromLines,
    });

    expect(repository.findRubricById).toHaveBeenCalledWith("rubric-1");
    expect(scoreTranscriptFromLines).toHaveBeenCalledWith(
      expect.objectContaining({
        rubric: expect.objectContaining({
          id: "rubric-1",
          name: "Custom rubric",
        }),
      }),
    );
  });

  it("marks retryable transcription failures without failing the call", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      persistProcessedCall: vi.fn().mockResolvedValue(undefined),
      updateBuyerProfileStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const retryableError = new Error("OpenAI transcription request failed: 429 rate limited");

    await expect(
      processCallJob({
        job: {
          id: "job-1",
          callId: "call-1",
          repId: "rep-1",
          callTopic: "Discovery",
          attemptCount: 1,
          maxAttempts: 3,
          sourceStoragePath: "recordings/call-1/source/demo.mp3",
        } as never,
        repository: repository as never,
        downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
        normalizeAudio: vi.fn().mockResolvedValue({
          outputPath: "/tmp/normalized.mp3",
          sizeBytes: 12 * 1024 * 1024,
          durationSeconds: 1800,
        }),
        readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
        transcribeAudioBuffer: vi.fn().mockRejectedValue(retryableError),
        scoreTranscriptFromLines: vi.fn(),
      }),
    ).rejects.toThrow("429 rate limited");

    expect(repository.markRetryableFailure).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({
        attemptCount: 1,
        lastStage: "transcribe",
      }),
    );
    expect(repository.markTerminalFailure).not.toHaveBeenCalled();
    expect(repository.updateCallStatus).not.toHaveBeenCalledWith("call-1", "failed");
  });

  it("classifies oversized chunk transcription failures as transcribe stage failures", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      persistProcessedCall: vi.fn().mockResolvedValue(undefined),
      updateBuyerProfileStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
    };
    const retryableError = new Error("OpenAI transcription request failed: 429 rate limited");
    const chunkAudioFile = vi.fn().mockResolvedValue([
      { filePath: "/tmp/normalized.mp3.part-0.mp3", startSeconds: 0, endSeconds: 900 },
      { filePath: "/tmp/normalized.mp3.part-1.mp3", startSeconds: 900, endSeconds: 1800 },
    ]);

    await expect(
      processCallJob({
        job: {
          id: "job-1",
          callId: "call-1",
          repId: "rep-1",
          callTopic: "Discovery",
          attemptCount: 1,
          maxAttempts: 3,
          sourceStoragePath: "recordings/call-1/source/demo.mp3",
        } as never,
        repository: repository as never,
        downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
        normalizeAudio: vi.fn().mockResolvedValue({
          outputPath: "/tmp/normalized.mp3",
          sizeBytes: 30 * 1024 * 1024,
          durationSeconds: 1800,
        }),
        chunkAudioFile: chunkAudioFile as never,
        readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
        transcribeAudioBuffer: vi.fn().mockRejectedValue(retryableError),
        scoreTranscriptFromLines: vi.fn(),
      }),
    ).rejects.toThrow("429 rate limited");

    expect(chunkAudioFile).toHaveBeenCalledTimes(1);
    expect(repository.markRetryableFailure).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({
        lastStage: "transcribe",
      }),
    );
  });
});
