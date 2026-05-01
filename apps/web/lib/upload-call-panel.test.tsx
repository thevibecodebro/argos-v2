import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  UploadCallPanel,
  canSelectUploadFile,
  formatBytes,
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

    expect(html).toContain("Choose recording");
    expect(html).toContain("Add call context");
    expect(html).toContain("Upload and analyze");
    expect(html).toContain("Choose a recording before analysis can start.");
    expect(html).toContain(`accept="${ACCEPTED_TYPES.join(",")}"`);
    expect(html).toContain("MP3, WAV, M4A, MP4, or WebM up to 500 MB");
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
    expect(html).toContain('aria-label="Choose a call recording to upload"');
    expect(html).toContain("focus-visible:ring-4");
    expect(html).toMatch(/<input(?=[^>]*type="file")(?=[^>]*tabindex="-1")/);
    expect(html).toContain('aria-label="Call recording file"');
    expect(html.indexOf('type="file"')).toBeLessThan(
      html.indexOf('data-upload-dropzone="keyboard-accessible"'),
    );
  });

  it("keeps upload validation, progress copy, and post-upload destination explicit", () => {
    expect(validateUploadFile({ name: "call.mp3", size: 42_000, type: "audio/mpeg" })).toBeNull();
    expect(validateUploadFile({ name: "call.m4a", size: 42_000, type: "" })).toBeNull();
    expect(validateUploadFile({ name: "call.pdf", size: 42_000, type: "application/pdf" })?.code).toBe(
      "unsupported_file_type",
    );
    expect(validateUploadFile({ name: "call.mp3", size: MAX_UPLOAD_BYTES + 1, type: "audio/mpeg" })?.code).toBe(
      "file_too_large",
    );
    expect(formatBytes(512_000)).toBe("500 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12.0 MB");
    expect(getUploadProgressLabel(80)).toContain("Keep this page open");
    expect(getUploadProgressLabel(100)).toContain("preparing the scorecard");
    expect(getUploadStatusCopy({ error: null, hasFile: false, isUploading: false, progress: 0 })).toMatchObject({
      title: "Recording required",
      tone: "muted",
    });
    expect(getUploadStatusCopy({ error: null, hasFile: true, isUploading: false, progress: 0 })).toMatchObject({
      title: "Ready for analysis",
      tone: "success",
    });
    expect(getUploadStatusCopy({ error: null, hasFile: true, isUploading: true, progress: 60 })).toMatchObject({
      title: "Uploading recording",
      tone: "gold",
    });
    expect(getUploadStatusCopy({ error: null, hasFile: true, isUploading: true, progress: 100 })).toMatchObject({
      title: "Analyzing call",
      tone: "gold",
    });
    expect(getUploadStatusCopy({ error: "Network failed", hasFile: true, isUploading: false, progress: 0 })).toMatchObject({
      title: "Upload failed",
      tone: "danger",
    });
    expect(getUploadedCallHref("call-123")).toBe("/calls/call-123");
  });

  it("disables drag/drop file selection while a file exists or upload is running", () => {
    expect(canSelectUploadFile({ hasFile: false, isUploading: false })).toBe(true);
    expect(canSelectUploadFile({ hasFile: true, isUploading: false })).toBe(false);
    expect(canSelectUploadFile({ hasFile: false, isUploading: true })).toBe(false);
    expect(canSelectUploadFile({ hasFile: true, isUploading: true })).toBe(false);
  });
});
