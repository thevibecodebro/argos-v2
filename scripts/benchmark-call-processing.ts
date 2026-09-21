import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { transcribeAudioBuffer } from "@argos-v2/call-processing";
import { chunkAudioFile } from "../apps/worker/src/media/chunk-audio";
import { normalizeAudio } from "../apps/worker/src/media/normalize-audio";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
if (process.argv.includes("--help")) {
  console.log("CALL_PROCESSING_BENCHMARK_LIVE=1 npm run benchmark:call-processing -- --input /path/to/sanitized-fixture.mp3 --chunk-seconds 300 --timeout-ms 120000 --max-requests 50");
  process.exit(0);
}

if (process.env.CALL_PROCESSING_BENCHMARK_LIVE !== "1") {
  throw new Error("Set CALL_PROCESSING_BENCHMARK_LIVE=1 to acknowledge live provider requests and cost.");
}

const inputPath = argument("--input");
if (!inputPath) throw new Error("Missing --input path to a sanitized local fixture");
const chunkSeconds = Number(argument("--chunk-seconds") ?? 300);
const timeoutMs = Number(argument("--timeout-ms") ?? 120_000);
const maxRequests = Number(argument("--max-requests") ?? 50);
if (![chunkSeconds, timeoutMs, maxRequests].every(Number.isSafeInteger) || chunkSeconds < 30 || timeoutMs < 1_000 || maxRequests < 1) {
  throw new Error("Invalid benchmark limits");
}
if (!ffmpegStatic) throw new Error("ffmpeg-static is unavailable");

const workspace = await mkdtemp(join(tmpdir(), "argos-call-benchmark-"));
try {
  const normalized = await normalizeAudio({
    ffmpegBinary: ffmpegStatic,
    inputPath,
    maxOutputBytes: 500 * 1024 * 1024,
    outputPath: join(workspace, "normalized.mp3"),
  });
  const chunks = await chunkAudioFile({
    durationSeconds: normalized.durationSeconds,
    ffmpegBinary: ffmpegStatic,
    filePath: normalized.outputPath,
    maxChunkBytes: 24 * 1024 * 1024,
    maxChunkDurationSeconds: chunkSeconds,
    sizeBytes: normalized.sizeBytes,
  });
  if (chunks.length > maxRequests) throw new Error(`Benchmark would make ${chunks.length} requests, above --max-requests ${maxRequests}`);

  const startedAt = Date.now();
  const results = [];
  for (const [index, chunk] of chunks.entries()) {
    const bytes = await readFile(chunk.filePath);
    const requestStartedAt = Date.now();
    await transcribeAudioBuffer({
      audioBytes: bytes,
      contentType: "audio/mpeg",
      fileName: basename(chunk.filePath),
      timeoutMs,
    });
    results.push({ index, bytes: bytes.length, durationSeconds: chunk.endSeconds - chunk.startSeconds, elapsedMs: Date.now() - requestStartedAt });
  }
  const source = await stat(inputPath);
  console.log(JSON.stringify({
    fixtureBytes: source.size,
    chunkSeconds,
    timeoutMs,
    requestCount: chunks.length,
    elapsedMs: Date.now() - startedAt,
    peakRssBytes: process.memoryUsage().rss,
    results,
  }, null, 2));
} finally {
  await rm(workspace, { recursive: true, force: true });
}
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
