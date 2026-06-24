import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_TYPES,
  MAX_BULK_UPLOAD_FILES,
  MAX_UPLOAD_BYTES,
  UploadCallPanel,
  canSelectUploadFile,
  formatCallTopicForUpload,
  formatBytes,
  getSelectedFilesLabel,
  getUploadActionLabel,
  getUploadCompletionHref,
  getUploadProgressLabel,
  getUploadStatusCopy,
  getUploadedCallHref,
} from "../components/upload-call-panel";
import { validateUploadFile } from "../lib/calls/upload-contract";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("UploadCallPanel forge step flow", () => {
  it("renders a clear three-step upload flow with disabled guidance", () => {
    const html = renderToStaticMarkup(createElement(UploadCallPanel));

    expect(html).toContain("Choose recordings");
    expect(html).toContain("Add call context");
    expect(html).toContain("Upload and analyze");
    expect(html).toContain("Choose one or more recordings before analysis can start.");
    expect(html).toContain(`accept="${ACCEPTED_TYPES.join(",")}"`);
    expect(html).toMatch(/<input(?=[^>]*type="file")(?=[^>]*multiple="")/);
    expect(html).toContain(`Upload up to ${MAX_BULK_UPLOAD_FILES} recordings in one batch.`);
    expect(html).toContain("MP3, WAV, M4A, MP4, or WebM up to 500 MB each");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain('data-upload-step-flow="forge"');
    expect(html).toContain('data-forge-status-panel="muted"');
    expect(html).not.toContain(">upload_file</span>");
    expect(html).not.toContain(">info</span>");
  });

  it("makes the select-file dropzone keyboard reachable and visibly focusable", () => {
    const html = renderToStaticMarkup(createElement(UploadCallPanel));

    expect(html).toContain('data-upload-dropzone="keyboard-accessible"');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Choose call recordings to upload"');
    expect(html).toContain("focus-visible:ring-4");
    expect(html).toMatch(/<input(?=[^>]*type="file")(?=[^>]*tabindex="-1")/);
    expect(html).toContain('aria-label="Call recording files"');
    expect(html.indexOf('type="file"')).toBeLessThan(
      html.indexOf('data-upload-dropzone="keyboard-accessible"'),
    );
  });

  it("summarizes selected bulk files and caps batches at the hourly upload limit", () => {
    expect(MAX_BULK_UPLOAD_FILES).toBe(20);
    expect(getSelectedFilesLabel(0)).toBe("No recordings selected");
    expect(getSelectedFilesLabel(1)).toBe("1 recording selected");
    expect(getSelectedFilesLabel(3)).toBe("3 recordings selected");
    expect(getUploadActionLabel({ fileCount: 0, isUploading: false, uploadedCount: 0 })).toBe("Upload calls");
    expect(getUploadActionLabel({ fileCount: 3, isUploading: false, uploadedCount: 0 })).toBe("Upload 3 calls");
    expect(getUploadActionLabel({ fileCount: 3, isUploading: true, uploadedCount: 1 })).toBe("Uploading 2 of 3");
    expect(getUploadActionLabel({ fileCount: 3, isUploading: false, uploadedCount: 3 })).toBe("View call library");
  });

  it("uses file names as bulk call context with an optional shared prefix", () => {
    expect(formatCallTopicForUpload({ callTopic: "", fileCount: 3, fileName: "call-001.mp3" })).toBe("call-001.mp3");
    expect(formatCallTopicForUpload({ callTopic: "Discovery", fileCount: 3, fileName: "call-001.mp3" })).toBe(
      "Discovery - call-001.mp3",
    );
    expect(formatCallTopicForUpload({ callTopic: "Discovery", fileCount: 1, fileName: "call-001.mp3" })).toBe(
      "Discovery",
    );
  });

  it("keeps upload validation, progress copy, and post-upload destination explicit", () => {
    expect(validateUploadFile({ name: "call.mp3", size: 42_000, type: "audio/mpeg" })).toBeNull();
    expect(validateUploadFile({ name: "call.m4a", size: 42_000, type: "" })).toBeNull();
    expect(validateUploadFile({ name: "call.pdf", size: 42_000, type: "application/pdf" })?.code).toBe(
      "unsupported_file_type",
    );
    expect(validateUploadFile({ name: "../call.mp3", size: 42_000, type: "audio/mpeg" })?.code).toBe(
      "invalid_upload",
    );
    expect(validateUploadFile({ name: "call.mp3", size: MAX_UPLOAD_BYTES + 1, type: "audio/mpeg" })?.code).toBe(
      "file_too_large",
    );
    expect(formatBytes(512_000)).toBe("500 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12.0 MB");
    expect(getUploadProgressLabel(80)).toContain("Keep this page open");
    expect(getUploadProgressLabel(100)).toContain("preparing the scorecard");
    expect(getUploadStatusCopy({ error: null, failedCount: 0, fileCount: 0, isUploading: false, progress: 0, uploadedCount: 0 })).toMatchObject({
      title: "Recordings required",
      tone: "muted",
    });
    expect(getUploadStatusCopy({ error: null, failedCount: 0, fileCount: 3, isUploading: false, progress: 0, uploadedCount: 0 })).toMatchObject({
      title: "3 recordings ready",
      tone: "success",
    });
    expect(getUploadStatusCopy({ error: null, failedCount: 0, fileCount: 3, isUploading: true, progress: 60, uploadedCount: 1 })).toMatchObject({
      title: "Uploading 2 of 3",
      tone: "gold",
    });
    expect(getUploadStatusCopy({ error: null, failedCount: 0, fileCount: 3, isUploading: true, progress: 100, uploadedCount: 1 })).toMatchObject({
      title: "Analyzing 2 of 3",
      tone: "gold",
    });
    expect(getUploadStatusCopy({ error: null, failedCount: 1, fileCount: 5, isUploading: false, progress: 0, uploadedCount: 4 })).toMatchObject({
      title: "4 of 5 uploaded",
      tone: "danger",
    });
    expect(getUploadStatusCopy({ error: "Network failed", failedCount: 0, fileCount: 1, isUploading: false, progress: 0, uploadedCount: 0 })).toMatchObject({
      title: "Upload failed",
      tone: "danger",
    });
    expect(getUploadedCallHref("call-123")).toBe("/calls/call-123");
    expect(getUploadCompletionHref(["call-123"])).toBe("/calls/call-123");
    expect(getUploadCompletionHref(["call-123", "call-456"])).toBe("/calls");
  });

  it("disables drag/drop file selection while the queue is full or upload is running", () => {
    expect(canSelectUploadFile({ fileCount: 0, isUploading: false })).toBe(true);
    expect(canSelectUploadFile({ fileCount: 1, isUploading: false })).toBe(true);
    expect(canSelectUploadFile({ fileCount: MAX_BULK_UPLOAD_FILES, isUploading: false })).toBe(false);
    expect(canSelectUploadFile({ fileCount: 0, isUploading: true })).toBe(false);
  });
});
