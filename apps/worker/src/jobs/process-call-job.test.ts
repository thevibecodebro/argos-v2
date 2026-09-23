import { ProviderRequestError } from "@argos-v2/call-processing";
import { describe, expect, it, vi } from "vitest";
import { isRetryableProcessingError, processCallJob } from "./process-call-job";

describe("processCallJob", () => {
  it("retries provider timeouts but stops on exhausted quota", () => {
    const details = {
      elapsedMs: 100,
      providerRequestId: null,
      retryAfterMs: null,
      status: 408,
    };

    expect(isRetryableProcessingError(
      new ProviderRequestError("timed out", { ...details, category: "timeout" }),
      1,
      3,
    )).toBe(true);
    expect(isRetryableProcessingError(
      new ProviderRequestError("quota exhausted", {
        ...details,
        category: "quota",
        status: 429,
      }),
      1,
      3,
    )).toBe(false);
  });

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

  it("fails an in-progress buyer profile when V2 capabilities disappear", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: false }),
      markV2TerminalFailure: vi.fn().mockResolvedValue("written"),
    };

    await processCallJob({
      job: {
        id: "job-revoked-v2",
        callId: "call-revoked-v2",
        attemptCount: 1,
        maxAttempts: 3,
        processingVersion: 2,
        leaseToken: "00000000-0000-4000-8000-000000000001",
      } as never,
      repository: repository as never,
      downloadSourceAsset: vi.fn(),
    });

    expect(repository.markV2TerminalFailure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        buyerProfileFailedIfProcessing: true,
        lastError: "recording processing capabilities disabled",
      }),
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
      normalizeAudio: vi.fn().mockResolvedValue({ outputPath: "/tmp/normalized.mp3", sizeBytes: 1024, durationSeconds: 300 }),
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
      normalizeAudio: vi.fn().mockResolvedValue({ outputPath: "/tmp/normalized.mp3", sizeBytes: 1024, durationSeconds: 300 }),
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
      durationSeconds: 300,
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
        durationSeconds: 300,
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
          durationSeconds: 300,
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

  it("chunks highly compressed long audio before transcription", async () => {
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
      { filePath: "/tmp/normalized-part-0.mp3", startSeconds: 0, endSeconds: 296 },
      { filePath: "/tmp/normalized-part-1.mp3", startSeconds: 296, endSeconds: 592 },
    ]);

    await expect(
      processCallJob({
        job: {
          id: "job-long-compressed",
          callId: "call-long-compressed",
          repId: "rep-1",
          callTopic: "Discovery",
          attemptCount: 1,
          maxAttempts: 3,
          sourceStoragePath: "recordings/call-long-compressed/source/demo.mp4",
        } as never,
        repository: repository as never,
        downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
        normalizeAudio: vi.fn().mockResolvedValue({
          outputPath: "/tmp/normalized.mp3",
          sizeBytes: 20 * 1024 * 1024,
          durationSeconds: 5_031,
        }),
        chunkAudioFile: chunkAudioFile as never,
        readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
        transcribeAudioBuffer: vi.fn().mockRejectedValue(retryableError),
        scoreTranscriptFromLines: vi.fn(),
      }),
    ).rejects.toThrow("429 rate limited");

    expect(chunkAudioFile).toHaveBeenCalledWith(expect.objectContaining({
      durationSeconds: 5_031,
      sizeBytes: 20 * 1024 * 1024,
    }));
  });

  it("resumes downstream work from a checkpoint pinned to the same source and transcription configuration", async () => {
    const transcript = [{ timestampSeconds: 0, speaker: "Chunk 1 Speaker A", text: "Hello" }];
    const evaluation = {
      rubricId: null, confidence: "high", callStageReached: "commitment", overallScore: 90,
      categoryScores: [], frameControlScore: null, rapportScore: null, discoveryScore: null,
      painExpansionScore: null, solutionScore: null, objectionScore: null, closingScore: null,
      strengths: [], improvements: [], recommendedDrills: [], transcript, moments: [], durationSeconds: 600,
    };
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      findReusableTranscriptCheckpoint: vi.fn().mockResolvedValue({
        buyerPersonality: null,
        durationSeconds: 600,
        evaluation,
        fingerprint: "manifest-1",
        transcript,
      }),
      finalizeV2Job: vi.fn().mockResolvedValue("written"),
      beginChunkAttempt: vi.fn().mockResolvedValue(1),
      listCompletedChunks: vi.fn().mockResolvedValue([]),
      releaseForRetry: vi.fn().mockResolvedValue("written"),
      saveChunkFailure: vi.fn().mockResolvedValue("written"),
      saveCompletedChunk: vi.fn().mockResolvedValue("written"),
      saveTranscriptCheckpoint: vi.fn().mockResolvedValue("written"),
      setChunkManifest: vi.fn().mockResolvedValue("written"),
      updateCallStatus: vi.fn().mockResolvedValue(undefined),
      updateCallStatusForLease: vi.fn().mockResolvedValue("written"),
      markV2TerminalFailure: vi.fn().mockResolvedValue("written"),
    };
    const downloadSourceAsset = vi.fn().mockResolvedValue("/tmp/source.mp4");
    const scoreTranscriptFromLines = vi.fn();
    const transcribeAudioBuffer = vi.fn();
    const mkdtemp = vi.fn();

    await processCallJob({
      job: {
        id: "job-v2", callId: "call-v2", repId: "rep-1", callTopic: "Discovery",
        attemptCount: 2, maxAttempts: 3, failureCount: 1, maxFailures: 3,
        processingVersion: 2, generation: 1, leaseToken: "00000000-0000-4000-8000-000000000001",
        sourceStoragePath: "recordings/call-v2/source/demo.mp4",
      } as never,
      repository: repository as never,
      downloadSourceAsset,
      mkdtemp,
      normalizeAudio: vi.fn().mockResolvedValue({
        outputPath: "/tmp/normalized.mp3",
        sizeBytes: 1024,
        durationSeconds: 600,
      }),
      chunkAudioFile: vi.fn().mockResolvedValue([
        { filePath: "/tmp/chunk-0.mp3", startSeconds: 0, endSeconds: 600 },
      ]),
      readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
      transcribeAudioBuffer,
      scoreTranscriptFromLines,
    });

    expect(downloadSourceAsset).not.toHaveBeenCalled();
    expect(mkdtemp).not.toHaveBeenCalled();
    expect(transcribeAudioBuffer).not.toHaveBeenCalled();
    expect(repository.findReusableTranscriptCheckpoint).toHaveBeenCalledWith(
      "job-v2",
      1,
      expect.any(String),
      expect.objectContaining({ evaluationFingerprint: expect.any(String) }),
    );
    expect(scoreTranscriptFromLines).not.toHaveBeenCalled();
    expect(repository.finalizeV2Job).toHaveBeenCalledWith(expect.objectContaining({
      callId: "call-v2",
      evaluation,
      transcript,
    }));
  });

  it("marks an exhausted version 2 chunk terminal instead of retrying the whole job", async () => {
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      beginChunkAttempt: vi.fn().mockResolvedValue(4),
      listCompletedChunks: vi.fn().mockResolvedValue([]),
      findReusableTranscriptCheckpoint: vi.fn().mockResolvedValue(null),
      setChunkManifest: vi.fn().mockResolvedValue("written"),
      saveChunkFailure: vi.fn().mockResolvedValue("written"),
      markV2RetryableFailure: vi.fn().mockResolvedValue("written"),
      markV2TerminalFailure: vi.fn().mockResolvedValue("written"),
      updateCallStatusForLease: vi.fn().mockResolvedValue("written"),
    };

    await expect(processCallJob({
      job: {
        id: "job-exhausted", callId: "call-exhausted", repId: "rep-1", callTopic: "Discovery",
        attemptCount: 2, maxAttempts: 3, failureCount: 1, maxFailures: 3,
        processingVersion: 2, generation: 1, leaseToken: "00000000-0000-4000-8000-000000000001",
        sourceStoragePath: "recordings/call-exhausted/source/demo.mp4",
      } as never,
      repository: repository as never,
      downloadSourceAsset: vi.fn().mockResolvedValue("/tmp/source.mp4"),
      normalizeAudio: vi.fn().mockResolvedValue({
        outputPath: "/tmp/normalized.mp3",
        sizeBytes: 1024,
        durationSeconds: 600,
      }),
      chunkAudioFile: vi.fn().mockResolvedValue([
        { filePath: "/tmp/chunk-0.mp3", startSeconds: 0, endSeconds: 600 },
      ]),
      readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
      transcribeAudioBuffer: vi.fn(),
    })).rejects.toThrow("attempts exhausted");

    expect(repository.markV2RetryableFailure).not.toHaveBeenCalled();
    expect(repository.markV2TerminalFailure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ callId: "call-exhausted", lastStage: "transcribe" }),
    );
  });

  it("honors a provider retry delay longer than the default downstream backoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T20:00:00.000Z"));
    const retryableError = new ProviderRequestError("rate limited", {
      category: "rate_limit",
      elapsedMs: 100,
      providerRequestId: "req-1",
      retryAfterMs: 10 * 60 * 1000,
      status: 429,
    });
    const transcript = [{ timestampSeconds: 0, speaker: "Chunk 1 Speaker A", text: "Hello" }];
    const repository = {
      getCallProcessingCapabilities: vi.fn().mockResolvedValue({ canGenerateBuyerPersonality: false, canScoreCall: true }),
      findReusableTranscriptCheckpoint: vi.fn().mockResolvedValue({
        buyerPersonality: null,
        durationSeconds: 600,
        evaluation: null,
        fingerprint: "manifest-1",
        transcript,
      }),
      markV2RetryableFailure: vi.fn().mockResolvedValue("written"),
      markV2TerminalFailure: vi.fn().mockResolvedValue("written"),
      updateCallStatusForLease: vi.fn().mockResolvedValue("written"),
    };

    try {
      await expect(processCallJob({
        job: {
          id: "job-rate-limit", callId: "call-rate-limit", repId: "rep-1", callTopic: "Discovery",
          attemptCount: 1, maxAttempts: 3, failureCount: 0, maxFailures: 3,
          processingVersion: 2, generation: 1, leaseToken: "00000000-0000-4000-8000-000000000001",
          sourceStoragePath: "recordings/call-rate-limit/source/demo.mp4",
        } as never,
        repository: repository as never,
        scoreTranscriptFromLines: vi.fn().mockRejectedValue(retryableError),
      })).rejects.toBe(retryableError);
    } finally {
      vi.useRealTimers();
    }

    expect(repository.markV2RetryableFailure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lastStage: "score",
        nextRunAt: new Date("2026-09-23T20:10:00.000Z"),
      }),
    );
  });
});
