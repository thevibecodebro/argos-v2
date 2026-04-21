import { describe, expect, it, vi } from "vitest";
import { processCallJob } from "./process-call-job";

describe("processCallJob", () => {
  it("downloads, normalizes, transcribes, scores, persists, and completes a queued call", async () => {
    const repository = {
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      setCallEvaluation: vi.fn().mockResolvedValue(undefined),
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
      } as never,
      repository: repository as never,
      downloadSourceAsset,
      normalizeAudio,
      readFile: vi.fn().mockResolvedValue(Buffer.from("audio")),
      transcribeAudioBuffer,
      scoreTranscriptFromLines,
    });

    expect(repository.updateCallStatus).toHaveBeenNthCalledWith(1, "call-1", "transcribing");
    expect(repository.updateCallStatus).toHaveBeenNthCalledWith(2, "call-1", "evaluating");
    expect(repository.setCallEvaluation).toHaveBeenCalledWith(
      "call-1",
      expect.objectContaining({ overallScore: 86 }),
    );
    expect(repository.markJobComplete).toHaveBeenCalledWith("job-1");
  });

  it("loads a pinned rubric and passes it into scoring", async () => {
    const repository = {
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
      setCallEvaluation: vi.fn().mockResolvedValue(undefined),
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
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      setCallEvaluation: vi.fn().mockResolvedValue(undefined),
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
      createNotification: vi.fn().mockResolvedValue(undefined),
      findRubricById: vi.fn().mockResolvedValue(null),
      markJobComplete: vi.fn().mockResolvedValue(undefined),
      markRetryableFailure: vi.fn().mockResolvedValue(undefined),
      markTerminalFailure: vi.fn().mockResolvedValue(undefined),
      setCallEvaluation: vi.fn().mockResolvedValue(undefined),
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
