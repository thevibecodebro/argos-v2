import { createHash } from "node:crypto";
import type { TranscriptLine } from "@argos-v2/call-processing";

export type Lease = { jobId: string; token: string };
export type WriteOutcome = "written" | "lost_lease";
export type ChunkCheckpoint = {
  audioHash: string;
  endSeconds: number;
  fingerprint: string;
  index: number;
  startSeconds: number;
  transcript: TranscriptLine[];
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createManifestFingerprint(input: {
  chunks: Array<{ audioHash: string; endSeconds: number; startSeconds: number }>;
  generation: number;
  model: string;
  normalizationVersion: string;
  sourceSizeBytes: number | null;
  transcriptFormatVersion: number;
}) {
  return sha256(stableJson(input));
}
