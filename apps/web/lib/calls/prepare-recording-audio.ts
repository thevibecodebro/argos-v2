import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

export type PreparedRecording =
  | { kind: "audio"; file: File; durationSeconds: number }
  | { kind: "unchanged"; file: File }
  | { kind: "fallback"; file: File; reason: string };

const isMp4Video = (file: File) => /\.mp4$/i.test(file.name) || file.type === "video/mp4";
// BufferTarget keeps the complete remuxed file in memory. Leave room for its
// working buffer and the File passed back to the upload UI.
const MAX_BUFFERED_AUDIO_BYTES = 128 * 1024 * 1024;

/** Copy a single AAC track from an MP4. Never decode or re-encode the recording. */
export async function remuxSingleAacTrack(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<PreparedRecording> {
  if (!isMp4Video(file)) {
    return file.type.startsWith("video/") || /\.(webm|mov)$/i.test(file.name)
      ? { kind: "fallback", file, reason: "This video format cannot be prepared locally yet." }
      : { kind: "unchanged", file };
  }

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const audioTracks = await input.getAudioTracks();
    if (audioTracks.length !== 1 || await audioTracks[0]!.getCodec() !== "aac") {
      return { kind: "fallback", file, reason: "This video needs its original audio tracks to be preserved." };
    }

    const durationSeconds = await input.computeDuration(audioTracks);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return { kind: "fallback", file, reason: "The recording duration could not be verified." };
    }

    const packetStats = await audioTracks[0]!.computePacketStats();
    const estimatedAudioBytes = packetStats.averageBitrate * durationSeconds / 8;
    if (!Number.isFinite(estimatedAudioBytes) || estimatedAudioBytes <= 0
      || estimatedAudioBytes * 1.25 > MAX_BUFFERED_AUDIO_BYTES) {
      return { kind: "fallback", file, reason: "This audio track is too large to prepare safely in this browser." };
    }

    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      copy: { mode: "forced", shiftTolerance: 0 },
      showWarnings: false,
    });
    if (!conversion.isValid || conversion.utilizedTracks.length !== 1) {
      return { kind: "fallback", file, reason: "The audio track cannot be copied without changing it." };
    }

    conversion.onProgress = (progress) => onProgress?.(progress);
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength >= file.size
      || buffer.byteLength > MAX_BUFFERED_AUDIO_BYTES) {
      return { kind: "fallback", file, reason: "Audio preparation did not make this recording smaller." };
    }

    const outputFile = new File([buffer], file.name.replace(/\.mp4$/i, ".m4a"), { type: "audio/mp4" });
    const verified = new Input({ source: new BlobSource(outputFile), formats: ALL_FORMATS });
    try {
      const outputTracks = await verified.getTracks();
      const outputDuration = await verified.computeDuration();
      if (outputTracks.length !== 1 || outputTracks[0]?.type !== "audio"
        || Math.abs(outputDuration - durationSeconds) > 1) {
        return { kind: "fallback", file, reason: "The prepared audio did not match the recording duration." };
      }
    } finally {
      verified.dispose();
    }

    return { kind: "audio", file: outputFile, durationSeconds };
  } catch {
    return { kind: "fallback", file, reason: "Audio preparation failed in this browser." };
  } finally {
    input.dispose();
  }
}
